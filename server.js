const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();

// 1. Veritabanı Bağlantısı
const db = new sqlite3.Database('./teknik_servis.db', (err) => {
    if (err) console.error(err.message);
    console.log('SQLite veritabanına bağlandı.');
});

// 2. Tabloları Oluştur (TÜM MODÜLLER)
db.serialize(() => {
    // A. Kullanıcılar
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ad_soyad TEXT, email TEXT UNIQUE, sifre TEXT, telefon TEXT, adres TEXT, 
        rol TEXT DEFAULT 'user', kayit_tarihi DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    // Admin Hesabı
    db.get("SELECT * FROM users WHERE email = 'admin@mail.com'", (err, row) => {
        if (!row) {
            const hash = bcrypt.hashSync('12345', 10);
            db.run("INSERT INTO users (ad_soyad, email, sifre, rol) VALUES (?,?,?,?)", 
            ['Baş Teknisyen', 'admin@mail.com', hash, 'admin']);
        }
    });

    // B. Cihazlar
    db.run(`CREATE TABLE IF NOT EXISTS cihazlar (id INTEGER PRIMARY KEY AUTOINCREMENT, cihaz_adi TEXT)`);
    db.get("SELECT count(*) as count FROM cihazlar", (err, row) => {
        if (row.count == 0) {
            ['iPhone 15 Pro', 'iPhone 14', 'Samsung S24', 'Xiaomi 14', 'Huawei P60', 'Diğer'].forEach(c => 
                db.run("INSERT INTO cihazlar (cihaz_adi) VALUES (?)", [c])
            );
        }
    });

    // C. Çalışmalar (Portfolio)
    db.run(`CREATE TABLE IF NOT EXISTS calismalarimiz (id INTEGER PRIMARY KEY, baslik TEXT, aciklama TEXT, resim_yolu TEXT)`);
    db.get("SELECT count(*) as count FROM calismalarimiz", (err, row) => {
        if(row.count == 0) db.run("INSERT INTO calismalarimiz (baslik, aciklama, resim_yolu) VALUES (?,?,?)", ['Ekran Değişimi', 'Orijinal parça.', '/img/ekran.jpg']);
    });

    // D. Arıza Kayıtları (Fiyat Teklifi Dahil)
    db.run(`CREATE TABLE IF NOT EXISTS ariza_kayitlari (
        id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, cihaz_tipi TEXT, garanti_durumu TEXT, 
        ariza_aciklamasi TEXT, durum TEXT DEFAULT 'beklemede', fiyat_teklifi INTEGER DEFAULT 0, 
        kargo_kodu TEXT, olusturma_tarihi DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    // E. Forum Konular
    db.run(`CREATE TABLE IF NOT EXISTS forum_konular (
        id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, baslik TEXT, icerik TEXT, 
        tarih DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    // F. Forum Yorumlar
    db.run(`CREATE TABLE IF NOT EXISTS forum_yorumlar (
        id INTEGER PRIMARY KEY AUTOINCREMENT, konu_id INTEGER, user_id INTEGER, yorum TEXT, 
        tarih DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(konu_id) REFERENCES forum_konular(id)
    )`);
});

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({ secret: 'gizli_anahtar', resave: false, saveUninitialized: true }));

// --- GENEL ROTALAR ---

app.get('/', (req, res) => {
    db.all('SELECT * FROM calismalarimiz', (err, rows) => res.render('index', { calismalar: rows, user: req.session.user }));
});

app.get('/calisma-detay/:id', (req, res) => {
    db.get('SELECT * FROM calismalarimiz WHERE id = ?', [req.params.id], (err, row) => {
        if(row) res.render('calisma-detay', { calisma: row, user: req.session.user });
        else res.redirect('/');
    });
});

// --- ÜYELİK İŞLEMLERİ ---
app.get('/giris', (req, res) => res.render('giris', { mesaj: null }));
app.post('/giris', (req, res) => {
    db.get('SELECT * FROM users WHERE email = ?', [req.body.email], (err, user) => {
        if (user && bcrypt.compareSync(req.body.sifre, user.sifre)) { req.session.user = user; res.redirect('/'); }
        else res.render('giris', { mesaj: 'Hatalı bilgiler!' });
    });
});
app.get('/kayit', (req, res) => res.render('kayit', { mesaj: null }));
app.post('/kayit', (req, res) => {
    const hash = bcrypt.hashSync(req.body.sifre, 10);
    db.run('INSERT INTO users (ad_soyad, email, sifre) VALUES (?, ?, ?)', [req.body.ad_soyad, req.body.email, hash], 
    (err) => res.render('kayit', { mesaj: err ? 'E-posta dolu' : 'Kayıt Başarılı!' }));
});
app.get('/cikis', (req, res) => { req.session.destroy(); res.redirect('/'); });

// Profil
app.get('/profil', (req, res) => {
    if(!req.session.user) return res.redirect('/giris');
    db.get("SELECT * FROM users WHERE id=?", [req.session.user.id], (err, row) => res.render('profil', { user: row, mesaj: req.query.uyari }));
});
app.post('/profil', (req, res) => {
    db.run("UPDATE users SET telefon=?, adres=? WHERE id=?", [req.body.telefon, req.body.adres, req.session.user.id], () => {
        req.session.user.telefon = req.body.telefon; req.session.user.adres = req.body.adres;
        res.render('profil', { user: req.session.user, mesaj: 'Güncellendi!' });
    });
});

// --- ARIZA VE TAKİP İŞLEMLERİ ---
app.get('/ariza-birak', (req, res) => {
    if(!req.session.user) return res.redirect('/giris');
    db.get("SELECT telefon, adres FROM users WHERE id=?", [req.session.user.id], (err, row) => {
        if(!row.telefon || !row.adres) return res.redirect('/profil?uyari=Önce bilgileri tamamla.');
        db.all("SELECT * FROM cihazlar", (err, rows) => res.render('ariza-birak', { mesaj: null, user: req.session.user, cihazlar: rows }));
    });
});
app.post('/ariza-birak', (req, res) => {
    let dev = (req.body.cihaz_secim === 'Diger') ? req.body.cihaz_manuel : req.body.cihaz_secim;
    db.run('INSERT INTO ariza_kayitlari (user_id, cihaz_tipi, garanti_durumu, ariza_aciklamasi) VALUES (?,?,?,?)', 
    [req.session.user.id, dev, req.body.garanti, req.body.aciklama], () => res.redirect('/takip'));
});

// Takip (Statik Telefonlu)
app.get('/takip', (req, res) => {
    if(!req.session.user) return res.redirect('/giris');
    db.all("SELECT * FROM ariza_kayitlari WHERE user_id=? ORDER BY id DESC", [req.session.user.id], (err, rows) => {
        res.render('takip', { kayitlar: rows, user: req.session.user });
    });
});

// Teklif Cevabı (Müşteri)
app.post('/teklif-cevap', (req, res) => {
    const { kayit_id, cevap } = req.body;
    if (cevap === 'onaylandi') {
        const kod = 'TEL-' + Math.floor(100000 + Math.random() * 900000);
        db.run("UPDATE ariza_kayitlari SET durum='onaylandi', kargo_kodu=? WHERE id=?", [kod, kayit_id], () => res.redirect('/takip'));
    } else db.run("UPDATE ariza_kayitlari SET durum='iptal' WHERE id=?", [kayit_id], () => res.redirect('/takip'));
});

// --- FORUM SİSTEMİ ---
app.get('/forum', (req, res) => {
    const sql = `SELECT f.*, u.ad_soyad, (SELECT COUNT(*) FROM forum_yorumlar WHERE konu_id = f.id) as yorum_sayisi 
                 FROM forum_konular f JOIN users u ON f.user_id = u.id ORDER BY f.id DESC`;
    db.all(sql, (err, rows) => res.render('forum', { konular: rows, user: req.session.user }));
});
app.get('/forum/yeni', (req, res) => {
    if(!req.session.user) return res.redirect('/giris');
    res.render('forum-yeni', { user: req.session.user });
});
app.post('/forum/yeni', (req, res) => {
    db.run("INSERT INTO forum_konular (user_id, baslik, icerik) VALUES (?,?,?)", [req.session.user.id, req.body.baslik, req.body.icerik], 
    () => res.redirect('/forum'));
});
app.get('/forum/konu/:id', (req, res) => {
    db.get("SELECT f.*, u.ad_soyad FROM forum_konular f JOIN users u ON f.user_id = u.id WHERE f.id=?", [req.params.id], (err, konu) => {
        if(!konu) return res.redirect('/forum');
        db.all("SELECT y.*, u.ad_soyad FROM forum_yorumlar y JOIN users u ON y.user_id = u.id WHERE y.konu_id=? ORDER BY y.id ASC", [req.params.id], (err, yorumlar) => {
            res.render('forum-konu', { konu: konu, yorumlar: yorumlar, user: req.session.user });
        });
    });
});
app.post('/forum/yorum', (req, res) => {
    if(!req.session.user) return res.redirect('/giris');
    db.run("INSERT INTO forum_yorumlar (konu_id, user_id, yorum) VALUES (?,?,?)", 
    [req.body.konu_id, req.session.user.id, req.body.yorum], () => res.redirect('/forum/konu/' + req.body.konu_id));
});

// --- ADMIN SİSTEMİ (HEPSİ BİR ARADA) ---
app.get('/admin', (req, res) => {
    if(!req.session.user || req.session.user.rol !== 'admin') return res.redirect('/');
    
    // 1. Arızaları Çek
    db.all(`SELECT a.*, u.ad_soyad, u.email, u.telefon FROM ariza_kayitlari a JOIN users u ON a.user_id = u.id ORDER BY a.id DESC`, [], (err, arizalar) => {
        // 2. Kullanıcıları Çek
        db.all("SELECT * FROM users ORDER BY id DESC", [], (err, users) => {
            // 3. Forumu Çek
            db.all("SELECT * FROM forum_konular ORDER BY id DESC", [], (err, forum) => {
                res.render('admin', { kayitlar: arizalar, kullanicilar: users, forum: forum });
            });
        });
    });
});

// Admin: Arıza İşlemleri
app.post('/admin/teklif', (req, res) => {
    const { kayit_id, islem, fiyat } = req.body;
    if (islem === 'fiyat_ver') db.run("UPDATE ariza_kayitlari SET durum='teklif_yapildi', fiyat_teklifi=? WHERE id=?", [fiyat, kayit_id], () => res.redirect('/admin'));
    else if (islem === 'iptal_et') db.run("UPDATE ariza_kayitlari SET durum='iptal' WHERE id=?", [kayit_id], () => res.redirect('/admin'));
    else if (islem === 'tamamla') db.run("UPDATE ariza_kayitlari SET durum='tamamlandi' WHERE id=?", [kayit_id], () => res.redirect('/admin'));
});

// Admin: Kullanıcı İşlemleri
app.post('/admin/user-save', (req, res) => {
    const { id, ad_soyad, email, sifre, rol } = req.body;
    if(id) { // Güncelle
        if(sifre) db.run("UPDATE users SET ad_soyad=?, email=?, sifre=?, rol=? WHERE id=?", [ad_soyad, email, bcrypt.hashSync(sifre,10), rol, id], () => res.redirect('/admin'));
        else db.run("UPDATE users SET ad_soyad=?, email=?, rol=? WHERE id=?", [ad_soyad, email, rol, id], () => res.redirect('/admin'));
    } else { // Yeni
        db.run("INSERT INTO users (ad_soyad, email, sifre, rol) VALUES (?,?,?,?)", [ad_soyad, email, bcrypt.hashSync(sifre,10), rol], () => res.redirect('/admin'));
    }
});
app.get('/admin/user-delete/:id', (req, res) => db.run("DELETE FROM users WHERE id=?", [req.params.id], () => res.redirect('/admin')));

// Admin: Forum İşlemleri
app.get('/admin/forum-sil/:id', (req, res) => {
    if(!req.session.user || req.session.user.rol !== 'admin') return res.redirect('/');
    db.run("DELETE FROM forum_yorumlar WHERE konu_id=?", [req.params.id], () => {
        db.run("DELETE FROM forum_konular WHERE id=?", [req.params.id], () => res.redirect('/admin'));
    });
});

app.listen(3000, () => console.log('Sunucu 3000 portunda çalışıyor...'));