# DOKUMENTASI ALUR IMPLEMENTASI & PENGUJIAN SISTEM
## AirdropCheck Lab — Prototipe Simulasi Kelayakan Airdrop (Studi Kasus: Ekosistem Monad)

Dokumen ini disusun sebagai panduan teknis dan catatan kronologis alur eksekusi sistem dari awal hingga akhir, yang dapat digunakan sebagai referensi utama dalam penyusunan laporan, bab metodologi, maupun bab pengujian skripsi.

---

## 1. Ikhtisar Arsitektur Sistem (3 Track Kelayakan)

Sistem menguji kelayakan (*eligibility*) klaim airdrop berdasarkan 3 jalur independen:

| Track | Sumber Data | Kriteria Kelayakan (*Eligibility Rule*) |
| :--- | :--- | :--- |
| **1. Komunitas (*Monad Community*)** | Discord API OAuth2 v10 | Pengguna memiliki minimal satu role yang terdaftar di `ROLE_IDS_ELIGIBLE` pada server Discord uji. |
| **2. Pengguna Onchain (*Onchain Users*)** | Smart Contract ERC-721 di Monad Testnet | Saldo NFT wallet `balanceOf(walletAddress) > 0` pada smart contract yang terdaftar di `NFT_CONTRACT_ADDRESS`. |
| **3. Pengembang (*Monad Builders*)** | Database Internal SQLite (`builders`) | Alamat wallet **atau** Discord ID pengguna terdaftar di tabel `builders`. |

---

## 2. Tahap 1: Smart Contract NFT di Monad Testnet (Track Onchain)

### A. Kode Smart Contract ERC-721
Smart contract yang digunakan berbasis standar industri OpenZeppelin ERC-721 dengan hak akses `Ownable` dan kemampuan cetak (*mintable*):

* File lokal: `contracts/TestEligibilityNFT.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// Hanya untuk jaringan uji. Tidak bernilai finansial.
contract AirdropCheckTestPass is ERC721, Ownable {
    uint256 private _nextId = 1;

    constructor() ERC721("AirdropCheck Test Pass", "ACTP") Ownable(msg.sender) {}

    function mint(address to) external onlyOwner {
        _safeMint(to, _nextId++);
    }
}
```

