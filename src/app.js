const API_URL = "https://script.google.com/macros/s/AKfycbxoBVwhSHvGF-ouGt0JxI9qYtSWtDECDAkfucN9BbbJ5MimmRWolJwQlu-AHg-5HGWL6A/exec";

const divisiSelect = document.getElementById('divisi');
const namaSelect = document.getElementById('nama');
const jenisSelect = document.getElementById('jenis');
const form = document.getElementById('formAbsen');
const btnSubmit = document.getElementById('btnSubmit');
const pesanDiv = document.getElementById('pesan');
const fotoInput = document.getElementById('foto');
const photoPreview = document.getElementById('photoPreview');
const photoStatus = document.getElementById('photoStatus');
const photoUpload = document.querySelector('.photo-upload');
const locationText = document.getElementById('locationText');
const locationIndicator = document.getElementById('locationIndicator');
let fotoBase64 = "";
let previewUrl = "";

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function setMessage(type, text) {
    pesanDiv.innerHTML = `<span class="${type}">${escapeHtml(text)}</span>`;
}

function updateClock() {
    const now = new Date();
    document.getElementById('currentTime').textContent = now.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }).replace('.', ':');
    document.getElementById('currentDate').textContent = now.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

updateClock();
setInterval(updateClock, 1000);

fetch(`${API_URL}?action=divisi`)
    .then(res => {
        if (!res.ok) throw new Error('Gagal memuat divisi');
        return res.json();
    })
    .then(data => {
        divisiSelect.innerHTML = '<option value="">Pilih divisi</option>';
        data.forEach(div => {
            const option = document.createElement('option');
            option.value = div;
            option.textContent = div;
            divisiSelect.appendChild(option);
        });
        divisiSelect.disabled = false;
    })
    .catch(() => {
        divisiSelect.innerHTML = '<option value="">Gagal memuat data</option>';
        setMessage('error', 'Data divisi gagal dimuat. Silakan muat ulang halaman.');
    });

divisiSelect.addEventListener('change', (event) => {
    const divisi = event.target.value;
    namaSelect.disabled = true;
    namaSelect.innerHTML = `<option value="">${divisi ? 'Memuat relawan...' : 'Pilih divisi dahulu'}</option>`;

    if (!divisi) return;

    fetch(`${API_URL}?action=relawan&divisi=${encodeURIComponent(divisi)}`)
        .then(res => {
            if (!res.ok) throw new Error('Gagal memuat relawan');
            return res.json();
        })
        .then(data => {
            namaSelect.innerHTML = '<option value="">Pilih nama relawan</option>';
            data.forEach(nama => {
                const option = document.createElement('option');
                option.value = nama;
                option.textContent = nama;
                namaSelect.appendChild(option);
            });
            namaSelect.disabled = false;
        })
        .catch(() => {
            namaSelect.innerHTML = '<option value="">Gagal memuat relawan</option>';
            setMessage('error', 'Daftar relawan gagal dimuat. Coba pilih divisi kembali.');
        });
});

document.querySelectorAll('input[name="jenisPilihan"]').forEach(radio => {
    radio.addEventListener('change', () => {
        jenisSelect.value = document.querySelector('input[name="jenisPilihan"]:checked').value;
    });
});

function locationSuccess(pos) {
    const { latitude, longitude, accuracy } = pos.coords;
    document.getElementById('statusLokasi').value = `${latitude},${longitude}`;
    document.getElementById('jarak').value = `${Math.round(accuracy)} meter`;
    document.getElementById('radius').value = "50 meter";
    locationText.textContent = `${latitude.toFixed(5)}, ${longitude.toFixed(5)} • akurasi ${Math.round(accuracy)} m`;
    locationIndicator.className = 'location-indicator';
}

function locationError() {
    document.getElementById('statusLokasi').value = "Gagal akses GPS";
    locationText.textContent = 'Lokasi belum diizinkan — aktifkan GPS';
    locationIndicator.className = 'location-indicator is-error';
}

if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(locationSuccess, locationError, {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 60000
    });
} else {
    locationError();
}

function resetPhotoPreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = "";
    photoPreview.removeAttribute('src');
    photoUpload.classList.remove('has-photo');
    photoStatus.textContent = 'WAJIB';
    photoStatus.classList.remove('is-ready');
}

fotoInput.addEventListener('change', function(event) {
    const file = event.target.files[0];
    fotoBase64 = "";

    if (!file) {
        resetPhotoPreview();
        return;
    }

    if (!file.type.startsWith('image/')) {
        fotoInput.value = '';
        resetPhotoPreview();
        setMessage('error', 'Berkas harus berupa gambar.');
        return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = URL.createObjectURL(file);
    photoPreview.src = previewUrl;
    photoUpload.classList.add('has-photo');
    photoStatus.textContent = 'MEMPROSES';
    photoStatus.classList.remove('is-ready');

    const reader = new FileReader();
    reader.onload = function(loadEvent) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.getElementById('canvas');
            const ctx = canvas.getContext('2d');
            const maxWidth = 800;
            const scale = Math.min(1, maxWidth / img.width);
            canvas.width = Math.round(img.width * scale);
            canvas.height = Math.round(img.height * scale);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            fotoBase64 = canvas.toDataURL('image/jpeg', 0.7);
            photoStatus.textContent = 'SIAP';
            photoStatus.classList.add('is-ready');
        };
        img.onerror = () => {
            resetPhotoPreview();
            setMessage('error', 'Foto tidak dapat diproses. Silakan ambil ulang.');
        };
        img.src = loadEvent.target.result;
    };
    reader.onerror = () => {
        resetPhotoPreview();
        setMessage('error', 'Foto tidak dapat dibaca. Silakan ambil ulang.');
    };
    reader.readAsDataURL(file);
});

form.addEventListener('submit', (event) => {
    event.preventDefault();
    jenisSelect.value = document.querySelector('input[name="jenisPilihan"]:checked').value;

    if (!divisiSelect.value || !namaSelect.value) {
        setMessage('error', 'Pilih divisi dan nama relawan terlebih dahulu.');
        return;
    }

    if (!fotoBase64) {
        setMessage('error', 'Ambil foto selfie dan tunggu sampai statusnya siap.');
        return;
    }

    btnSubmit.disabled = true;
    btnSubmit.querySelector('span').textContent = 'Mengirim...';
    pesanDiv.innerHTML = "";

    const payload = new URLSearchParams({
        nama: namaSelect.value,
        divisi: divisiSelect.value,
        jenis: jenisSelect.value,
        statusLokasi: document.getElementById('statusLokasi').value,
        jarak: document.getElementById('jarak').value,
        radius: document.getElementById('radius').value,
        foto: fotoBase64
    });

    fetch(API_URL, { method: 'POST', body: payload })
        .then(res => {
            if (!res.ok) throw new Error('Server tidak merespons');
            return res.json();
        })
        .then(result => {
            if (result.status === "success") {
                setMessage('success', result.pesan || 'Absensi berhasil dikirim.');
                form.reset();
                jenisSelect.value = 'Masuk';
                namaSelect.disabled = true;
                namaSelect.innerHTML = '<option value="">Pilih divisi dahulu</option>';
                fotoBase64 = "";
                resetPhotoPreview();
            } else {
                setMessage('error', result.pesan || 'Absensi belum berhasil disimpan.');
            }
        })
        .catch(() => setMessage('error', 'Gagal menghubungi server. Periksa koneksi lalu coba kembali.'))
        .finally(() => {
            btnSubmit.disabled = false;
            btnSubmit.querySelector('span').textContent = 'Kirim Absensi';
        });
});
