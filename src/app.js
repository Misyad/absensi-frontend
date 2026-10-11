// GANTI DENGAN URL WEB APP GOOGLE APPS SCRIPT ANDA
const API_URL = "https://script.google.com/macros/s/AKfycbxoBVwhSHvGF-ouGt0JxI9qYtSWtDECDAkfucN9BbbJ5MimmRWolJwQlu-AHg-5HGWL6A/exec"; 

const divisiSelect = document.getElementById('divisi');
const namaSelect = document.getElementById('nama');
const form = document.getElementById('formAbsen');
const btnSubmit = document.getElementById('btnSubmit');
const pesanDiv = document.getElementById('pesan');
let fotoBase64 = "";

// 1. Ambil Data Divisi saat halaman dimuat
fetch(`${API_URL}?action=divisi`)
    .then(res => res.json())
    .then(data => {
        divisiSelect.innerHTML = '<option value="">-- Pilih Divisi --</option>';
        data.forEach(div => divisiSelect.innerHTML += `<option value="${div}">${div}</option>`);
        divisiSelect.disabled = false;
    });

// 2. Ambil Data Relawan berdasarkan Divisi
divisiSelect.addEventListener('change', (e) => {
    const divisi = e.target.value;
    namaSelect.disabled = true;
    namaSelect.innerHTML = '<option value="">Memuat relawan...</option>';
    
    if (divisi) {
        fetch(`${API_URL}?action=relawan&divisi=${encodeURIComponent(divisi)}`)
            .then(res => res.json())
            .then(data => {
                namaSelect.innerHTML = '<option value="">-- Pilih Nama --</option>';
                data.forEach(nama => namaSelect.innerHTML += `<option value="${nama}">${nama}</option>`);
                namaSelect.disabled = false;
            });
    }
});

// 3. Ambil Geolokasi
navigator.geolocation.getCurrentPosition(
    (pos) => {
        // Logika jarak aktual bisa ditambahkan di sini, ini hanya contoh format
        document.getElementById('statusLokasi').value = `${pos.coords.latitude},${pos.coords.longitude}`;
        document.getElementById('jarak').value = `${pos.coords.accuracy} meter`;
        document.getElementById('radius').value = "50 meter";
    },
    (err) => {
        document.getElementById('statusLokasi').value = "Gagal akses GPS";
    }
);

// 4. Kompresi Foto ke Base64 (Max lebar 800px)
document.getElementById('foto').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.getElementById('canvas');
            const ctx = canvas.getContext('2d');
            const MAX_WIDTH = 800;
            const scaleSize = MAX_WIDTH / img.width;
            canvas.width = MAX_WIDTH;
            canvas.height = img.height * scaleSize;
            
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            fotoBase64 = canvas.toDataURL('image/jpeg', 0.7); // Kualitas 70%
        }
        img.src = e.target.result;
    }
    reader.readAsDataURL(file);
});

// 5. Submit Data ke Google Apps Script
form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!fotoBase64) {
        alert("Mohon tunggu proses kompresi foto atau unggah foto kembali.");
        return;
    }

    btnSubmit.disabled = true;
    btnSubmit.innerText = "Mengirim...";
    pesanDiv.innerHTML = "";

    const payload = new URLSearchParams({
        nama: document.getElementById('nama').value,
        divisi: document.getElementById('divisi').value,
        jenis: document.getElementById('jenis').value,
        statusLokasi: document.getElementById('statusLokasi').value,
        jarak: document.getElementById('jarak').value,
        radius: document.getElementById('radius').value,
        foto: fotoBase64
    });

    fetch(API_URL, {
        method: 'POST',
        body: payload
    })
    .then(res => res.json())
    .then(result => {
        if (result.status === "success") {
            pesanDiv.innerHTML = `<span class="success">${result.pesan}</span>`;
            form.reset();
            fotoBase64 = "";
        } else {
            pesanDiv.innerHTML = `<span class="error">${result.pesan}</span>`;
        }
    })
    .catch(err => {
        pesanDiv.innerHTML = `<span class="error">Gagal menghubungi server.</span>`;
    })
    .finally(() => {
        btnSubmit.disabled = false;
        btnSubmit.innerText = "Kirim Absen";
    });
});