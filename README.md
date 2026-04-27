# 🛠️ Teknik Servis Yönetim Otomasyonu

Müşterilerin arızalı cihaz kayıtlarını oluşturabildiği, onarım fiyatlandırması ve kargo gönderim süreçlerini uçtan uca yöneten, Node.js ve SQL tabanlı kapsamlı bir teknik servis web uygulamasıdır.

## 🚀 Proje Hakkında
Bu proje, bir teknik servisin günlük işleyişini dijitalleştirmek amacıyla geliştirilmiştir. Sisteme arızalı cihaz girişi yapıldıktan sonra ödeme adımları, cihazın onarım durumu ve kargo süreçleri hem yönetici hem de müşteri tarafından takip edilebilir. Ayrıca kullanıcıların etkileşime girebileceği entegre bir forum modülü barındırmaktadır.

## 🌟 Temel Özellikler
* **Arıza Kabul Sistemi:** Müşterilerin arızalı cihazlarını sisteme kayıt edip takip numarası alması.
* **Süreç Yönetimi:** Cihaz durumlarının (Kabul Edildi, Onarımda, Kargoya Verildi) güncellenmesi ve takibi.
* **Ücretlendirme ve Kargo:** Onarım bedellerinin işlenmesi ve kargo süreçlerinin entegre yönetimi.
* **Yönetici (Admin) Paneli:** Tüm cihaz, kullanıcı, kargo ve ücret verilerinin tek ekrandan yönetilmesi.
* **Forum Modülü:** Kullanıcıların soru sorabileceği ve tartışabileceği entegre destek forumu.

## 💻 Kullanılan Teknolojiler
* **Backend:** Node.js, Express.js
* **Veritabanı:** SQL (SQLite - `teknik_servis.db`)
* **Frontend:** EJS (Template Engine), HTML5, CSS3
* **Mimari:** MVC (Model-View-Controller) standartlarına uygun klasör yapısı.

## ⚙️ Kurulum ve Çalıştırma
Projeyi kendi bilgisayarınızda çalıştırmak için aşağıdaki adımları izleyebilirsiniz:

1. Projeyi bilgisayarınıza klonlayın:
   ```bash
   git clone https://github.com/mehmetaliavan/teknik-servis-otomasyonu.git

**2. Proje dizinine girin:**
`cd teknik-servis-otomasyonu`

**3. Gerekli paketleri yükleyin:**
`npm install`

**4. Sunucuyu başlatın:**
`node server.js`

**5. Tarayıcıda açın:**
`http://localhost:3000`
