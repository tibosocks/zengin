-- Aktarımda görselin geldiği kaynak adres.
-- Aktarım scripti tekrar çalıştırıldığında aynı görselin yeniden
-- indirilip yüklenmemesi için kullanılıyor.
ALTER TABLE "ProductImage" ADD COLUMN "sourceUrl" TEXT;

CREATE INDEX "ProductImage_sourceUrl_idx" ON "ProductImage"("sourceUrl");
