// Upload page: pick a document, send it to the Slidoo server, follow the job.
// All URLs are relative, so the page works under any base path.

const $ = (id) => document.getElementById(id);

const form = $('form');
const dropzone = $('dropzone');
const fileInput = $('fileInput');
const filePill = $('filePill');
const fileError = $('fileError');
const cta = $('cta');
const ctaHint = $('ctaHint');
const progress = $('progress');
const progressTitle = $('progressTitle');
const progressStatus = $('progressStatus');
const uploadBar = $('uploadBar');
const steps = [...document.querySelectorAll('#steps li')];
const preview = $('preview');

const THEME_NAMES = { 'ugm-official': 'Official', 'ugm-midnight': 'Midnight', 'ugm-heritage': 'Heritage' };
const STEP_ORDER = ['uploading', 'extracting', 'outlining', 'writing', 'building'];
const POLL_MS = 800;

// Defaults used until (or unless) the server answers /api/config.
let settings = {
  maxUploadBytes: 20 * 1024 * 1024,
  formats: [
    { ext: 'pdf', label: 'PDF' },
    { ext: 'docx', label: 'DOCX' },
    { ext: 'txt', label: 'TXT' },
    { ext: 'md', label: 'MD' },
  ],
  ai: false,
  authRequired: false,
};
let online = false;
let selectedFile = null;
let busy = false;

function formatSize(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function formatList(items) {
  return items.length > 1 ? `${items.slice(0, -1).join(', ')}, atau ${items[items.length - 1]}` : items.join('');
}

function extensionOf(name) {
  const match = /\.([a-z0-9]+)$/i.exec(name);
  return match ? match[1].toLowerCase() : '';
}

/** @returns {string} a message for the person, or '' if the file can be used */
function validateFile(file) {
  const labels = settings.formats.map((f) => f.label);
  const ext = extensionOf(file.name);
  if (!settings.formats.some((f) => f.ext === ext)) {
    if (ext === 'doc') return 'File .doc lama belum didukung. Simpan ulang sebagai .docx di Word, lalu unggah lagi.';
    return `Format ${ext ? `.${ext}` : 'file ini'} belum didukung. Gunakan ${formatList(labels)}.`;
  }
  if (file.size === 0) return 'File ini kosong.';
  if (file.size > settings.maxUploadBytes) {
    return `Ukuran file ${formatSize(file.size)}, melebihi batas ${formatSize(settings.maxUploadBytes)}.`;
  }
  return '';
}

function showFileError(message) {
  fileError.textContent = message;
  fileError.hidden = !message;
  dropzone.classList.toggle('invalid', Boolean(message));
  fileInput.setAttribute('aria-invalid', message ? 'true' : 'false');
}

function updateCta() {
  const ready = online && Boolean(selectedFile);
  cta.setAttribute('aria-disabled', String(!ready));
  if (!online) ctaHint.textContent = 'Server belum terhubung.';
  else if (!selectedFile) ctaHint.textContent = 'Pilih dokumen dulu untuk mulai.';
  else ctaHint.textContent = settings.ai ? 'Biasanya selesai dalam satu menit.' : 'Biasanya selesai dalam beberapa detik.';
}

function setFile(file) {
  const problem = file ? validateFile(file) : '';
  selectedFile = file && !problem ? file : null;
  showFileError(problem);
  filePill.hidden = !selectedFile;
  if (selectedFile) {
    $('fileBadge').textContent = extensionOf(selectedFile.name).toUpperCase();
    $('fileName').textContent = selectedFile.name;
    $('fileSize').textContent = formatSize(selectedFile.size);
  }
  // Clearing the input lets the same file be picked again after a removal.
  fileInput.value = '';
  updateCta();
}

function updatePreview() {
  const theme = form.elements.theme.value;
  const pages = $('pages').value;
  preview.dataset.theme = theme;
  $('previewNote').replaceChildren(
    ...(pages === 'auto'
      ? ['Tema ', bold(THEME_NAMES[theme]), '. Jumlah halaman mengikuti panjang dokumen, antara 5 dan 15.']
      : ['Tema ', bold(THEME_NAMES[theme]), `, ${pages} halaman: sampul, ${pages - 2} halaman isi, dan penutup.`]),
  );
  $('previewEngine').textContent = settings.ai
    ? 'Kerangka disusun AI dari isi dokumen, lengkap dengan catatan pembicara. Semua teks bisa kamu edit setelahnya.'
    : 'Kerangka disusun dari judul bagian dan kalimat utama dokumen. Semua teks bisa kamu edit setelahnya.';
}

function bold(text) {
  const b = document.createElement('b');
  b.textContent = text;
  return b;
}

// ── file picking and drag & drop ────────────────────────────────────────────
fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) setFile(fileInput.files[0]);
});
$('fileRemove').addEventListener('click', () => {
  setFile(null);
  fileInput.focus();
});

