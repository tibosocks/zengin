import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/auth";
import { UploadError, storeImage } from "@/lib/storage";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const formData = await request.formData();
  const files = formData.getAll("files").filter((item): item is File => item instanceof File);

  if (files.length === 0) {
    return NextResponse.json({ error: "Dosya bulunamadı" }, { status: 400 });
  }
  if (files.length > 20) {
    return NextResponse.json(
      { error: "Tek seferde en fazla 20 görsel yükleyebilirsiniz" },
      { status: 400 },
    );
  }

  try {
    // Sırayla işliyoruz: 20 görseli aynı anda sharp'a vermek belleği
    // gereksiz şişiriyor ve küçük sunucuda işlemi öldürebiliyor.
    const results = [];
    for (const file of files) {
      results.push(await storeImage(file));
    }
    return NextResponse.json({ images: results });
  } catch (error) {
    if (error instanceof UploadError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Görsel yükleme hatası:", error);
    return NextResponse.json(
      { error: "Görsel işlenemedi. Dosya bozuk olabilir." },
      { status: 500 },
    );
  }
}
