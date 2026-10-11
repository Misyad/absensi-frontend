const API_URL = "https://script.google.com/macros/s/AKfycbxoBVwhSHvGF-ouGt0JxI9qYtSWtDECDAkfucN9BbbJ5MimmRWolJwQlu-AHg-5HGWL6A/exec";
const DEFAULT_ATTENDANCE_TYPE = "Masuk";

const namaSelect = document.getElementById('nama');
const btnSubmit = document.getElementById('btnSubmit');
const pesanDiv = document.getElementById('pesan');
const currentTime = document.getElementById('currentTime');
const workStatus = document.getElementById('workStatus');
const locationStatus = document.querySelector('.location-status');
const locationText = document.getElementById('locationText');
const cameraDialog = document.getElementById('cameraDialog');
const cameraVideo = document.getElementById('cameraVideo');
const captureButton = document.getElementById('captureButton');
const cancelCamera = document.getElementById('cancelCamera');
const canvas = document.getElementById('canvas');
const buttonLabel = btnSubmit.querySelector('strong');

let serverOffsetMs = 0;
let mediaStream = null;
let locationData = null;
let fotoBase64 = "";
let isSubmitting = false;

function setMessage(type, text) {
    pesanDiv.className = `message${type ? ` is-${type}` : ''}`;
    pesanDiv.textContent = text;
}

function setButtonBusy(isBusy, label = 'Ambil Selfie & Absen') {
    isSubmitting = isBusy;
    btnSubmit.disabled = isBusy || namaSelect.disabled;
    buttonLabel.textContent = label;
}

function formatServerTime(date) {
    return new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23'
    }).format(date).replaceAll('.', ':');
}

function updateClock() {
    const now = new Date(Date.now() + serverOffsetMs);
    currentTime.textContent = formatServerTime(now);
    currentTime.dateTime = now.toISOString();
}

async function syncServerTime() {
    try {
        const response = await fetch(window.location.pathname, {
            method: 'HEAD',
            cache: 'no-store'
        });
        const serverDate = response.headers.get('date');
        const serverTimestamp = Date.parse(serverDate || '');
        if (!response.ok || !Number.isFinite(serverTimestamp)) {
            throw new Error('Header waktu server tidak tersedia');
        }
        serverOffsetMs = serverTimestamp - Date.now();
        document.body.dataset.timeSource = 'server';
        workStatus.textContent = 'Sinkron dengan waktu server';
        updateClock();
        setInterval(updateClock, 1000);
    } catch (_error) {
        document.body.dataset.timeSource = 'error';
        currentTime.textContent = '--:--:--';
        workStatus.textContent = 'Waktu server tidak tersedia';
    }
}

async function fetchJson(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Server tidak merespons');
    return response.json();
}

async function loadVolunteers() {
    try {
        const divisions = await fetchJson(`${API_URL}?action=divisi`);
        if (!Array.isArray(divisions)) throw new Error('Format divisi tidak valid');

        const groups = await Promise.all(divisions.map(async division => ({
            division,
            names: await fetchJson(
                `${API_URL}?action=relawan&divisi=${encodeURIComponent(division)}`
            )
        })));

        namaSelect.innerHTML = '<option value="">Pilih nama relawan</option>';
        groups.forEach(({ division, names }) => {
            if (!Array.isArray(names)) return;
            names.forEach(name => {
                const option = document.createElement('option');
                option.value = name;
                option.textContent = name;
                option.dataset.division = division;
                namaSelect.appendChild(option);
            });
        });

        if (namaSelect.options.length === 1) throw new Error('Relawan tidak tersedia');
        namaSelect.disabled = false;
        btnSubmit.disabled = false;
    } catch (_error) {
        namaSelect.innerHTML = '<option value="">Gagal memuat nama relawan</option>';
        setMessage('error', 'Daftar relawan gagal dimuat. Silakan muat ulang halaman.');
    }
}

function setLocationState(state, text) {
    document.body.dataset.locationState = state;
    locationStatus.className = `location-status is-${state}`;
    locationText.textContent = text;
}

