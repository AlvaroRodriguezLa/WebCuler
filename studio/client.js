import { extractPastedArticleTitle, renderEnrichedMarkdown } from '/article-blocks.mjs';
import { initializeArticleBlockEditor } from '/article-blocks-editor.js';

const form = document.querySelector('#article-form');
const title = document.querySelector('#title');
const text = document.querySelector('#text');
const imageInput = document.querySelector('#image');
const dropzone = document.querySelector('#dropzone');
const fileName = document.querySelector('#file-name');
const preview = document.querySelector('#preview');
const previewWrap = document.querySelector('#preview-wrap');
const status = document.querySelector('#status');
const draftList = document.querySelector('#draft-list');
const photosToggle = document.querySelector('#show-player-photos');
const siteOrigin = `${window.location.protocol}//${window.location.hostname}:4321`;
document.querySelector('#site-link').href = `${siteOrigin}/`;
let selectedFile = null;
let previewUrl = '';
let currentImage = '';
let playerAssets = { schemaVersion: 1, assets: {} };
let titleWasAutoFilled = !title.value.trim();
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
function setStatus(message, kind = '') { status.textContent = message; status.dataset.kind = kind; }
function extractPastedTitle() {
  const article = extractPastedArticleTitle(text.value);
  if (!article) return;
  if (!title.value.trim() || titleWasAutoFilled) { title.value = article.title; titleWasAutoFilled = true; }
  text.value = article.body;
}
function renderPreview() {
  try {
    const heading = escapeHtml(title.value || 'Título del artículo'); const image = previewUrl || currentImage || `${siteOrigin}/images/editorial-placeholder.svg`; const category = escapeHtml(form.elements.category?.value || 'Análisis'); const imageFit = form.elements.imageFit?.value || 'contain'; const imagePosition = form.elements.imagePosition?.value || 'center';
    preview.innerHTML = `<div class="preview-grid"><header class="preview-heading"><div class="eyebrow">${category}</div><h1 class="preview-title">${heading}</h1></header><aside class="preview-image"><img src="${escapeHtml(image)}" alt="Preview editorial" style="object-fit:${imageFit};object-position:${imagePosition};background:var(--paper)"/><div class="preview-meta">ONE SHOT / vista previa<br>${escapeHtml(form.elements.season?.value || 'sin temporada')}</div></aside><div class="preview-copy">${renderEnrichedMarkdown(text.value || 'El texto del artículo aparecerá aquí.', { editor: true, playerAssets, showPlayerPhotos: photosToggle.checked })}</div></div>`;
    document.documentElement.dataset.studioClientReady = 'true';
  } catch (error) {
    preview.innerHTML = `<aside class="block-config-error" role="alert"><strong>No se pudo actualizar la preview</strong><p>${escapeHtml(error.message || 'Error de contenido.')}</p></aside>`;
    status.textContent = `Preview: ${error.message || 'error de contenido.'}`;
  }
}
function useFile(file) { if (!file || !file.type.startsWith('image/')) return; selectedFile = file; const transfer = new DataTransfer(); transfer.items.add(file); imageInput.files = transfer.files; previewUrl = URL.createObjectURL(file); fileName.textContent = file.name; renderPreview(); }
imageInput.addEventListener('studio:clear-image', () => { selectedFile = null; currentImage = ''; form.elements.existingImage.value = ''; previewUrl = ''; imageInput.value = ''; fileName.textContent = 'Ninguna imagen seleccionada'; renderPreview(); });
function clearArticle() {
  form.reset(); titleWasAutoFilled = true; form.elements.slug.value = ''; form.elements.existingImage.value = ''; currentImage = ''; selectedFile = null;
  document.querySelector('#player-photos-panel').hidden = !photosToggle.checked;
  if (previewUrl) URL.revokeObjectURL(previewUrl); previewUrl = ''; imageInput.value = ''; fileName.textContent = 'Ninguna imagen seleccionada';
  setStatus('Nuevo artículo.'); renderPreview();
}
async function loadDrafts() {
  draftList.disabled = true;
  try {
    const response = await fetch('/api/articles', { cache: 'no-store' }); const payload = await response.json();
    if (!response.ok || !payload.ok) throw new Error(payload.error || 'No se pudieron cargar los borradores.');
    draftList.replaceChildren(new Option('Nuevo artículo', ''));
    for (const article of payload.result) draftList.add(new Option(`${article.title} · ${article.date}`, article.slug));
  } catch (error) { setStatus(error.message, 'error'); }
  finally { draftList.disabled = false; }
}
async function openDraft(slug) {
  if (!slug) { clearArticle(); return; }
  setStatus('Abriendo borrador…');
  try {
    const response = await fetch(`/api/articles?slug=${encodeURIComponent(slug)}`, { cache: 'no-store' }); const payload = await response.json();
    if (!response.ok || !payload.ok) throw new Error(payload.error || 'No se pudo abrir el borrador.');
    const article = payload.result;
    titleWasAutoFilled = false;
    for (const name of ['title', 'text', 'category', 'subtitle', 'subject', 'season', 'date', 'excerpt', 'imageAlt', 'imageFit', 'imagePosition', 'archive']) if (form.elements[name]) form.elements[name].value = article[name] ?? '';
    photosToggle.checked = article.showPlayerPhotos === true;
    form.elements.tags.value = Array.isArray(article.tags) ? article.tags.join(', ') : '';
    form.elements.featured.checked = Boolean(article.featured); form.elements.evergreen.checked = Boolean(article.evergreen);
    form.elements.slug.value = article.slug; form.elements.existingImage.value = article.image || '';
    currentImage = article.image || ''; selectedFile = null; imageInput.value = '';
    if (previewUrl) URL.revokeObjectURL(previewUrl); previewUrl = '';
    fileName.textContent = currentImage ? `Imagen guardada: ${currentImage.split('/').pop()}` : 'Ninguna imagen seleccionada';
    setStatus('Borrador cargado. Puedes seguir editándolo.'); renderPreview(); window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (error) { setStatus(error.message, 'error'); }
}
draftList.addEventListener('change', () => openDraft(draftList.value));
photosToggle.addEventListener('change', () => { document.querySelector('#player-photos-panel').hidden = !photosToggle.checked; if (photosToggle.checked) document.querySelector('#player-photos-status').textContent = 'La biblioteca y las subidas persistentes se gestionan desde el Studio alojado en Vercel.'; renderPreview(); });
title.addEventListener('input', () => { titleWasAutoFilled = false; renderPreview(); }); text.addEventListener('input', () => { extractPastedTitle(); renderPreview(); }); form.addEventListener('input', renderPreview); imageInput.addEventListener('change', () => useFile(imageInput.files[0]));
dropzone.addEventListener('dragover', (event) => { event.preventDefault(); dropzone.classList.add('dragging'); }); dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragging')); dropzone.addEventListener('drop', (event) => { event.preventDefault(); dropzone.classList.remove('dragging'); useFile(event.dataTransfer.files[0]); });
document.querySelectorAll('[data-device]').forEach((button) => button.addEventListener('click', () => { document.querySelectorAll('[data-device]').forEach((item) => item.classList.remove('active')); button.classList.add('active'); previewWrap.className = `preview-wrap ${button.dataset.device}`; }));
document.querySelectorAll('[data-wrap]').forEach((button) => button.addEventListener('click', () => { const token = button.dataset.wrap; const start = text.selectionStart; const end = text.selectionEnd; text.setRangeText(`${token}${text.value.slice(start, end)}${token}`, start, end, 'select'); text.focus(); renderPreview(); }));
document.querySelectorAll('[data-prefix]').forEach((button) => button.addEventListener('click', () => { const start = text.selectionStart; text.setRangeText(`${button.dataset.prefix}${text.value.slice(start, text.selectionEnd)}`, start, text.selectionEnd, 'select'); text.focus(); renderPreview(); }));
document.querySelector('[data-link]').addEventListener('click', () => { const start = text.selectionStart; const end = text.selectionEnd; text.setRangeText(`[${text.value.slice(start, end) || 'texto'}](https://)`, start, end, 'select'); text.focus(); renderPreview(); });
async function submit(action) {
  if (!title.value.trim() || !text.value.trim() || (!selectedFile && !currentImage)) { status.textContent = 'Completa título, texto e imagen antes de continuar.'; return; }
  if (action === 'publish' && !window.confirm('Publicar hará un commit y un git push al repositorio conectado, lo que puede iniciar un despliegue. ¿Continuar?')) return;
  if (action === 'publish' && !window.confirm('PUBLICAR Y ENVIAR A GIT: se guardará el artículo, se hará commit y se ejecutará git push. ¿Continuar?')) return;
  status.textContent = action === 'publish' ? 'Guardando y preparando Git…' : 'Guardando borrador…';
  const data = new FormData(form); if (selectedFile) data.set('image', selectedFile); data.set('existingImage', currentImage); data.set('action', action); data.set('featured', form.elements.featured?.checked ? 'true' : 'false'); data.set('evergreen', form.elements.evergreen?.checked ? 'true' : 'false');
  try {
    const response = await fetch('/api/articles', { method: 'POST', body: data }); const result = await response.json(); if (!result.ok) throw new Error(result.error);
    form.elements.slug.value = result.slug; form.elements.existingImage.value = result.image; currentImage = result.image; selectedFile = null; imageInput.value = ''; if (previewUrl) URL.revokeObjectURL(previewUrl); previewUrl = ''; fileName.textContent = `Imagen guardada: ${currentImage.split('/').pop()}`; renderPreview();
    status.innerHTML = result.pushed ? `${result.message} <a href="${result.url}" target="_blank" rel="noreferrer">Abrir preview ↗</a>` : result.error ? `${result.error}<br><code>${result.command || ''}</code>` : `Borrador guardado. <a href="${result.url}" target="_blank" rel="noreferrer">Abrir preview ↗</a>`;
    await loadDrafts(); if (result.draft) draftList.value = result.slug;
  } catch (error) { status.textContent = error.message; }
}
document.querySelector('#save-draft').addEventListener('click', () => submit('draft')); document.querySelector('#publish').addEventListener('click', () => submit('publish')); initializeArticleBlockEditor({ textarea: text, refreshPreview: renderPreview }); renderPreview(); loadDrafts();
fetch('/api/studio/player-assets').then((response) => response.ok ? response.json() : null).then((manifest) => {
  if (manifest?.schemaVersion === 1 && manifest.assets && typeof manifest.assets === 'object') { playerAssets = manifest; renderPreview(); }
}).catch(() => { /* Missing catalogue safely falls back to player markers. */ });