let dragDepth = 0;
const hasFiles = (event) => [...(event.dataTransfer?.types ?? [])].includes('Files');
dropzone.addEventListener('dragenter', (event) => {
  if (!hasFiles(event)) return;
  dragDepth += 1;
  dropzone.classList.add('dragover');
});
dropzone.addEventListener('dragleave', () => {
  dragDepth = Math.max(0, dragDepth - 1);
  if (dragDepth === 0) dropzone.classList.remove('dragover');
});
// A file dropped anywhere on the page is taken, instead of the browser
// navigating away to display it.
window.addEventListener('dragover', (event) => {
  if (hasFiles(event)) event.preventDefault();
});
window.addEventListener('drop', (event) => {
  if (!hasFiles(event)) return;
  event.preventDefault();
  dragDepth = 0;
  dropzone.classList.remove('dragover');
  if (busy) return;
  const { files } = event.dataTransfer;
  if (files.length > 1) {
    setFile(null);
    showFileError('Unggah satu dokumen saja dalam satu waktu.');
  } else if (files[0]) {
    setFile(files[0]);
  }
});

form.addEventListener('change', updatePreview);

// ── progress view ───────────────────────────────────────────────────────────
function showStep(current, state = 'active') {
  const index = STEP_ORDER.indexOf(current);
  steps.forEach((li, i) => {
    li.classList.toggle('done', i < index || state === 'done');
    li.classList.toggle('active', i === index && state === 'active');
    li.classList.toggle('failed', i === index && state === 'failed');
  });
}

function setUploadProgress(fraction) {
  const percent = Math.round(fraction * 100);
  uploadBar.setAttribute('aria-valuenow', String(percent));
  $('uploadBarFill').style.width = `${percent}%`;
}

function showProgressView() {
  form.hidden = true;
  progress.hidden = false;
  progressTitle.textContent = 'Menyusun deck…';
  $('progressFile').textContent = selectedFile.name;
  progressStatus.textContent = '';
  progressStatus.classList.remove('error');
  uploadBar.hidden = false;
  $('warnings').hidden = true;
  $('openDeck').hidden = true;
  $('again').hidden = true;
  $('retry').hidden = true;
  setUploadProgress(0);
  showStep('uploading');
  progressTitle.focus();
}

function showForm({ keepFile }) {
  busy = false;
  progress.hidden = true;
  form.hidden = false;
  if (!keepFile) setFile(null);
  (selectedFile ? cta : fileInput).focus();
}

function fail(stage, message) {
  busy = false;
  showStep(STEP_ORDER.includes(stage) ? stage : 'uploading', 'failed');
  uploadBar.hidden = true;
  progressTitle.textContent = 'Deck belum berhasil dibuat';
  progressStatus.textContent = message;
  progressStatus.classList.add('error');
  $('retry').hidden = false;
  $('again').hidden = false;
  progressTitle.focus();
}

function succeed(job) {
  busy = false;
  showStep('building', 'done');
  uploadBar.hidden = true;
  progressTitle.textContent = 'Deck siap';
  progressStatus.textContent = `${job.pages} halaman sudah disusun. Buka deck untuk memeriksa dan mengedit isinya.`;
  const warnings = $('warnings');
  warnings.replaceChildren(
    ...job.warnings.map((text) => {
      const li = document.createElement('li');
      li.textContent = text;
      return li;
    }),
  );
  warnings.hidden = job.warnings.length === 0;
  const open = $('openDeck');
  open.href = job.deckUrl;
  open.hidden = false;
  $('again').hidden = false;
  open.focus();
}

