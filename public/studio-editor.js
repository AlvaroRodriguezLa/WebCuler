(() => {
  const form = document.querySelector('#article-form');
  const title = document.querySelector('#title');
  const text = document.querySelector('#text');
  const imageInput = document.querySelector('#image');
  const dropzone = document.querySelector('#dropzone');
  const fileName = document.querySelector('#file-name');
  const imagePrompt = document.querySelector('#image-prompt');
  const preview = document.querySelector('#preview');
  const previewWrap = document.querySelector('#preview-wrap');
  const status = document.querySelector('#status');
  const draftList = document.querySelector('#draft-list');
  const saveButton = document.querySelector('#save-draft');
  const publishButton = document.querySelector('#publish');
  const placeholder = '/images/editorial-placeholder.svg';
  let selectedFile = null;
  let previewUrl = '';
  let currentImage = '';
  let draftIndex = [];

  const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));

  function markdown(value) {
    return String(value).split(/\n{2,}/).map((block) => {
      const escaped = escapeHtml(block.trim());
      const heading = escaped.match(/^(#{1,3})\s+(.+)$/);
      if (heading) return `<h${heading[1].length}>${heading[2]}</h${heading[1].length}>`;
      if (escaped.startsWith('&gt; ')) return `<blockquote>${escaped.slice(5)}</blockquote>`;
      if (/^(- |\* )/m.test(escaped)) return `<ul>${escaped.split('\n').map((line) => line.match(/^[-*] (.+)$/)?.[1]).filter(Boolean).map((item) => `<li>${item}</li>`).join('')}</ul>`;
      return `<p>${escaped.replace(/\n/g, '<br>').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>')}</p>`;
    }).join('');
  }

  function renderPreview() {
    if (!preview) return;
    const heading = escapeHtml(title.value || 'Título del artículo');
    const image = previewUrl || currentImage || placeholder;
    const category = escapeHtml(form.elements.category.value || 'Análisis');
    const imageFit = form.elements.imageFit.value || 'contain';
    const imagePosition = form.elements.imagePosition.value || 'center';
    const season = escapeHtml(form.elements.season.value || 'sin temporada');
    preview.innerHTML = `<div class="preview-grid"><header class="preview-heading"><div class="eyebrow">${category}</div><h1 class="preview-title">${heading}</h1></header><aside class="preview-image"><img src="${escapeHtml(image)}" alt="Vista previa de la imagen" style="object-fit:${imageFit};object-position:${imagePosition};background:var(--paper)"/><div class="preview-meta">ONE SHOT / vista previa<br>${season}</div></aside><div class="preview-copy">${markdown(text.value || 'El texto del artículo aparecerá aquí.')}</div></div>`;
  }

  function chooseImage(file) {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setStatus('Elige una imagen PNG, JPG o WebP.', 'error');
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    selectedFile = file;
    previewUrl = URL.createObjectURL(file);
    fileName.textContent = file.name;
    imagePrompt.innerHTML = 'Imagen lista para optimizar<br /><small>Se guardará como WebP para que cargue rápido.</small>';
    renderPreview();
  }

  function setStatus(message, kind = '') {
    status.replaceChildren();
    status.dataset.kind = kind;
    status.textContent = message;
  }

  function fillForm(article) {
    for (const key of ['title', 'text', 'category', 'subtitle', 'subject', 'season', 'date', 'excerpt', 'imageAlt', 'archive', 'imageFit', 'imagePosition']) {
      if (form.elements[key]) form.elements[key].value = article[key] ?? '';
    }
    form.elements.tags.value = Array.isArray(article.tags) ? article.tags.join(', ') : '';
    form.elements.featured.checked = Boolean(article.featured);
    form.elements.evergreen.checked = Boolean(article.evergreen);
    form.elements.slug.value = article.slug || article.path || '';
    currentImage = article.image || '';
    selectedFile = null;
    previewUrl = '';
    imageInput.value = '';
    fileName.textContent = currentImage ? `Imagen guardada: ${currentImage.split('/').pop()}` : 'No hay imagen seleccionada';
    imagePrompt.innerHTML = 'Toca para cambiar la imagen<br /><small>PNG, JPG o WebP. Se optimiza al guardar.</small>';
    renderPreview();
    setStatus('Borrador cargado. Puedes seguir editándolo.');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function loadDrafts() {
    draftList.disabled = true;
    try {
      const response = await fetch('/api/articles', { credentials: 'same-origin', cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'No se pudieron cargar los borradores.');
      draftIndex = payload.result;
      draftList.replaceChildren(new Option('Nuevo artículo', ''));
      for (const article of draftIndex) draftList.add(new Option(`${article.title} · ${article.date || ''}`, article.slug || article.path));
    } catch (error) {
      setStatus(error.message, 'error');
    } finally {
      draftList.disabled = false;
    }
  }

  async function compressImage(file) {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, 2200 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('No se pudo preparar la imagen en este dispositivo.');
    context.fillStyle = '#e7e5df';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    for (const quality of [0.84, 0.74, 0.64]) {
      const blob = await new Promise((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('Este navegador no pudo convertir la imagen a WebP.')), 'image/webp', quality));
      if (blob.type !== 'image/webp') throw new Error('Este navegador no admite la optimización WebP. Prueba con Chrome, Edge o Safari actualizado.');
      if (blob.size <= 2_800_000) return blob;
    }
    throw new Error('La imagen sigue siendo demasiado pesada. Elige una imagen más pequeña.');
  }

  async function toBase64(blob) {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = '';
    const chunkSize = 0x8000;
    for (let index = 0; index < bytes.length; index += chunkSize) binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
    return btoa(binary);
  }

  async function submit(action) {
    if (!title.value.trim() || !text.value.trim()) {
      setStatus('Completa el título y el texto antes de continuar.', 'error');
      return;
    }
    if (!selectedFile && !currentImage) {
      setStatus('Añade una imagen antes de guardar.', 'error');
      return;
    }
    if (action === 'publish' && !window.confirm('Se publicará el artículo y se iniciará la actualización de la web. ¿Continuar?')) return;
    saveButton.disabled = publishButton.disabled = true;
    setStatus(selectedFile ? 'Optimizando imagen y guardando en GitHub…' : 'Guardando en GitHub…');
    try {
      const fields = Object.fromEntries(new FormData(form).entries());
      const data = {
        ...fields,
        action,
        tags: String(fields.tags || '').split(',').map((tag) => tag.trim()).filter(Boolean),
        featured: form.elements.featured.checked,
        evergreen: form.elements.evergreen.checked,
        existingImage: currentImage,
      };
      if (selectedFile) {
        const compressed = await compressImage(selectedFile);
        data.image = { name: selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, '-'), type: compressed.type, data: await toBase64(compressed) };
      }
      const response = await fetch('/api/articles', {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || 'No se pudo guardar el artículo.');
      form.elements.slug.value = result.slug;
      currentImage = result.image;
      selectedFile = null;
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      previewUrl = '';
      imageInput.value = '';
      fileName.textContent = `Guardada: ${currentImage.split('/').pop()}`;
      imagePrompt.innerHTML = 'Toca para cambiar la imagen<br /><small>La imagen actual se conserva si no eliges otra.</small>';
      setStatus(result.message, 'success');
      if (!result.draft) {
        const link = document.createElement('a');
        link.href = result.url;
        link.target = '_blank';
        link.rel = 'noreferrer';
        link.textContent = 'Abrir artículo ↗';
        status.append(document.createTextNode(' '), link);
        draftList.value = '';
        form.reset();
        form.elements.slug.value = '';
        currentImage = '';
        fileName.textContent = 'No hay imagen seleccionada';
        imagePrompt.innerHTML = 'Toca para elegir una imagen<br /><small>PNG, JPG o WebP. Se optimiza al guardar.</small>';
        renderPreview();
      }
      await loadDrafts();
      if (result.draft) draftList.value = result.slug;
    } catch (error) {
      setStatus(error.message || 'Error al guardar.', 'error');
    } finally {
      saveButton.disabled = publishButton.disabled = false;
    }
  }

  form.addEventListener('input', renderPreview);
  form.addEventListener('change', renderPreview);
  imageInput.addEventListener('change', () => chooseImage(imageInput.files?.[0]));
  dropzone.addEventListener('dragover', (event) => { event.preventDefault(); dropzone.classList.add('dragging'); });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragging'));
  dropzone.addEventListener('drop', (event) => { event.preventDefault(); dropzone.classList.remove('dragging'); chooseImage(event.dataTransfer.files?.[0]); });
  document.querySelectorAll('[data-device]').forEach((button) => button.addEventListener('click', () => {
    document.querySelectorAll('[data-device]').forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    previewWrap.className = `preview-wrap ${button.dataset.device}`;
  }));
  document.querySelectorAll('[data-wrap]').forEach((button) => button.addEventListener('click', () => {
    const token = button.dataset.wrap;
    const start = text.selectionStart;
    const end = text.selectionEnd;
    text.setRangeText(`${token}${text.value.slice(start, end)}${token}`, start, end, 'select');
    text.focus();
    renderPreview();
  }));
  document.querySelectorAll('[data-prefix]').forEach((button) => button.addEventListener('click', () => {
    const start = text.selectionStart;
    text.setRangeText(`${button.dataset.prefix}${text.value.slice(start, text.selectionEnd)}`, start, text.selectionEnd, 'select');
    text.focus();
    renderPreview();
  }));
  document.querySelector('[data-link]').addEventListener('click', () => {
    const start = text.selectionStart;
    const end = text.selectionEnd;
    text.setRangeText(`[${text.value.slice(start, end) || 'texto'}](https://)`, start, end, 'select');
    text.focus();
    renderPreview();
  });
  draftList.addEventListener('change', async () => {
    const slug = draftList.value;
    if (!slug) {
      form.reset();
      form.elements.slug.value = '';
      selectedFile = null;
      currentImage = '';
      previewUrl = '';
      imageInput.value = '';
      fileName.textContent = 'No hay imagen seleccionada';
      setStatus('Nuevo artículo.');
      renderPreview();
      return;
    }
    setStatus('Abriendo borrador…');
    try {
      const response = await fetch(`/api/articles?slug=${encodeURIComponent(slug)}`, { credentials: 'same-origin', cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'No se pudo abrir el borrador.');
      fillForm(payload.result);
    } catch (error) {
      setStatus(error.message, 'error');
    }
  });
  saveButton.addEventListener('click', () => submit('draft'));
  publishButton.addEventListener('click', () => submit('publish'));
  document.addEventListener('studio:authorized', () => { renderPreview(); loadDrafts(); });
  renderPreview();
})();
