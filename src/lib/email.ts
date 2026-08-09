import "server-only";

import { formatPhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";

/**
 * E-posta gönderimi — Resend'in HTTP API'si üzerinden.
 *
 * SDK yerine düz `fetch`: tek uç noktaya tek istek atıyoruz, paket eklemeye
 * değmez ve bağımlılık yüzeyi büyümüyor.
 *
 * Kurulum tamamlanmadan da güvenle çağrılabilir: `RESEND_API_KEY` yoksa
 * gönderim sessizce atlanır. Bu bilerek böyle — anahtar girilmediği için
 * bir siparişin oluşmaması kabul edilemez.
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export interface SendResult {
  ok: boolean;
  skipped?: boolean;
  error?: string;
}

/** Gönderen adresi. Alan adı Resend'de doğrulanmış olmalı. */
function fromAddress(): string {
  return process.env.MAIL_FROM || "Zengin Socks <siparis@zenginsocks.com>";
}

export async function sendEmail(input: {
  to: string[];
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = input.to.map((address) => address.trim()).filter(Boolean);

  if (!apiKey) {
    console.warn("[eposta] RESEND_API_KEY tanımlı değil, gönderim atlandı.");
    return { ok: false, skipped: true, error: "RESEND_API_KEY yok" };
  }
  if (to.length === 0) return { ok: false, skipped: true, error: "Alıcı yok" };

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress(),
        to,
        subject: input.subject,
        html: input.html,
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
      }),
      // Sipariş akışını kilitlemesin
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`[eposta] Resend ${response.status}: ${body.slice(0, 300)}`);
      return { ok: false, error: `Resend ${response.status}` };
    }

    return { ok: true };
  } catch (error) {
    console.error("[eposta] gönderilemedi:", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "bilinmeyen hata",
    };
  }
}

function parseAddresses(value: string): string[] {
  return value
    .split(/[,;\n]/)
    .map((address) => address.trim())
    .filter((address) => address.includes("@"));
}

/**
 * Bildirim alıcıları. Önce Panel → Ayarlar'daki liste, o boşsa
 * `ORDER_NOTIFICATION_EMAILS` değişkeni. Panelden yönetilebilmesi tercih
 * edilen yol; değişken sadece emniyet kemeri.
 */
export async function notificationRecipients(): Promise<string[]> {
  const setting = await prisma.setting.findUnique({
    where: { key: "orderNotificationEmails" },
    select: { value: true },
  });

  const fromSettings = parseAddresses(setting?.value ?? "");
  if (fromSettings.length > 0) return fromSettings;

  return parseAddresses(process.env.ORDER_NOTIFICATION_EMAILS ?? "");
}

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function layout(title: string, body: string): string {
  return `<!doctype html>
<html lang="tr"><body style="margin:0;padding:24px;background:#f5f5f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a">
<div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5e5e8;border-radius:10px;padding:24px">
<p style="margin:0 0 4px;font-size:13px;color:#8a8a92;letter-spacing:.04em">ZENGİN SOCKS</p>
<h1 style="margin:0 0 16px;font-size:19px">${esc(title)}</h1>
${body}
</div>
<p style="max-width:560px;margin:12px auto 0;font-size:11px;color:#8a8a92">Bu e-posta zenginsocks.com üzerinden otomatik gönderildi.</p>
</body></html>`;
}

export interface OrderMailData {
  orderNo: string;
  orderId: string;
  customerName: string;
  phone: string;
  email: string | null;
  companyName: string | null;
  note: string | null;
  items: Array<{
    productName: string;
    optionsText: string | null;
    quantity: number;
    lineTotalKurus: number;
  }>;
  subtotalKurus: number;
  vatKurus: number;
  grandTotalKurus: number;
}

