# Second Self

Sıfırdan **bir insan** yaratır: yüzünden ailesine, şehrinden gelirine, günlük rutininden korkusuna kadar.
Karakteri **kilitler**, yüzünün 8 açıdan vesikalığını çıkarır ve ondan sonra ne istersen —
"spor salonunda foto", "kahve reklamı yap" — hep **aynı kişiyi** üretir.

Sıfır bağımlılık. Node.js 18+ dışında hiçbir şey gerekmez.

---

## ⚠️ ÖNCE BUNU OKU: Bu otomasyon görselin kendisini ÜRETMEZ

- Bu yazılımın **içinde görsel üretme motoru yoktur.**
- **Hiçbir stok görsel içermez.** Hazır fotoğraf havuzu yok.
- Görselin geldiği tek yer, **bağlı olan görsel üretim API'sidir.**

**İyi haber:** kutudan çıkar çıkmaz çalışır. Varsayılan olarak **Pollinations.ai** bağlı gelir —
ücretsiz, **API anahtarı bile istemez**. Kurup çalıştırdığın anda ilk karesini üretebilirsin.

> ⚠️ **Ama ücretsiz katmandan fotoğraf gerçekçiliği bekleme.**
> Pollinations şu an yalnızca `sana` modelini sunuyor ([kontrol et](https://image.pollinations.ai/models)).
> SANA hız için damıtılmış bir modeldir; cilt gözeneği, ince tüy ve gerçek deri dokusu üretmez —
> çıktılar pürüzsüz ve "AI çizimi" gibi durur. **Bu prompt'la düzelmez, modelin sınırıdır.**
> Ücretsiz katman kompozisyon, mekân, poz ve kadraj denemek için iyidir.
>
> Gerçekten ayırt edilemeyecek sonuç için **Replicate** (FLUX.1-dev), **fal.ai** veya yerel
> **Stable Diffusion** (RealVisXL / epiCRealism gibi gerçekçilik modelleri) bağla.
> Bu üçü aynı zamanda **referans görsel** kabul ettiği için yüzü açılar arasında gerçekten kilitler.

Kaliteyi yükseltmek istediğinde kendi platformunu bağlarsın: Leonardo, OpenAI, Stability, Replicate,
fal.ai, kendi bilgisayarındaki Stable Diffusion, ComfyUI — ya da listede olmayan herhangi bir şey için
**"Özel API"**.

---

## Ne yapar?

### 1. Bir insan yaratır (sihirbaz)

Çalıştırdığında sırayla sorar:

**Görünüş** — cinsiyet, bölge, ırk/etnik köken, ten rengi, göz rengi, saç rengi, saç tipi, yaş,
vücut tipi, vücut ölçüleri, ayırt edici özellikler, serbest ek görünüm notu

Hiçbir şeye otomasyon karar vermez, hepsini sen seçersin. Aralıklar bilerek geniş tutuldu:
**boy 110–250 cm**, kilo 25–250 kg, yaş 18–90. Vücut tipleri arasında cücelik (akondroplazi),
küçük yapılı, plus size gibi seçenekler de var. Listede olmayan bir şey istersen
**"Ek görünüm detayı"** alanına yazarsın, prompt'a aynen girer.

**Yaşadığı yer ve memleket** — kademeli seçim: **kıta → ülke → şehir**. 7 kıta, 60+ ülke, 200+ şehir.
Memleketi de aynı şekilde seçilir ("yaşadığı şehirle aynı" kısayolu var). Listede olmayan şehri
kendin yazabilirsin.

**Hayat** — sosyoekonomik kökeni, annesi/babası ne iş yapıyor, kardeşi var mı, ilişki durumu,
çocuğu, mesleği, geliri, nasıl bir evde yaşıyor, evcil hayvanı, nasıl ulaşıyor,
hangi dilleri konuşuyor

**Karakter** — burcu, eğitim düzeyi, ilgi alanları, günlük ritmi, hayatını değiştiren olay,
en büyük korkusu, hayali, yaşam felsefesi, müzik zevki

Cevaplamak istemediklerini boş bırakabilirsin: **"Kalanını sen doldur"** dediğinde otomasyon kalanları
verdiğin cevaplarla **tutarlı** şekilde doldurur — gelir düzeyi eve, ev ulaşıma, bölge şehre bağlanır.
Rastgele değildir; aynı cevaplar hep aynı karakteri üretir.

Sonuç: kilitli kimlik + **Türkçe karakter dosyası** (okunabilir bir hayat hikâyesi) + ses rehberi +
içerik sütunları.

### 2. Vesikalık setini çıkarır (ilk iş)

Herhangi bir içerik görseli üretmeden önce yüzün **8 açıdan** vesikalığı alınır:
önden, sol/sağ çeyrek (45°), sol/sağ profil (90°), alttan açı, üstten açı, arkadan çeyrek.

Neden: tek bir "altın kare" yüzü sadece o açıdan tanımlar. Model karakteri yandan göstermek
istediğinde tahmin etmeye başlar ve yüz kayar. 8 açılık set bunu engeller — ayrıca bir LoRA eğitmek
veya platformda "karakter" oluşturmak için gereken minimum veri setidir.

**8 karede değişen tek şey açıdır.** Kıyafet (düz beyaz tişört), arka plan (düz açık gri),
ışık ve ifade birebir aynı tutulur.

### 3. İstediğini yapar (brief)

Serbest yaz, sahneye çevirsin:

| Yazdığın | Ne olur |
|---|---|
| `kahve reklamı yap` | Kahve reklamı sahnesi: ürün kadrajda net, üstte başlık için boşluk |
| `spor salonunda foto` | Karakterin şehrindeki modern spor salonu, antrenman anı |
| `sokakta kombin çekimi` | Şehrin dokulu bir sokağı, tam boy, kıyafet baştan aşağı görünür |
| `otel işbirliği` | Seyahat sahnesi |
| `kar altında kitap okurken` | Eşleşme yoksa isteğin aynen prompt'a girer |

Mekân karakterin gerçekten yaşadığı şehirden, kıyafet gelir düzeyinden, aksesuar evcil hayvanından gelir.

### 4. Haftalık plan üretir

Karakterin günlük ritmine ve mesleğine göre 7 günlük içerik takvimi. Her günün sahnesi hazır;
"Üret" dediğin an bağlı API'ye gider.

### 5. Her şey sonradan değiştirilebilir

**Karakter dosyası** sayfası salt okunur bir özet değil, formun kendisi: 7 bölüm, her alan tek tek
seçilebilir. Bir alanı değiştirip Kaydet dediğinde karakter hikâyesi, ses rehberi ve prompt'lar
yeniden üretilir.

- Sadece **hayat** alanları değişirse (gelir, evcil hayvan, meslek…) seed **aynı kalır** — yüz bozulmaz
- **Görünüş** değişirse seed yeniden hesaplanır ve panel sorar: *"Daha önce ürettiğin vesikalıklar
  artık bu kişiyi göstermiyor. Kalsın mı, silinip baştan mı üretilsin?"*

### 6. Sıfırlanır

**TÜM VERİYİ SİL** — karakter, vesikalık seti ve tüm görseller gider, sihirbaz sıfırdan başlar.
Karakter bir kez kilitlendiği için yeni bir insan yaratmanın tek yolu budur.

---

## Kurulum

```bash
git clone https://github.com/efecim1snn/second-self.git
cd second-self
```

Windows'ta `BASLAT.bat` dosyasına çift tıkla. macOS / Linux'ta:

```bash
bash baslat.sh
```

Panel: **http://localhost:4200** (port değiştirmek için `PORT=5000 node server.js`)

---

## Tutarlılık nasıl sağlanıyor?

Aynı yüzü her seferinde yakalamak dört katmandır:

1. **Fiziksel çekirdek** — yaş, etnik köken, ten, göz, saç, ayırt edici özellik tek bir satır olarak
   her prompt'a **kelimesi kelimesine** girer.
2. **Sabit seed** — kimlikten SHA-256 ile türetilir, seed destekleyen her modelde aynı sayı gider.
3. **Vesikalık seti** — 8 açı, referans destekleyen platformlara gönderilir.
4. **Platform desteği** — asıl belirleyici olan bu.

> **Dürüst olalım:** ücretsiz Pollinations referans görsel *kabul etmez* ve `sana` modeliyle
> fotoğraf gerçekçiliği *üretemez*. Yapıyı (stüdyo, kadraj, arka plan, poz) doğru kurar ama
> açılar arasında yüz ve saç kayar, cilt pürüzsüz kalır. Yüzü **gerçekten** kilitlemek için
> referans görsel alan bir platform gerekir: Replicate/fal.ai (IP-Adapter, redux modelleri),
> yerel ComfyUI (IPAdapter FaceID) veya karakter referansı destekleyen bir servis.
> Panel, bağlı platform bu ikisini desteklemiyorsa seni açıkça uyarır.

## Gerçekçilik ayarı

Üretim ekranında üç seviye var:

| Seviye | Ne yapar |
|---|---|
| **Ultra gerçekçi** (varsayılan) | "Profesyonel çekim" değil, birinin telefonuyla yakaladığı an. Kusurlu ışık, hafif hareket bulanıklığı, doğal mat renkler. En gerçekçi sonucu bu verir. |
| **Gerçekçi profesyonel** | Fotoğrafçı çekimi: 85mm, sığ alan derinliği, gözlerde net odak. |
| **Editoryal / moda** | Orta format, kontrollü stüdyo ışığı. |

Üçünde de "AI kokusu" veren ne varsa negatif listede engelleniyor
(`smooth skin`, `flawless skin`, `retouched`, `beauty filter`, `HDR`, `perfectly symmetrical face`,
`unreal engine`, `artstation`…), pozitif tarafta cilt gözeneği, ince tüy, hafif yüz asimetrisi,
kaçak saç telleri ve film greni isteniyor.

**Not:** boy ve vücut ölçüleri prompt'a **sayı olarak girmez**. İki sebep: `24-year-old … 163cm tall`
gibi yaş+ölçü bitişikliği birçok servisin güvenlik filtresini tetikleyip isteği reddettiriyor
(ölçülü testle doğrulandı), ve modeller santimetreyi zaten anlamıyor — siluet tarifi
(`petite`, `tall`, `notably short stature`) çok daha iyi çalışıyor. Sayılar karakter dosyasında durur.

---

## Hata payı uyarıları

### Dövme ve çil tamamen kaldırıldı

Gerçek üretim testlerinde ikisi de tutarlılığı görünür şekilde bozdu:

- **Dövme** — AI aynı deseni iki kez üretemez. Her karede farklı bir dövme çıkar ve izleyen bunu hemen fark eder.
- **Çil** — yoğunluk ve dağılım her karede kayar, uzak çekimlerde lekeye dönüşür.

Üstelik model bunları **istenmeden de ekliyordu** (ilk testte omuza rastgele bir dövme çizdi).
Bu yüzden ikisi de artık seçilebilir özellik değil ve **negatif prompt'ta aktif olarak engelleniyorlar.**
Negatif prompt desteklemeyen modellerde (FLUX, DALL·E) olumlu ifadeyle engelleniyor:
prompt'a `clear even-toned skin with no markings` giriyor — çünkü bu modellerde "dövme yok" demek
bazen ters teper.

### Kalan özelliklerin risk seviyeleri

| Özellik | Risk | Neden |
|---|---|---|
| **Heterokromi** | 🔴 Yüksek | Modeller ya yok sayar ya yanlış göze uygular. |
| Ben, piercing, beyaz saç tutamı, sabit kolye | 🟠 Orta | Yeri/biçimi karelerde kayabilir. |
| Gözlük, gamze, belirgin kaşlar | 🟢 Düşük | Kararlı çalışır. |

Sihirbaz bunları seçerken risk rozeti gösterir, karakter kartında uyarı kalıcı olarak durur.

---

## Zaten bir platforma para ödüyorsan: tek adımda bağla

Bu araç senin bilgisayarında çalışır, kendi sunucusu yoktur, anahtarların hiçbir yere gitmez.
OpenAI, Leonardo, Stability, Replicate veya fal.ai aboneliğin varsa yapman gereken tek şey:

1. **Ayarlar** → platformu seç
2. API anahtarını yapıştır
3. **Kaydet** → **Bağlantıyı test et**

Bitti. Model adı, çözünürlük, negatif prompt, seed — hepsi hazır geliyor, uğraşmana gerek yok.
Listede olmayan bir platform kullanıyorsan (Higgsfield, Ideogram, Runware, kendi sunucun,
bir Midjourney proxy'si) **Özel API** ile onu da bağlarsın; o zaman sadece platformun
dokümanındaki adresi ve gövde şablonunu bir kez girmen gerekir.

## Görsel üretim platformunu bağlama

**Ayarlar → Görsel üretim sağlayıcısı**

| Platform | Ne gerekiyor | Referans görsel | Fotoğraf gerçekçiliği |
|---|---|---|---|
| **Pollinations.ai** (varsayılan) | Hiçbir şey — ücretsiz, anahtarsız | ✗ | ✗ (`sana` modeli) |
| Replicate / fal.ai / yerel SD | Anahtar veya GPU | ✓ | ✓ |
| Leonardo.ai | API Key | ✗ (panelde elle) |
| OpenAI (gpt-image / DALL·E 3) | API Key | ✗ |
| Stability AI | API Key | ✗ |
| **Replicate** | API Token + model adı | ✓ |
| **fal.ai** | API Key + model yolu | ✓ |
| **Yerel Stable Diffusion** (A1111/Forge) | `--api` ile açık WebUI | ✓ |
| **Yerel ComfyUI** | Workflow JSON (API formatı) | ✓ |
| **Özel API** | URL + başlıklar + gövde şablonu | ✓ |

### "Özel API" nasıl kullanılır?

Higgsfield, Ideogram, Runware, bir Midjourney proxy'si veya kendi sunucun — hepsi buradan bağlanır.

- **URL** — üretim uç noktası
- **Başlıklar (JSON)** — `{"Authorization": "Bearer ANAHTARIN"}` (panelde maskelenir)
- **Gövde şablonu (JSON)** — değişkenler: `{{prompt}}` `{{negative}}` `{{seed}}` `{{width}}` `{{height}}` `{{aspect}}` `{{reference}}`
- **Yanıt tipi** — `url` / `base64` / `binary` / `async`
- **Yanıt içindeki yol** — örn. `images[0].url`

```json
{
  "prompt": "{{prompt}}",
  "negative_prompt": "{{negative}}",
  "seed": {{seed}},
  "width": {{width}},
  "height": {{height}}
}
```

Değişkenleri tırnak içinde de tırnaksız da yazabilirsin — otomasyon tipi kendisi ayarlar.

---

## Prompt motoru

Aynı sahneyi her aracın sevdiği biçimde yazar:

- **Midjourney** — `--ar --style raw --v 7 --seed`, referans varsa `--cref`
- **Leonardo** — ayrı negatif prompt alanı
- **SDXL** — ağırlıklı etiketler + önerilen sampler/CFG/çözünürlük
- **FLUX** — düz cümle, negatif prompt yok
- **DALL·E** — tam cümle, parametre yok, dilbilgisi düzeltilmiş
- **Higgsfield / karakter referanslı araçlar**
- **Genel**

Vesikalık promptu ayrı kurulur: **önce format, sonra kişi.** Kişiyi anlatarak başlarsan
"düz gri stüdyo arka planı" talimatı sonda kalır ve model karakteri plaja, sokağa, nereye isterse koyar.

---

## Sıfırlama

```bash
node reset.js --confirm
```

- Varsayılan: `data/_arsiv/<tarih>/` altına **taşınır** (geri alınabilir)
- `--hard` → kalıcı siler
- `--all` → API anahtarların da silinir (varsayılan olarak korunur)

Panelden: **Ayarlar → TÜM VERİYİ SİL** (kutuya `SIFIRLA` yazman istenir)

---

## Klasör yapısı

```
server.js              yerel panel sunucusu (sıfır bağımlılık)
reset.js               TÜM VERİYİ SİL - komut satırı
src/
  wizard.js            sorular + doğrulama + seed türetme
  life.js              şehir havuzu, hayat soruları, tutarlı otomatik doldurma, karakter dosyası
  traits.js            ayırt edici özellikler + RİSK seviyeleri ve uyarıları
  persona.js           burç/eğitim/ilgi alanı → kişilik, ses rehberi, içerik sütunları
  reference.js         karakter sayfası + 8 açılı vesikalık seti
  brief.js             serbest istek → sahne, haftalık plan
  promptcraft.js       kilitli kimlik → her platformun diline göre prompt
  scenes.js            poz/kıyafet/ortam/ışık üretimi
  store.js             JSON kalıcılık + sıfırlama
  providers/           görsel üretim platformları (her biri tek dosya)
public/                panel arayüzü
data/                  karakterin, anahtarların, görsellerin (git'e girmez)
```

Yeni platform eklemek: `src/providers/` içine bir dosya koy, `src/providers/index.js`'teki listeye ekle.

---

## Sorumluluk ve sınırlar

- **18+ zorunlu.** Sihirbaz 18 yaşından küçük karakter oluşturmayı kabul etmez.
- **Gerçek kişi taklidi yok.** Var olan bir insanın adını, yüzünü veya kimliğini taklit eden karakter üretme.
- **AI olduğunu belirt.** Instagram ve diğer platformlar yapay zekâ üretimi içerik için etiketleme istiyor;
  biyografiye de "AI" ibaresi koy.
- **Anahtarların sende kalır.** `data/providers.json` sadece kendi bilgisayarındadır ve `.gitignore`'dadır.
  Bu yazılımın kendi sunucusu yoktur.
- Platform API'leri değişebilir; bir entegrasyon bozulursa ilgili tek dosyayı düzelt.

---

## English (short)

**Second Self** builds a complete fictional person from scratch — appearance, city, family, income,
routine, fears — locks the identity, then shoots an **8-angle passport reference set** so every later
image is the same person. Ask it for anything in plain language ("coffee ad", "gym photo") and it turns
that into a scene consistent with the character's life.

**It does not generate images itself and ships with no stock imagery.** It crafts the best prompt in the
dialect of whichever image API you connect and saves what that API returns. **Pollinations.ai is wired in
by default — free, no API key** — so it works out of the box.

⚠️ **The free tier cannot do photorealism.** Pollinations currently serves only the `sana` model, a
speed-distilled model that does not render skin pores or real skin texture — output looks smooth and
obviously AI. That is a model limit, not a prompt problem. Use the free tier to test composition,
location, pose and framing. For genuinely indistinguishable results connect **Replicate** (FLUX.1-dev),
**fal.ai** or local **Stable Diffusion** (RealVisXL / epiCRealism) — these also accept reference images,
which is what actually locks the face across angles.

`node server.js` → `http://localhost:4200`. Reset with `node reset.js --confirm`. MIT.
