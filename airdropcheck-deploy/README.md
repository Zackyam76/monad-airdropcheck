# AirdropCheck Lab (Simulasi Akademik)

Prototipe pemeriksa kelayakan (*eligibility checker*) airdrop berbasis multi-track yang dirancang sebagai bagian dari tugas akhir/skripsi Informatika. 

> [!IMPORTANT]
> **Pernyataan Penafian (Disclaimer):**
> Aplikasi ini adalah **simulasi akademik**, bukan situs resmi Monad, dan **tidak membagikan token apa pun**. Aplikasi ini tidak pernah meminta *seed phrase*, *private key*, persetujuan pengeluaran token (*approval*), atau transaksi berbayar. Interaksi blockchain dibatasi hanya pada verifikasi kepemilikan dompet melalui **tanda tangan pesan teks biasa** (*off-chain signature*).

---

## 1. Arsitektur dan Teknologi

- **Frontend:** Vanilla HTML5, CSS3, JavaScript (ES Modules modern).
- **Backend:** Node.js (LTS) & Express.
- **Database:** SQLite (`node:sqlite` DatabaseSync bawaan Node, bebas dari dependensi kompilasi C++ eksternal).
- **Blockchain Library:** `ethers` v6 (pengecekan saldo ERC-721 dan verifikasi tanda tangan EIP-191).
- **Keamanan:** `helmet` (Content Security Policy), `express-rate-limit`, cookie sesi `httpOnly`.

---

## 2. Struktur Proyek

```
airdropcheck-lab/
├─ package.json
├─ .env.example
├─ README.md                  # Panduan penggunaan & penyiapan lingkungan uji
├─ data/
│  └─ airdropcheck.db         # Database SQLite lokal (dibuat otomatis)
├─ contracts/
│  └─ TestEligibilityNFT.sol  # Smart contract ERC-721 pengujian
├─ seed/
│  ├─ seed.js                 # Skrip migrasi data builder dari CSV ke SQLite
│  └─ builders.sample.csv     # Data contoh daftar builder
├─ server/
│  ├─ index.js                # Server entry point Express
│  ├─ routes/
│  │  ├─ auth.js              # Endpoint OAuth2 Discord & Simulasi Akun
│  │  ├─ wallet.js            # Nonce & Verifikasi tanda tangan EIP-191
│  │  └─ eligibility.js       # Evaluasi 3 Track & Reset Sesi
│  └─ lib/
│     ├─ db.js                # Koneksi SQLite & query builder
│     ├─ chain.js             # Pengecekan saldo NFT testnet via RPC
│     └─ discord.js           # Discord OAuth2 helper
└─ public/
   ├─ index.html              # Struktur antarmuka
   ├─ styles.css              # Sistem desain, palet warna, & animasi cincin portal
   └─ app.js                  # Logika interaksi frontend
```

---

## 3. Langkah Instalasi dan Menjalankan

### A. Persiapan Dependensi
Pastikan Node.js (v20 ke atas) dan npm sudah terpasang. Jalankan perintah berikut di direktori `airdropcheck-lab`:

```bash
cd airdropcheck-lab
npm install
```

### B. Konfigurasi Lingkungan (`.env`)
Salin file `.env.example` menjadi `.env`:

```bash
cp .env.example .env
```

Sesuaikan variabel di dalam `.env`:
- `PORT`: Port server (default: `3000`).
- `SESSION_SECRET`: String acak panjang untuk enkripsi sesi.
- `DISCORD_CLIENT_ID`: Client ID aplikasi Discord Anda.
- `DISCORD_CLIENT_SECRET`: Client Secret Discord OAuth2.
- `DISCORD_REDIRECT_URI`: `http://localhost:3000/auth/discord/callback`.
- `DISCORD_GUILD_ID`: ID server uji Discord Anda.
- `ROLE_IDS_ELIGIBLE`: Daftar ID role yang berhak eligible (dipisahkan tanda koma).
- `RPC_URL`: URL RPC testnet (default Monad Testnet: `https://testnet-rpc.monad.xyz`).
- `NFT_CONTRACT_ADDRESS`: Alamat smart contract ERC-721 uji yang telah dideploy.

### C. Mengisi Data Seed Builder
Jalankan skrip seed untuk memasukkan data builder contoh ke SQLite:

```bash
npm run seed
```

### D. Menjalankan Server
```bash
npm start
```
Buka browser dan akses: `http://localhost:3000`.

---

## 4. Panduan Menyiapkan Lingkungan Uji

