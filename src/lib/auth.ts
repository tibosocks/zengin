import "server-only";

import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

import type { AdminRole } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

// Panel ve müşteri oturumları ayrı çerezlerde tutulur. Aynı çerezi paylaşsalar
// bir bayinin oturumu panele, panelinki bayiye sızabilirdi.
const ADMIN_COOKIE = "zs_admin";
const CUSTOMER_COOKIE = "zs_customer";

const SESSION_DAYS = 30;
const SESSION_SECONDS = SESSION_DAYS * 24 * 60 * 60;

function secret(): Uint8Array {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) {
    throw new Error(
      "AUTH_SECRET en az 32 karakter olmalı. `openssl rand -base64 32` ile üretip .env dosyasına ekleyin.",
    );
  }
  return new TextEncoder().encode(value);
}

export interface AdminSession {
  userId: string;
  email: string;
  name: string;
  role: AdminRole;
}

export interface CustomerSession {
  customerId: string;
  fullName: string;
}

// ------------------------------------------------------------------ parola

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// ------------------------------------------------------------------ jeton

async function sign(payload: Record<string, unknown>): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret());
}

async function read<T>(token: string | undefined): Promise<T | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as T;
  } catch {
    // Süresi dolmuş veya kurcalanmış jeton: oturum yok say.
    return null;
  }
}

async function setCookie(name: string, token: string) {
  const store = await cookies();
  store.set(name, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
}

async function clearCookie(name: string) {
  const store = await cookies();
  store.delete(name);
}

// ------------------------------------------------------------------ panel

export async function createAdminSession(session: AdminSession) {
  await setCookie(ADMIN_COOKIE, await sign({ ...session }));
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const store = await cookies();
  return read<AdminSession>(store.get(ADMIN_COOKIE)?.value);
}

export async function destroyAdminSession() {
  await clearCookie(ADMIN_COOKIE);
}

/**
 * Panel sayfalarında kullanılır. Oturum yoksa hata fırlatır — çağıran taraf
 * yönlendirmeyi yapar. Sessizce null dönüp sayfanın yarısını göstermektense
 * patlaması daha güvenli.
 */
export async function requireAdmin(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) throw new Error("UNAUTHORIZED");
  return session;
}

export async function authenticateAdmin(
  email: string,
  password: string,
): Promise<AdminSession | null> {
  const user = await prisma.adminUser.findUnique({
    where: { email: email.trim().toLowerCase() },
  });

  // Kullanıcı yoksa da bcrypt karşılaştırması yapıyoruz: aksi halde yanıt
  // süresinden "bu e-posta kayıtlı mı" bilgisi sızar.
  const hash =
    user?.passwordHash ??
    "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidiu";
  const ok = await verifyPassword(password, hash);

  if (!user || !ok || !user.isActive) return null;

  await prisma.adminUser.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

// ---------------------------------------------------------------- müşteri

export async function createCustomerSession(session: CustomerSession) {
  await setCookie(CUSTOMER_COOKIE, await sign({ ...session }));
}

export async function getCustomerSession(): Promise<CustomerSession | null> {
  const store = await cookies();
  return read<CustomerSession>(store.get(CUSTOMER_COOKIE)?.value);
}

export async function destroyCustomerSession() {
  await clearCookie(CUSTOMER_COOKIE);
}
