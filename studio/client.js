const form = document.querySelector('#article-form');
const title = document.querySelector('#title');
const text = document.querySelector('#text');
const imageInput = document.querySelector('#image');
const dropzone = document.querySelector('#dropzone');
const fileName = document.querySelector('#file-name');
const preview = document.querySelector('#preview');
const previewWrap = document.querySelector('#preview-wrap');
const status = document.querySelector('#status');
const siteOrigin = `${window.location.protocol}//${window.location.hostname}:4321`;
document.querySelector('#site-link').href = `${siteOrigin}/`;
let selectedFile = null;
let previewUrl = '';
const escapeHtml = (value) => value.replace(/[&<>'"]/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
function markdown(value) {
  let html = escapeHtml(value);
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>').replace(/^## (.+)$/gm, '<h2>$1</h2>').replace(/^# (.+)$/gm, '<h2>$1</h2>').replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>').replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, (list) => `<ul>${list}</ul>`).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>');
  return html.split(/\n{2,}/).map((block) => block.match(/^<(h2|h3|blockquote|ul)/) ? block : `<p>${block.replace(/\n/g, '<br>')}</p>`).join('');
}
function renderPreview() {
  const heading = escapeHtml(title.value || 'Título del artículo'); const image = previewUrl || `${siteOrigin}/images/editorial-placeholder.svg`; const category = escapeHtml(form.elements.category?.value || 'Análisis'); const imageFit = form.elements.imageFit?.value || 'contain'; const imagePosition = form.elements.imagePosition?.value || 'center';
  preview.innerHTML = `<div class="preview-grid"><header class="preview-heading"><div class="eyebrow">${category}</div><h1 class="preview-title">${heading}</h1></header><aside class="preview-image"><img src="${image}" alt="Preview editorial" style="object-fit:${imageFit};object-position:${imagePosition};background:var(--paper)"/><div class="preview-meta">ONE SHOT / vista previa<br>${form.elements.season?.value || 'sin temporada'}</div></aside><div class="preview-copy">${markdown(text.value || 'El texto del artículo aparecerá aquí.')}</div></div>`;
}
function useFile(file) { if (!file || !file.type.startsWith('image/')) return; selectedFile = file; const transfer = new DataTransfer(); transfer.items.add(file); imageInput.files = transfer.files; previewUrl = URL.createObjectURL(file); fileName.textContent = file.name; renderPreview(); }
title.addEventListener('input', renderPreview); text.addEventListener('input', renderPreview); form.addEventListener('input', renderPreview); imageInput.addEventListener('change', () => useFile(imageInput.files[0]));
dropzone.addEventListener('dragover', (event) => { event.preventDefault(); dropzone.classList.add('dragging'); }); dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragging')); dropzone.addEventListener('drop', (event) => { event.preventDefault(); dropzone.classList.remove('dragging'); useFile(event.dataTransfer.files[0]); });
document.querySelectorAll('[data-device]').forEach((button) => button.addEventListener('click', () => { document.querySelectorAll('[data-device]').forEach((item) => item.classList.remove('active')); button.classList.add('active'); previewWrap.className = `preview-wrap ${button.dataset.device}`; }));
document.querySelectorAll('[data-wrap]').forEach((button) => button.addEventListener('click', () => { const token = button.dataset.wrap; const start = text.selectionStart; const end = text.selectionEnd; text.setRangeText(`${token}${text.value.slice(start, end)}${token}`, start, end, 'select'); text.focus(); renderPreview(); }));
document.querySelectorAll('[data-prefix]').forEach((button) => button.addEventListener('click', () => { const start = text.selectionStart; text.setRangeText(`${button.dataset.prefix}${text.value.slice(start, text.selectionEnd)}`, start, text.selectionEnd, 'select'); text.focus(); renderPreview(); }));
document.querySelector('[data-link]').addEventListener('click', () => { const start = text.selectionStart; const end = text.selectionEnd; text.setRangeText(`[${text.value.slice(start, end) || 'texto'}](https://)`, start, end, 'select'); text.focus(); renderPreview(); });
async function submit(action) {
  if (!title.value.trim() || !text.value.trim() || !selectedFile) { status.textContent = 'Completa título, texto e imagen antes de continuar.'; return; }
  if (action === 'publish' && !window.confirm('PUBLICAR Y ENVIAR A GIT: se guardará el artículo, se hará commit y se ejecutará git push. ¿Continuar?')) return;
  status.textContent = action === 'publish' ? 'Guardando y preparando Git…' : 'Guardando borrador…';
  const data = new FormData(form); data.set('image', selectedFile); data.set('action', action); data.set('featured', form.elements.featured?.checked ? 'true' : 'false'); data.set('evergreen', form.elements.evergreen?.checked ? 'true' : 'false');
  try { const response = await fetch('/api/articles', { method: 'POST', body: data }); const result = await response.json(); if (!result.ok) throw new Error(result.error); status.innerHTML = result.pushed ? `${result.message} <a href="${result.url}" target="_blank">Abrir preview ↗</a>` : result.error ? `${result.error}<br><code>${result.command || ''}</code>` : `Borrador guardado. <a href="${result.url}" target="_blank">Abrir preview ↗</a>`; } catch (error) { status.textContent = error.message; }
}
document.querySelector('#save-draft').addEventListener('click', () => submit('draft')); document.querySelector('#publish').addEventListener('click', () => submit('publish')); renderPreview();
