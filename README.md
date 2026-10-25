# Pakman

Labirentteki noktaları topla. Dört hayaletten kaç. Güç topu yersen sırayı tersine çevir.

## Hızlı başlangıç

```bash
pnpm install
pnpm dev
```

## Kontroller

| Tuş / kontrol     | İş                         |
| ----------------- | -------------------------- |
| Ok tuşları / WASD | Yön                        |
| Enter veya START  | Oyunu başlat               |
| P veya PAUSE      | Duraklat / devam           |
| R veya RESET      | Skoru ve labirenti sıfırla |
| O veya OPTIONS    | Ses, ipuçları, titreşim    |
| D-pad             | Dokunmatik cihazlarda yön  |

Dokunmatikte D-pad’e basmak oyunu da başlatır.

## Nasıl oynanır

1. START ile başla. Üç canın var.
2. Küçük noktaları ye. Her biri 10 puan.
3. Büyük güç toplarını ye. Her biri 50 puan; hayaletler 7 saniye mavi ve yavaşlar.
4. Mavi hayalete değersen yersin. Üst üste yedikçe puan 200, 400, 600, 800 olur.
5. Normal hayalete değersen bir can kaybedersin. Can bitince oyun biter.
6. Tüm noktalar bitince kazanırsın.

Yan tüneller ekranın diğer ucuna çıkarır.

## Hayaletler

| Hayalet | Renk      | Takip                                             |
| ------- | --------- | ------------------------------------------------- |
| Blinky  | Kırmızı   | Doğrudan seni kovalar                             |
| Pinky   | Pembe     | Baktığın yönde 4 kare önünü keser                 |
| Inky    | Camgöbeği | Blinky ile pusu noktan arasını ikiye katlar       |
| Clyde   | Turuncu   | Uzaktayken kovalar; 8 kareye girince köşeye kaçar |

## Seçenekler

Ayarlar tarayıcıda kalır.

| Seçenek  | Ne yapar                                            |
| -------- | --------------------------------------------------- |
| Ses      | Kapat / aç, ses seviyesi                            |
| İpuçları | Alt kontrol satırını göster / gizle                 |
| Titreşim | Nokta yerken kısa titreşim (destekleyen cihazlarda) |

## Geliştirme

```bash
pnpm build
pnpm preview
```

**Yığın:** Phaser 3, TypeScript, Vite. Statik çıktı Cloudflare’e Wrangler ile gider (`wrangler.jsonc`).

## ⚖️ Yasal Uyarı / Disclaimer

Bu proje ticari olmayan, eğitim ve açık kaynak deneyimi amacıyla geliştirilmiş bir arcade klonudur. PAC-MAN, ilgili karakterler ve oyun mekanikleri Bandai Namco Entertainment Inc. şirketine aittir. Proje içerisinde telifli orijinal grafik veya ses dosyası kullanılmamış; tüm görsel öğeler vektörel, sesler ise Web Audio API ile sentetik olarak üretilmiştir.

## 📝 Lisans

Bu proje [MIT](LICENSE) lisansı ile lisanslanmıştır.

