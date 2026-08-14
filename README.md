# AI Influencer Otomasyon

Sıfırdan bir AI influencer karakteri yaratır, o karakteri **kilitler** ve her görselde aynı kişinin çıkması için
kullandığın görsel üretim platformuna **o platformun diline göre kurulmuş en iyi prompt'u** gönderir.

Sıfır bağımlılık. Sadece Node.js 18+ gerekir.

---

## ⚠️ ÖNCE BUNU OKU: Bu otomasyon görsel ÜRETMEZ

Bu net olsun, sonra "bu otomasyon görsel üretmiyor" demeyin:

- Bu yazılımın **içinde görsel üretme motoru yoktur.**
- **Hiçbir stok görsel içermez.** Hazır fotoğraf havuzu yok, örnek görsel yok.
- Görselin geldiği **tek** yer, senin bağladığın görsel üretim API'sidir.

**Bir üretim aracı bağlamak zorundasın.** Hangisini kullanıyorsan onu bağla — Leonardo, OpenAI, Stability,
Replicate, fal.ai, kendi bilgisayarındaki Stable Diffusion, ComfyUI... Listede olmayan bir platform
(Higgsfield, Ideogram, Runware, Midjourney proxy'si, kendi sunucun) kullanıyorsan **"Özel API"** seçeneğiyle
onu da bağlayabilirsin.

API bağlamadıysan otomasyon çalışmayı reddetmez — sana **kusursuz prompt'u** verir, sen kendi aracına
yapıştırırsın. Ama görseli getiren şey her zaman senin bağladığın API'dir.

---

## Ne yapar?

1. **Sorar.** Çalıştırdığında bir sihirbaz açılır ve karakteri belirleyen soruları sorar:
   bölge, ırk/etnik köken, ten rengi, göz rengi, yaş, vücut tipi, vücut ölçüleri, burç, eğitim düzeyi, ilgi alanları
   (+ görsel üretimi için zorunlu olan cinsiyet, saç ve ayırt edici özellik).

2. **Karakteri kilitler.** Cevaplardan şunları üretir:
   - **Fiziksel çekirdek** — her prompt'a kelimesi kelimesine aynı giren tarif satırı
   - **Sabit seed** — kimlikten türetilen deterministik sayı
   - **Kişilik** — burçtan gelen karakter özellikleri, konuşma tonu, imza kancası
   - **Ses rehberi** — eğitim düzeyine göre kelime dağarcığı, cümle uzunluğu, emoji kuralı
   - **Hikaye ve içerik sütunları** — ilgi alanlarından üretilir
   - **Gardırop / mekân / aksesuar havuzu** — sahne üretiminde kullanılır

3. **Prompt'u kurar.** Aynı sahneyi her platformun sevdiği biçimde yazar:
   Midjourney (`--ar --style raw --seed --cref`), Leonardo (ayrı negatif prompt),
   SDXL (ağırlıklı etiket + önerilen sampler/CFG), FLUX (düz cümle, negatif yok),
   DALL·E (tam cümle, parametre yok), Higgsfield / karakter referanslı araçlar, ve genel.

4. **Senin API'nden üretir.** Bağlı platforma isteği gönderir, dönen görseli indirip `data/images/` altına kaydeder.

5. **Tutarlılığı korur.** Kimlik değiştirilemez. Değişen tek şey poz / kıyafet / ortam / ışık.
   En iyi kareyi "altın kare" yaparsan, referans destekleyen platformlarda yüz kilidi olarak gönderilir.

6. **Sıfırlanır.** Yeni bir karakter yaratmak istersen **TÜM VERİYİ SİL** komutu her şeyi temizler,
   sihirbaz sıfırdan başlar.

---

## Kurulum

```bash
git clone https://github.com/<kullanici>/ai-influencer-otomasyon.git
cd ai-influencer-otomasyon
```

Windows'ta `BASLAT.bat` dosyasına çift tıkla.
macOS / Linux'ta:

```bash
bash baslat.sh
```

Panel: **http://localhost:4200** (portu değiştirmek için `PORT=5000 node server.js`)

---

## Görsel üretim platformunu bağlama

Panelde **Ayarlar → Görsel üretim sağlayıcısı** bölümünden seç, anahtarını gir, **Bağlantıyı test et**.

| Platform | Ne gerekiyor | Not |
|---|---|---|
| **Leonardo.ai** | API Key | Günlük ücretsiz kredi verir |
| **OpenAI** (gpt-image / DALL·E 3) | API Key | Kurulumu en kolay; seed desteklemez, tutarlılıkta en zayıf |
| **Stability AI** | API Key | Seed + negatif prompt destekler |
| **Replicate** | API Token + model adı | FLUX/SDXL dahil her model; referans görsel gönderilebilir |
| **fal.ai** | API Key + model yolu | Hızlı, senkron |
| **Yerel Stable Diffusion** (A1111/Forge) | `--api` ile açık WebUI | Ücretsiz ve sınırsız; referans varsa img2img'e geçer |
| **Yerel ComfyUI** | Workflow JSON (API formatı) | En esnek; IPAdapter FaceID ile en sağlam yüz kilidi |
| **Özel API** | URL + başlıklar + gövde şablonu | **Listede olmayan her platform için** |

### "Özel API" nasıl kullanılır?

Higgsfield, Ideogram, Runware, bir Midjourney proxy'si veya kendi sunucun — hepsi buradan bağlanır.
Platformun dokümanındaki isteği şu alanlara çevir:

- **URL** — üretim uç noktası
- **Başlıklar (JSON)** — `{"Authorization": "Bearer ANAHTARIN"}`
- **Gövde şablonu (JSON)** — platformun beklediği alan adlarıyla, değişkenleri koyarak:
  `{{prompt}}` `{{negative}}` `{{seed}}` `{{width}}` `{{height}}` `{{aspect}}` `{{reference}}`
- **Yanıt tipi** — `url` / `base64` / `binary` / `async`
- **Yanıt içindeki yol** — görselin JSON'da durduğu yer, örn. `images[0].url`
- **async** seçtiysen ayrıca durum sorgu adresi ve iş kimliğinin yolu

Örnek gövde şablonu:

```json
{
  "prompt": "{{prompt}}",
  "negative_prompt": "{{negative}}",
  "seed": {{seed}},
  "width": {{width}},
  "height": {{height}}
}
```

Değişkenleri **tırnak içinde de tırnaksız da** yazabilirsin — otomasyon tipi kendisi ayarlar:
`"{{prompt}}"` metin olarak (kaçış karakterleri dahil doğru) gider, `{{seed}}` sayı olarak gider.
Platformun dokümanından kopyaladığın gövdeyi olduğu gibi yapıştırıp sadece değerleri değişkenlerle
değiştirmen yeterli.

---

## Karakteri sıfırlama (TÜM VERİYİ SİL)

Karakter bir kez kilitlenir; yeni bir kişi yaratmanın tek yolu her şeyi silmektir.

Panelden: **Ayarlar → TÜM VERİYİ SİL** (kutuya `SIFIRLA` yazman istenir)

Komut satırından:

```bash
node reset.js --confirm
```

- Varsayılan davranış: veriler `data/_arsiv/<tarih>/` altına **taşınır** (geri alınabilir)
- `--hard` eklersen kalıcı silinir
- `--all` eklersen API anahtarların da silinir (varsayılan olarak korunur)

---

## Tutarlılık nasıl sağlanıyor?

Aynı yüzü her seferinde yakalamak üç katmandan oluşur:

1. **Fiziksel çekirdek (en önemlisi).** Yaş, etnik köken, ten, göz, saç, vücut, ayırt edici özellik —
   tek bir cümle olarak her prompt'a **aynen** girer. Tek kelime bile değişmez.
2. **Sabit seed.** Kimlikten SHA-256 ile türetilir. Seed destekleyen her modelde aynı sayı gider.
3. **Referans görsel.** En iyi kareyi "altın kare" yap; referans destekleyen platformlara
   (Replicate, fal, yerel SD, ComfyUI, Özel API) görsel olarak gönderilir. Midjourney/Higgsfield gibi
   link isteyen araçlar için görseli internete yükleyip URL'sini karakter kartına yapıştırırsın.

En sağlam sonuç: yerel ComfyUI + IPAdapter FaceID, veya karakter referansı destekleyen bir bulut platformu.

---

## Klasör yapısı

```
server.js              yerel panel sunucusu (sıfır bağımlılık)
reset.js               TÜM VERİYİ SİL - komut satırı
src/
  wizard.js            sorular + doğrulama + seed türetme
  persona.js           burç/eğitim/ilgi alanı → kişilik, ses rehberi, hikâye
  promptcraft.js       kilitli kimlik → her platformun diline göre prompt
  scenes.js            poz/kıyafet/ortam/ışık üretimi
  store.js             JSON kalıcılık + sıfırlama
  providers/           görsel üretim platformları (her biri tek dosya)
public/                panel arayüzü
data/                  karakterin, anahtarların, görsellerin (git'e girmez)
```

Yeni bir platform eklemek: `src/providers/` içine bir dosya koy, `src/providers/index.js`'teki listeye ekle.
Başka hiçbir yeri değiştirmen gerekmez.

---

## Sorumluluk ve sınırlar

- **18+ zorunlu.** Sihirbaz 18 yaşından küçük karakter oluşturmayı kabul etmez.
- **Gerçek kişi taklidi yok.** Var olan bir insanın adını, yüzünü veya kimliğini taklit eden karakter üretme.
- **AI olduğunu belirt.** Instagram ve diğer platformlar yapay zekâ üretimi içerik için etiketleme istiyor;
  biyografiye de "AI" ibaresi koy. Hem kural gereği hem de uzun vadede hesabını korur.
- **Anahtarların sende kalır.** `data/providers.json` sadece kendi bilgisayarındadır, `.gitignore`'dadır,
  hiçbir yere gönderilmez. Bu yazılımın kendi sunucusu yoktur.
- Platform API'leri değişebilir; bir entegrasyon bozulursa ilgili tek dosyayı (`src/providers/<ad>.js`) düzelt.

---

## English (short)

**This tool does not generate images and ships with no stock imagery.** It builds a locked AI-influencer
character from a setup interview (region, ethnicity, skin/eye colour, age, body type, measurements, zodiac,
education, interests), derives a deterministic seed and an immutable physical descriptor, then crafts the
best possible prompt **in the dialect of whichever image API you connect** (Leonardo, OpenAI, Stability,
Replicate, fal.ai, local Automatic1111, local ComfyUI, or any other platform via the **Custom API** adapter)
and saves whatever that API returns. No provider connected means no images — only prompts.
Run `node server.js`, open `http://localhost:4200`. Reset everything with `node reset.js --confirm`.

MIT.