### B. Langkah Kompilasi & Deploy di Remix IDE:
1. Buka browser dan akses **[Remix IDE](https://remix.ethereum.org)**.
2. Buat file baru di panel File Explorer dengan nama `AirdropCheckTestPass.sol` dan salin kode di atas.
3. Di tab **Solidity Compiler**:
   * Pilih Compiler version `0.8.20` (atau `0.8.24`).
   * Klik tombol **Compile AirdropCheckTestPass.sol**.
4. Di tab **Deploy & Run Transactions**:
   * **Environment:** Pilih **`Injected Provider - MetaMask`** atau **`Browser Extension`** (terhubung ke Rabby Wallet).
   * Pastikan jaringan aktif di wallet adalah **Monad Testnet** (Chain ID: `10143`, RPC: `https://testnet-rpc.monad.xyz`).
   * Pastikan wallet memiliki saldo gas MON dari faucet (`https://faucet.monad.xyz`).
   * Klik tombol oranye **Deploy**.
   * Konfirmasi transaksi di pop-up wallet Rabby.

### C. Mencetak (*Mint*) NFT ke Wallet Uji:
1. Setelah ter-deploy, buka menu **Deployed Contracts** di panel kiri bawah Remix.
2. Buka dropdown fungsi **`mint`**:
   * Kolom `to`: Masukkan alamat wallet pengujian (misal: `0x775901D7E596Fbbb2326Fbd5749cB1B44419b415`).
   * Klik tombol **Transact** dan konfirmasi transaksi di Rabby Wallet.
3. Salin alamat smart contract yang baru saja ter-deploy (misal: `0xf9deBEE5BaDA345307F84AD48d0CD8f90a08bdC6`).
4. **Fitur Otomatis Sistem:** Sistem backend membaca fungsi onchain `name()` dan `symbol()` secara otomatis, sehingga nama *"AirdropCheck Test Pass (ACTP)"* langsung terdeteksi dari blockchain tanpa perlu diinput manual.

---

## 3. Tahap 2: Setup Discord OAuth2 & Role Holder (Track Komunitas)

### A. Persiapan Server & Role di Discord:
1. Buat server Discord baru untuk pengujian skripsi (misal: `Monad Community Lab`).
2. Aktifkan **Developer Mode** di Discord:
   * Buka *User Settings* (ikon gerigi) → *Advanced* → aktifkan **Developer Mode**.
3. Buat role pengujian di server:
   * Buka *Server Settings* → *Roles* → *Create Role*.
   * Buat beberapa role sesuai skenario skripsi: `nads`, `localnads`, `TG`.
   * Berikan role tersebut kepada akun Discord penguji.
4. Salin ID Server dan ID Role:
   * Klik kanan nama Server → **Copy Server ID** (`DISCORD_GUILD_ID`).
   * Klik kanan pada Role → **Copy Role ID** (`ROLE_IDS_ELIGIBLE`).

### B. Pendaftaran Aplikasi di Discord Developer Portal:
1. Buka **[Discord Developer Portal](https://discord.com/developers/applications)**.
2. Klik **New Application** → beri nama `AirdropCheck Lab` → klik **Create**.
3. Masuk ke tab **OAuth2**:
   * Salin **Client ID** (`DISCORD_CLIENT_ID`).
   * Klik **Reset Secret** lalu salin **Client Secret** (`DISCORD_CLIENT_SECRET`).
   * Di bagian **Redirects**, klik **Add Redirect** dan masukkan:
     ```text
     http://localhost:3000/auth/discord/callback
     ```
   * Klik tombol hijau **Save Changes**.
4. Izin (*Scope*) yang diminta aplikasi:
   * `identify` (membaca username, user ID, avatar).
   * `guilds.members.read` (membaca role akun di server uji).

---

## 4. Tahap 3: Setup Database Monad Builders (Track Builder)

### A. Struktur Data SQLite:
Data pengembang disimpan di database lokal SQLite (`data/airdropcheck.db`) pada tabel `builders`:
* `id`: Integer primary key (Auto Increment)
* `discord_id`: Text (ID akun Discord builder)
* `wallet`: Text (Alamat EVM wallet builder dalam huruf kecil)
* `label`: Text (Keterangan status, contoh: *Core Contributor*, *Grantee*, *Hackathon Winner*)

### B. Pengisian Data CSV & Seeding:
1. Buka file `seed/builders.sample.csv`.
2. Masukkan ID Discord dan/atau alamat wallet yang ingin dijadikan builder yang memenuhi syarat:
   ```csv
   discord_id,wallet,label
   1234368592976547861,0xbb0F33441e2B89f946cA6F27EAE5Fe5626556278,Core Contributor #1
   ,0x775901D7E596Fbbb2326Fbd5749cB1B44419b415,EVM Ecosystem Grantee
   987654321098765432,,Community Mod Discord Only
   112233445566778899,0xabcdef1234567890abcdef1234567890abcdef12,Hackathon Winner 2026
   ```
3. Jalankan skrip import (*seeding*) di terminal:
   ```powershell
   npm run seed
   ```
4. Sistem akan otomatis membersihkan data lama dan mengimpor data terbaru ke SQLite.

---

## 5. Tahap 4: Konfigurasi File Lingkungan (`.env`)

Seluruh kredensial dan parameter uji disatukan di file `.env`:

```env
PORT=3000
SESSION_SECRET=airdropcheck-lab-academic-prototype-secret-key-super-safe-12345

# ── Discord OAuth2 ──────────────────────────────────────────────────────────
DISCORD_CLIENT_ID=1559953899815698432
DISCORD_CLIENT_SECRET=IE7EKF-XNH64bpTUUE9d-LGsV7_4BUqz
DISCORD_REDIRECT_URI=http://localhost:3000/auth/discord/callback
DISCORD_GUILD_ID=1560168856369238117

# Format cerdas: ID:nama_role (Nama role otomatis tampil di UI web)
ROLE_IDS_ELIGIBLE=1560169244929564692:nads,1560169862448283729:localnads,1560169925350264852:TG

# ── Jaringan Blockchain (Monad Testnet) ────────────────────────────────────
CHAIN_ID=10143
RPC_URL=https://testnet-rpc.monad.xyz

# Mendukung satu atau banyak smart contract dipisahkan koma
NFT_CONTRACT_ADDRESS=0xf9deBEE5BaDA345307F84AD48d0CD8f90a08bdC6,0x1C5a56decA72229238D200E68b5A24Cd5F012641
```

---

## 6. Tahap 5: Menjalankan Sistem & Pengujian End-to-End

### A. Menjalankan Server Backend:
Di terminal proyek:
```powershell
npm start
```
Server akan aktif di `http://localhost:3000`.

### B. Alur Interaksi Pengguna di Portal Web:
1. **Buka Aplikasi:** Akses `http://localhost:3000` di browser. Spanduk simulasi akademik tampil di bagian paling atas.
2. **Langkah 1 — Hubungkan Wallet (Sign In EIP-191):**
   * Klik tombol **Hubungkan wallet**.
   * Ekstensi browser (Rabby/MetaMask) meminta akses akun.
   * Muncul permintaan tanda tangan teks biasa (*personal_sign*) yang berisi nonce sekali pakai.
   * Bebas biaya gas, tidak ada transaksi token, dan anti-phishing.
3. **Langkah 2 — Hubungkan Discord (OAuth2):**
   * Klik tombol **Hubungkan Discord**.
   * Pengguna diarahkan ke halaman izin resmi `discord.com`.
   * Klik **Authorize**. Pengguna diarahkan kembali ke aplikasi dan username Discord ditampilkan (`@username`).
4. **Langkah 3 — Periksa Kelayakan:**
   * Klik tombol **Periksa kelayakan**.
   * Animasi cincin portal (*concentric ring*) berputar selama 1,2 detik (*reveal moment*).
5. **Hasil Pemeriksaan Ditampilkan:**
   * **Cincin & Ringkasan:** Menampilkan total kelayakan (misal: *"Lolos di 2 dari 3 Track"*).
   * **Track 1 (Komunitas):** Menampilkan status eligible serta rincian role yang dipegang pengguna di server uji.
   * **Track 2 (Pengguna onchain):** Menampilkan status eligible beserta nama smart contract NFT resmi yang terdeteksi dari blockchain.
   * **Track 3 (Builder):** Menampilkan status eligible dengan alasan apakah lolos via Wallet atau Discord ID.
6. **Periksa Ulang / Reset:**
   * Menekan tombol **Periksa ulang** akan menghapus sesi cookie secara aman dan mengembalikan portal ke kondisi awal.

---

## 7. Matriks Skenario Pengujian (Black Box Testing)

Tabel ini dapat langsung dimasukkan ke dalam laporan skripsi pada bab Pengujian dan Pembahasan:

| Kode Uji | Skenario Pengujian | Input yang Diberikan | Hasil yang Diharapkan | Status |
| :---: | :--- | :--- | :--- | :---: |
| **UJ-01** | Otorisasi Discord disetujui | Login Discord akun berizin | Username tampil di kartu Discord, status TERHUBUNG | **PASSED** |
| **UJ-02** | Otorisasi Discord dibatalkan | Klik "Cancel" di Discord | Notifikasi toast "Izin Discord dibatalkan", tidak ada sesi tersimpan | **PASSED** |
| **UJ-03** | Discord memiliki role eligible | Akun dengan role `localnads` | Track Komunitas: **✓ ELIGIBLE** (nama role terdeteksi) | **PASSED** |
| **UJ-04** | Discord tanpa role eligible | Akun biasa tanpa role | Track Komunitas: **NOT ELIGIBLE** | **PASSED** |
| **UJ-05** | Hubungkan wallet via personal_sign | Sign pesan teks verifikasi | Wallet terverifikasi, alamat tampil disingkat | **PASSED** |
| **UJ-06** | Pembatalan tanda tangan wallet | Reject sign di wallet | Sesi tidak dibuat, muncul notifikasi pembatalan | **PASSED** |
| **UJ-07** | Wallet memegang NFT uji | Wallet dengan `balanceOf > 0` | Track Pengguna onchain: **✓ ELIGIBLE** (nama NFT terbaca) | **PASSED** |
| **UJ-08** | Wallet tanpa NFT uji | Wallet dengan `balanceOf == 0`| Track Pengguna onchain: **NOT ELIGIBLE** | **PASSED** |
| **UJ-09** | Akun terdaftar di database builder | Wallet/Discord ada di CSV SQLite | Track Builder: **✓ ELIGIBLE** (rincian sumber cocok) | **PASSED** |
| **UJ-10** | Akun tidak terdaftar di builder | Wallet/Discord acak | Track Builder: **NOT ELIGIBLE** | **PASSED** |
| **UJ-11** | Lolos di lebih dari satu track | Memenuhi 2 kriteria (NFT + Builder) | Cincin hijau menyala, teks "Lolos di 2 dari 3 Track" | **PASSED** |
| **UJ-12** | Pemeriksaan parsial (tanpa Discord) | Hanya connect wallet | Komunitas berstatus "BUTUH DISCORD" | **PASSED** |
| **UJ-13** | Fitur Multi-Contract NFT | Masukkan >1 address di .env | Sistem mengecek paralel dan menggabungkan saldo | **PASSED** |
| **UJ-14** | Spanduk simulasi akademik | Buka halaman web | Spanduk peringatan anti-phishing terlihat jelas di atas | **PASSED** |
| **UJ-15** | Reset sesi pengguna | Klik "Periksa ulang" | Sesi backend terhapus, form kembali ke layar awal | **PASSED** |
