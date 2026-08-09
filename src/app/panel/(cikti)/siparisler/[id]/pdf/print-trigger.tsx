"use client";

import { useEffect } from "react";

/**
 * Sayfa açılınca yazdırma penceresini açar — kullanıcı oradan
 * "PDF olarak kaydet" seçiyor.
 *
 * Görseller yüklenmeden yazdırılırsa kutular boş çıkıyor, o yüzden
 * `window.load` bekleniyor (yalnızca DOM hazır olması yetmiyor).
 */
export function PrintTrigger() {
  useEffect(() => {
    let done = false;

    function start() {
      if (done) return;
      done = true;
      window.print();
    }

    if (document.readyState === "complete") {
      // Düzenin oturması için bir kare bekle
      requestAnimationFrame(() => requestAnimationFrame(start));
      return;
    }

    window.addEventListener("load", start);
    // Bir görsel takılırsa da çıktı alınabilsin
    const fallback = window.setTimeout(start, 6000);

    return () => {
      window.removeEventListener("load", start);
      window.clearTimeout(fallback);
    };
  }, []);

  return null;
}
