# Changelog

## 2026-10-11 — Minimal Blue Single-Column UI

### Changed

- Mengganti UI charcoal–amber dengan desain mobile-first satu kolom:
  latar `#EFF6FF`, primary `#1D4DA8`, border tipis, radius 8 px,
  dan shadow minimal.
- Menampilkan header `Absensi Relawan` / `SPPG Pakiskembar 2`, kartu
  waktu server, satu pemilih relawan, tombol selfie 85 px, dan status GPS.
- Menggabungkan data 7 divisi dan 44 relawan ke satu dropdown; divisi tetap
  disimpan pada option dan dikirim dalam payload tanpa input tambahan.
- Mengganti upload file dengan kamera langsung `getUserMedia`; foto tetap
  dikompresi sebagai JPEG maksimum lebar 800 px.
- Mengambil acuan jam dari header HTTP `Date` web server dan menampilkannya
  dalam zona `Asia/Jakarta`, bukan dari jam perangkat.
- Membuat GPS fail-closed: kamera dan submit ditolak jika koordinat belum valid.
- Mempertahankan endpoint GAS serta field payload lama: `nama`, `divisi`,
  `jenis`, `statusLokasi`, `jarak`, `radius`, dan `foto`.
- Menghapus klaim jadwal/geofence dari UI karena GAS tidak menyediakan
  kontrak jadwal, waktu, atau validasi radius.

### Contract limitation

- Karena spesifikasi UI tidak menyediakan pemilih Masuk/Pulang dan GAS tidak
  menyediakan auto-detection, `jenis` dikirim sebagai default kompatibel lama
  `Masuk`. Tidak ada aturan jadwal baru yang ditebak di frontend.
- Tidak ada PIN pada kontrak GAS/frontend ini. PIN yang ditemukan berada pada
  repository aplikasi Absensi-SPPG yang berbeda dan tidak dicampurkan.

### Verification

- JavaScript syntax dan Python test syntax: PASS.
- E2E mock: 320, 375, 430, dan 1024 px: PASS tanpa overflow horizontal.
- Waktu server, satu dropdown, kamera langsung, kompresi foto, payload,
  submit sukses, dan reset: PASS.
- GPS ditolak: kamera tidak terbuka dan POST tidak terjadi: PASS.
- GAS live read-only: 7 divisi, 44 relawan, 0 nama duplikat: PASS.
- POST ke GAS produksi selama pengujian: **0**.
- Docker candidate build dan HTTP Nginx smoke: PASS.

### Baseline and rollback

Baseline produksi sebelum release ini:

```text
Git commit: 91491eb (origin/main)
Container image reference: sha256:afb600c374a25be16ce7b38f10c90071cf0126e3745f98651acf013ae9e44062
Rollback snapshot tag: absensi-sppg-frontend:rollback-91491eb
Rollback snapshot image: sha256:2bfaafc8b5dba10b5125ab44a25f007383bb37db530e5253c0bfeea54894ab2e
Container: web-absensi-sppg (running)
Port: 3003:80
Jenkins job: Absensi_SPPG_GAS #2 SUCCESS
```

Rollback utama melalui Git/Jenkins:

```bash
git revert <commit-release-ui-biru>
git push origin main
# Trigger job Jenkins Absensi_SPPG_GAS, lalu verifikasi domain publik.
```

Rollback darurat image aktif sebelumnya:

```bash
docker rm -f web-absensi-sppg
docker run -d --restart unless-stopped --name web-absensi-sppg \
  -p 3003:80 \
  absensi-sppg-frontend:rollback-91491eb
```

Setelah rollback, verifikasi HTTP 200, judul halaman, status container, dan
bahwa port tetap `3003:80`.

## 2026-10-11 — Mobile Attendance UI

### Changed

- Mendesain ulang halaman sebagai UI absensi mobile bergaya charcoal–amber.
- Menambahkan header SPPG, jam/tanggal langsung, status online, dan status GPS.
- Mengubah pilihan Masuk/Pulang menjadi kartu pilihan yang mudah disentuh.
- Menambahkan area foto selfie dengan preview dan status pemrosesan.
- Menambahkan feedback sukses/gagal inline tanpa `alert()`.
- Mempertahankan endpoint Google Apps Script dan field payload lama:
  `nama`, `divisi`, `jenis`, `statusLokasi`, `jarak`, `radius`, dan `foto`.
- Memperbaiki kompresi foto agar gambar di bawah lebar 800 px tidak diperbesar.
- Menambahkan penanganan kegagalan API, GPS, pembacaan foto, dan validasi form.

### Verification

- JavaScript syntax: PASS.
- Docker image build dan HTTP Nginx lokal: PASS.
- Browser E2E 390×844: PASS.
- Divisi/relawan, GPS, foto, payload, submit, reset: PASS.
- Console errors: 0.
- Horizontal overflow: tidak ada.
- Responsive screenshot: 320, 360, 390, 430, dan 768 px.

### Rollback

Baseline sebelum redesign:

```text
Git commit: 9480f58e42ac916fc695ae0d91d0c3e4b25a9f1f
Docker image: sha256:b998ec779331a9cf239771fe0eacfe15adcf114dc3e33eb01f625cfeeaf32c90
Container: web-absensi-sppg
Port: 3003:80
```

Rollback Git dan deploy ulang melalui Jenkins:

```bash
git revert <commit-redesign>
git push origin main
# Jalankan job Jenkins Absensi_SPPG_GAS.
```

Alternatif darurat tanpa mengubah Git, selama image lama masih tersedia:

```bash
docker rm -f web-absensi-sppg
docker run -d --name web-absensi-sppg --restart unless-stopped \
  -p 3003:80 \
  sha256:b998ec779331a9cf239771fe0eacfe15adcf114dc3e33eb01f625cfeeaf32c90
```