// ── talking to the server ───────────────────────────────────────────────────
function messageFrom(body, fallback) {
  return body?.error?.message || fallback;
}

/** POST the file with upload progress (fetch cannot report it). */
function upload(file, params, token) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `api/decks?${params}`);
    xhr.responseType = 'json';
    xhr.setRequestHeader('Content-Type', 'application/octet-stream');
    xhr.setRequestHeader('X-Filename', encodeURIComponent(file.name));
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) setUploadProgress(event.loaded / event.total);
    });
    xhr.addEventListener('load', () => {
      if (xhr.status === 202 && xhr.response?.jobId) resolve(xhr.response.jobId);
      else reject(new Error(messageFrom(xhr.response, `Server menolak unggahan (HTTP ${xhr.status}).`)));
    });
    xhr.addEventListener('error', () => reject(new Error('Koneksi ke server terputus saat mengunggah. Periksa jaringan, lalu coba lagi.')));
    xhr.addEventListener('abort', () => reject(new Error('Unggahan dibatalkan.')));
    xhr.send(file);
  });
}

async function followJob(jobId) {
  let misses = 0;
  let stage = 'extracting';
  for (;;) {
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
    let job;
    try {
      const response = await fetch(`api/jobs/${jobId}`, { cache: 'no-store' });
      const body = await response.json();
      if (!response.ok) return fail(stage, messageFrom(body, 'Server tidak mengenali pekerjaan ini. Unggah ulang dokumennya.'));
      job = body;
      misses = 0;
    } catch {
      misses += 1;
      if (misses >= 8) return fail(stage, 'Koneksi ke server terputus. Deck mungkin tetap selesai dibuat; cek daftar deck, atau coba lagi.');
      continue;
    }

    if (job.status === 'queued') {
      showStep('extracting');
      progressStatus.textContent = 'Menunggu giliran, ada dokumen lain yang sedang diproses.';
      continue;
    }
    if (STEP_ORDER.includes(job.stage)) stage = job.stage;
    if (job.status === 'error') return fail(stage, messageFrom(job, 'Terjadi kesalahan saat menyusun slide.'));
    if (job.status === 'done') return succeed(job);
    showStep(stage);
    progressStatus.textContent = '';
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (busy) return;
  if (!online) return;
  if (!selectedFile) {
    showFileError('Pilih dokumen dulu.');
    fileInput.focus();
    return;
  }
  const token = $('token').value.trim();
  if (settings.authRequired && !token) {
    $('token').focus();
    ctaHint.textContent = 'Isi kode akses dulu.';
    return;
  }

  busy = true;
  showProgressView();
  const params = new URLSearchParams({ theme: form.elements.theme.value, pages: $('pages').value });
  const title = $('title').value.trim();
  if (title) params.set('title', title);

  try {
    const jobId = await upload(selectedFile, params, token);
    setUploadProgress(1);
    showStep('extracting');
    await followJob(jobId);
  } catch (error) {
    fail('uploading', error.message);
  }
});

$('retry').addEventListener('click', () => showForm({ keepFile: true }));
$('again').addEventListener('click', () => showForm({ keepFile: false }));

// ── start ───────────────────────────────────────────────────────────────────
async function start() {
  try {
    const response = await fetch('api/config', { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    settings = await response.json();
    online = true;
  } catch {
    $('offline').hidden = false;
  }

  const labels = settings.formats.map((f) => f.label);
  $('fileHelp').textContent = `${formatList(labels)}. Maksimal ${formatSize(settings.maxUploadBytes)}.`;
  fileInput.accept = settings.formats.map((f) => `.${f.ext}`).join(',');
  if (settings.maxTitleLength) $('title').maxLength = settings.maxTitleLength;
  if (settings.homeUrl) $('homeLink').href = settings.homeUrl;
  $('tokenField').hidden = !settings.authRequired;
  updatePreview();
  updateCta();
}

start();