### 1. Menyiapkan Discord Developer Portal & Role Server
1. Buat server Discord baru untuk pengujian.
2. Buat beberapa role (misalnya: `TG`, `Nads`, `Localnads`).
3. Aktifkan *Developer Mode* pada Discord (Pengaturan Akun -> Advanced -> Developer Mode).
4. Klik kanan nama server dan klik **Copy Server ID** (masukkan ke `DISCORD_GUILD_ID`).
5. Klik kanan pada masing-masing role dan pilih **Copy Role ID** (masukkan ke `ROLE_IDS_ELIGIBLE` di `.env`).
6. Masuk ke [Discord Developer Portal](https://discord.com/developers/applications):
   - Klik **New Application**.
   - Masuk ke tab **OAuth2**.
   - Tambahkan Redirect URL: `http://localhost:3000/auth/discord/callback`.
   - Salin **Client ID** dan **Client Secret** ke file `.env`.

> **Catatan Pengujian Cepat (Mode Simulasi):**  
> Jika belum mengonfigurasi aplikasi Discord Developer Portal, aplikasi menyediakan tombol **Simulasi Akun** pada kartu Discord di antarmuka. Anda dapat memilih preset skenario UJ-01 hingga UJ-04 secara instan.

### 2. Menyiapkan Smart Contract NFT Uji (ERC-721)
1. Buka [Remix IDE](https://remix.ethereum.org).
2. Buat file baru bernama `TestEligibilityNFT.sol` dan salin kode dari folder `contracts/TestEligibilityNFT.sol`.
3. Kompilasi menggunakan compiler Solidity `0.8.20`.
4. Pada tab *Deploy & Run Transactions*, pilih Environment **Injected Provider - MetaMask** (pastikan dompet terhubung ke jaringan testnet).
5. Lakukan deploy kontrak.
6. Panggil fungsi `mint(alamat_wallet_anda)` untuk memberikan NFT uji ke akun pengujian.
7. Salin alamat kontrak yang baru dideploy ke `NFT_CONTRACT_ADDRESS` di file `.env`.

---

## 5. Matriks Skenario Pengujian (Black Box)

| Kode | Skenario | Langkah Pengujian | Hasil yang Diharapkan |
|---|---|---|---|
| **UJ-01** | Hubungkan Discord (disetujui) | Klik tombol Discord, izinkan akses OAuth2 | Username tampil, role tersimpan di sesi |
| **UJ-02** | Pengguna membatalkan izin Discord | Batalkan persetujuan di Discord | Muncul notifikasi izin dibatalkan, tidak ada data sesi |
| **UJ-03** | Discord memiliki role eligible | Akun memiliki salah satu role dalam `ROLE_IDS_ELIGIBLE` | Track Komunitas berstatus **Eligible** |
| **UJ-04** | Discord tanpa role eligible | Akun tidak memiliki role terkait | Track Komunitas berstatus **Tidak eligible** |
| **UJ-05** | Hubungkan wallet & tanda tangan | Hubungkan MetaMask, konfirmasi pesan teks biasa | Alamat terverifikasi tampil (0x...) |
| **UJ-06** | Pengguna menolak tanda tangan | Klik tolak / cancel pada pop-up tanda tangan dompet | Muncul pesan "Tanda tangan dibatalkan", dompet belum terhubung |
| **UJ-07** | Wallet memegang NFT uji | Dompet yang memiliki saldo NFT uji diperiksa | Track Pengguna onchain berstatus **Eligible** |
| **UJ-08** | Wallet tanpa NFT uji | Dompet tanpa saldo NFT diperiksa | Track Pengguna onchain berstatus **Tidak eligible** |
| **UJ-09** | Akun terdaftar di CSV Builder | Discord ID atau Wallet terdaftar di tabel SQLite | Track Builder berstatus **Eligible** |
| **UJ-10** | Akun tidak terdaftar di Builder | Akun atau dompet tidak ada di tabel SQLite | Track Builder berstatus **Tidak eligible** |
| **UJ-11** | Lolos di lebih dari 1 track | Pengguna memenuhi kriteria di 2 atau 3 track | Cincin bercahaya reveal dengan teks "Lolos di N track" |
| **UJ-12** | Belum menghubungkan salah satu akun | Klik "Periksa Kelayakan" sebelum menghubungkan | Status menampilkan "Butuh Discord" / "Butuh wallet" |
| **UJ-13** | RPC Testnet tidak merespons | RPC dinonaktifkan atau alamat kontrak salah | Pesan kesalahan jaringan ramah pengguna, server tidak crash |
| **UJ-14** | Spanduk simulasi | Periksa navigasi seluruh halaman | Spanduk simulasi tetap terlihat jelas di bagian atas |
| **UJ-15** | Integritas keamanan dompet | Cek permintaan transaksi pada dompet pengguna | Hanya muncul `personal_sign` teks, tidak ada transaksi token |