function money(kurus: number): string {
  const sign = kurus < 0 ? "-" : "";
  const abs = Math.abs(Math.round(kurus));
  const whole = String(Math.floor(abs / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${sign}₺${whole},${String(abs % 100).padStart(2, "0")}`;
}

function itemsTable(data: OrderMailData): string {
  const rows = data.items
    .map(
      (item) => `<tr>
<td style="padding:8px 0;border-bottom:1px solid #f0f0f2">
  ${esc(item.productName)}
  ${item.optionsText ? `<br><span style="font-size:12px;color:#8a8a92">${esc(item.optionsText)}</span>` : ""}
</td>
<td style="padding:8px 0;border-bottom:1px solid #f0f0f2;text-align:right;white-space:nowrap">${item.quantity} düzine</td>
<td style="padding:8px 0 8px 12px;border-bottom:1px solid #f0f0f2;text-align:right;white-space:nowrap">${money(item.lineTotalKurus)}</td>
</tr>`,
    )
    .join("");

  return `<table style="width:100%;border-collapse:collapse;font-size:14px">
<tbody>${rows}</tbody>
<tfoot>
<tr><td colspan="2" style="padding:10px 0 2px;text-align:right;color:#5a5a62">Ara toplam (KDV hariç)</td><td style="padding:10px 0 2px 12px;text-align:right;white-space:nowrap">${money(data.subtotalKurus)}</td></tr>
<tr><td colspan="2" style="padding:2px 0;text-align:right;color:#5a5a62">KDV</td><td style="padding:2px 0 2px 12px;text-align:right;white-space:nowrap">${money(data.vatKurus)}</td></tr>
<tr><td colspan="2" style="padding:6px 0;text-align:right;font-weight:600">Genel toplam</td><td style="padding:6px 0 6px 12px;text-align:right;font-weight:600;white-space:nowrap">${money(data.grandTotalKurus)}</td></tr>
</tfoot>
</table>`;
}

/** Mağazaya "yeni sipariş geldi" bildirimi. */
export async function sendNewOrderNotification(
  data: OrderMailData,
): Promise<SendResult> {
  const to = await notificationRecipients();
  if (to.length === 0) {
    return { ok: false, skipped: true, error: "Bildirim alıcısı tanımlı değil" };
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/+$/, "");

  const body = `
<p style="margin:0 0 16px;font-size:14px">
  <strong>${esc(data.customerName)}</strong>${data.companyName ? ` · ${esc(data.companyName)}` : ""}<br>
  <a href="tel:+90${esc(data.phone)}" style="color:#1a1a1a">${esc(formatPhone(data.phone))}</a>
  ${data.email ? ` · ${esc(data.email)}` : ""}
</p>
${data.note ? `<p style="margin:0 0 16px;padding:10px 12px;background:#fbf7e8;border-radius:6px;font-size:14px"><strong>Müşteri notu:</strong> ${esc(data.note)}</p>` : ""}
${itemsTable(data)}
${
  siteUrl
    ? `<p style="margin:22px 0 0"><a href="${siteUrl}/panel/siparisler/${esc(data.orderId)}" style="display:inline-block;background:#1a1a1a;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;font-size:14px">Siparişi panelde aç</a></p>`
    : ""
}`;

  return sendEmail({
    to,
    subject: `Yeni sipariş ${data.orderNo} · ${data.customerName}`,
    html: layout(`Yeni sipariş ${data.orderNo}`, body),
    replyTo: data.email ?? undefined,
  });
}

/** Müşteriye sipariş özeti. E-posta vermemişse çağrılmaz. */
export async function sendOrderConfirmation(
  data: OrderMailData,
): Promise<SendResult> {
  if (!data.email) return { ok: false, skipped: true, error: "Müşteri e-postası yok" };

  const body = `
<p style="margin:0 0 16px;font-size:14px">
  Merhaba ${esc(data.customerName)}, siparişiniz bize ulaştı.
  Sipariş numaranız <strong>${esc(data.orderNo)}</strong>. En kısa sürede sizinle
  iletişime geçeceğiz.
</p>
${itemsTable(data)}
<p style="margin:22px 0 0;padding:10px 12px;background:#f0f4fb;border-radius:6px;font-size:13px;color:#41506b">
  <strong>Ödeme mağazada alınır</strong>, site üzerinden ödeme yapılmaz.
  Fiyatlar bir düzinenin fiyatıdır.
</p>`;

  return sendEmail({
    to: [data.email],
    subject: `Siparişiniz alındı · ${data.orderNo}`,
    html: layout("Siparişiniz alındı", body),
  });
}
