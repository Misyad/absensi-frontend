# Changelog

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