function locationSuccess(position) {
    const { latitude, longitude, accuracy } = position.coords;
    if (![latitude, longitude, accuracy].every(Number.isFinite)) {
        locationError();
        return;
    }
    locationData = { latitude, longitude, accuracy };
    setLocationState(
        'ready',
        `GPS siap • akurasi ${Math.round(accuracy)} m • Koordinat akan dikirim`
    );
}

function locationError() {
    locationData = null;
    setLocationState('error', 'GPS belum tersedia • Aktifkan lokasi lalu muat ulang');
}

function requestLocation() {
    if (!('geolocation' in navigator)) {
        locationError();
        return;
    }
    navigator.geolocation.getCurrentPosition(locationSuccess, locationError, {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 30000
    });
}

function stopCamera() {
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        mediaStream = null;
    }
    cameraVideo.srcObject = null;
    if (cameraDialog.open) cameraDialog.close();
}

async function openCamera() {
    setMessage('', '');
    if (!namaSelect.value) {
        setMessage('error', 'Pilih nama relawan terlebih dahulu.');
        return;
    }
    if (!locationData || document.body.dataset.locationState !== 'ready') {
        setMessage('error', 'GPS belum siap. Aktifkan lokasi lalu muat ulang halaman.');
        return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
        setMessage('error', 'Kamera langsung tidak didukung pada perangkat ini.');
        return;
    }

    try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user' },
            audio: false
        });
        cameraVideo.srcObject = mediaStream;
        await cameraVideo.play();
        cameraDialog.showModal();
    } catch (_error) {
        stopCamera();
        setMessage('error', 'Kamera tidak dapat dibuka. Izinkan akses kamera lalu coba lagi.');
    }
}

function captureSelfie() {
    const width = cameraVideo.videoWidth || 640;
    const height = cameraVideo.videoHeight || 480;
    const maxWidth = 800;
    const scale = Math.min(1, maxWidth / width);
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);

    const context = canvas.getContext('2d');
    context.save();
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
    context.drawImage(cameraVideo, 0, 0, canvas.width, canvas.height);
    context.restore();
    fotoBase64 = canvas.toDataURL('image/jpeg', 0.72);
    stopCamera();
    submitAttendance();
}

async function submitAttendance() {
    if (isSubmitting) return;
    const selectedOption = namaSelect.selectedOptions[0];
    const division = selectedOption?.dataset.division;
    if (!namaSelect.value || !division || !locationData || !fotoBase64) {
        setMessage('error', 'Data nama, GPS, atau selfie belum lengkap.');
        return;
    }

    setButtonBusy(true, 'Mengirim absensi...');
    setMessage('', '');
    const payload = new URLSearchParams({
        nama: namaSelect.value,
        divisi: division,
        jenis: DEFAULT_ATTENDANCE_TYPE,
        statusLokasi: `${locationData.latitude},${locationData.longitude}`,
        jarak: `${Math.round(locationData.accuracy)} meter`,
        radius: '50 meter',
        foto: fotoBase64
    });

    try {
        const response = await fetch(API_URL, { method: 'POST', body: payload });
        if (!response.ok) throw new Error('Server tidak merespons');
        const result = await response.json();
        if (result.status !== 'success') {
            throw new Error(result.pesan || 'Absensi belum berhasil disimpan.');
        }
        setMessage('success', result.pesan || 'Absensi berhasil dikirim.');
        namaSelect.value = '';
        fotoBase64 = '';
    } catch (error) {
        setMessage('error', error.message || 'Gagal menghubungi server. Coba kembali.');
    } finally {
        setButtonBusy(false);
    }
}

btnSubmit.addEventListener('click', openCamera);
captureButton.addEventListener('click', captureSelfie);
cancelCamera.addEventListener('click', stopCamera);
cameraDialog.addEventListener('cancel', event => {
    event.preventDefault();
    stopCamera();
});

syncServerTime();
loadVolunteers();
requestLocation();
