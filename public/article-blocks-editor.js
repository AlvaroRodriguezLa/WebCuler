import { renderArticleBlock, renderEnrichedMarkdown, validateArticleBlock } from './article-blocks.mjs';

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const PRESETS = {
  '4-3-3': [[50,94,'POR'],[12,76,'LI'],[38,76,'DFC'],[62,76,'DFC'],[88,76,'LD'],[28,54,'MC'],[50,68,'MCD'],[72,54,'MC'],[14,32,'EI'],[50,18,'DC'],[86,32,'ED']],
  '4-2-3-1': [[50,94,'POR'],[12,76,'LI'],[38,76,'DFC'],[62,76,'DFC'],[88,76,'LD'],[38,60,'MCD'],[62,60,'MCD'],[14,38,'EI'],[50,43,'MP'],[86,38,'ED'],[50,16,'DC']],
  '4-4-2': [[50,94,'POR'],[12,76,'LI'],[38,76,'DFC'],[62,76,'DFC'],[88,76,'LD'],[14,53,'MI'],[38,57,'MC'],[62,57,'MC'],[86,53,'MD'],[37,20,'DC'],[63,20,'DC']],
  '3-2-5': [[50,94,'POR'],[25,75,'DFC'],[50,78,'DFC'],[75,75,'DFC'],[38,56,'MCD'],[62,56,'MCD'],[10,30,'CA'],[30,24,'CA'],[50,20,'CA'],[70,24,'CA'],[90,30,'CA']],
};

function boardEditor(index, title, preset = '4-3-3') {
  const rows = PRESETS[preset].map(([x, y, role], playerIndex) => `<div class="board-player-row" data-player-row="${playerIndex}"><label>Futbolista ${playerIndex + 1}<input data-player-name value="Jugador ${playerIndex + 1}" maxlength="48" /></label><label>Posición<input data-player-role value="${role}" maxlength="24" /></label><label>X<input data-player-x type="number" inputmode="decimal" min="0" max="100" step="1" value="${x}" /></label><label>Y<input data-player-y type="number" inputmode="decimal" min="0" max="100" step="1" value="${y}" /></label><button type="button" data-remove-player aria-label="Quitar jugador ${playerIndex + 1}">Quitar</button></div>`).join('');
  return `<fieldset class="block-board-editor" data-board-index="${index}"><legend>${escapeHtml(title)}</legend><label>Nombre del esquema<input data-board-title value="${escapeHtml(title)}" maxlength="100" /></label><label>Formación inicial<select data-board-formation>${Object.keys(PRESETS).map((item) => `<option value="${item}" ${item === preset ? 'selected' : ''}>${item}</option>`).join('')}<option value="personalizada">Personalizada</option></select></label><label>Descripción inferior<textarea data-board-description rows="2" maxlength="600" placeholder="Qué muestra esta estructura"></textarea></label><div class="board-players-heading"><strong>Jugadores y coordenadas</strong><button type="button" data-add-player>Añadir futbolista</button></div><p class="block-editor-hint">Arrastra los marcadores en el campo o ajusta X/Y de 0 a 100. X va de izquierda a derecha; Y, de arriba abajo.</p><div class="board-player-list">${rows}</div><details><summary>Conexiones, movimientos y zonas (opcional)</summary><label>Conexiones: dos nombres separados por |, una pareja por línea<textarea data-board-connections rows="2" placeholder="Jugador 6 | Jugador 10"></textarea></label><label>Movimientos: x,y → x,y, uno por línea<textarea data-board-movements rows="2" placeholder="50,18 -> 50,37"></textarea></label><label>Zonas: x,y,ancho,alto,etiqueta, una por línea<textarea data-board-zones rows="2" placeholder="35,30,30,20,Entre líneas"></textarea></label></details><div class="board-editor-preview"></div></fieldset>`;
}

function statsForm() {
  return `<label>Título (opcional)<input data-stat-title maxlength="120" placeholder="Indicadores clave" /></label><div class="stat-editor-list"><div class="stat-editor-row"><label>Valor<input data-stat-value maxlength="32" placeholder="p. ej. 62,2 %" /></label><label>Etiqueta<input data-stat-label maxlength="64" placeholder="p. ej. Posesión" /></label><label>Fuente opcional<input data-stat-source maxlength="120" /></label><button type="button" data-remove-stat>Quitar</button></div></div><button type="button" data-add-stat>Añadir indicador</button><label>Nota (opcional)<textarea data-stat-note rows="2" maxlength="240"></textarea></label>`;
}

function chartForm() {
  return `<label>Título<input data-chart-title maxlength="120" placeholder="Comparativa de métricas" /></label><label>Tipo de gráfico<select data-chart-kind><option value="bar">Barras</option><option value="line">Líneas</option><option value="comparison">Comparación de barras</option></select></label><label>Etiquetas del eje (separadas por comas)<input data-chart-labels placeholder="p. ej. 2024, 2025, 2026" /></label><div class="chart-editor-series"><div class="chart-editor-row"><label>Serie<input data-series-name placeholder="Nombre" /></label><label>Valores numéricos, en el mismo orden<input data-series-values inputmode="decimal" placeholder="p. ej. 8, 6, 9" /></label><button type="button" data-remove-series>Quitar</button></div><div class="chart-editor-row"><label>Serie<input data-series-name placeholder="Nombre" /></label><label>Valores numéricos, en el mismo orden<input data-series-values inputmode="decimal" placeholder="p. ej. 6, 7, 7" /></label><button type="button" data-remove-series>Quitar</button></div></div><button type="button" data-add-series>Añadir serie</button><label>Descripción (opcional)<textarea data-chart-description rows="2"></textarea></label><label>Fuente (opcional)<input data-chart-source maxlength="180" /></label><label>Nota (opcional)<textarea data-chart-note rows="2" maxlength="300"></textarea></label><p class="block-editor-hint">Introduce datos procedentes de una fuente real. Los ejemplos de los campos son solo formato; el valor debe venir de tu análisis.</p>`;
}

function renderEditorFields(type, container) {
  if (type === 'tactical-board') container.innerHTML = boardEditor(0, 'Campo táctico', '4-3-3');
  else if (type === 'tactical-comparison') container.innerHTML = `<label>Título de la comparativa<input data-comparison-title value="Dos estructuras" maxlength="120" /></label><label>Explicación general<textarea data-comparison-explanation rows="2" maxlength="800"></textarea></label>${boardEditor(0, 'Estructura inicial', '4-2-3-1')}${boardEditor(1, 'Propuesta', '4-3-3')}`;
  else if (type === 'stat-cards') container.innerHTML = statsForm();
  else if (type === 'editorial-callout') container.innerHTML = `<label>Título opcional<input data-callout-title maxlength="120" placeholder="La tesis" /></label><label>Idea a destacar<textarea data-callout-text rows="4" maxlength="1000" placeholder="Escribe aquí la idea central del análisis." required></textarea></label>`;
  else if (type === 'source-note') container.innerHTML = `<label>Fuente (opcional)<input data-source-name maxlength="160" placeholder="Nombre de la fuente" /></label><label>Enlace https seguro (opcional)<input data-source-url type="url" placeholder="https://..." /></label><label>Fecha (opcional)<input data-source-date type="date" /></label><label>Nota o descripción<textarea data-source-description rows="2" maxlength="500"></textarea></label><label>Metodología (opcional)<textarea data-source-methodology rows="2" maxlength="500"></textarea></label>`;
  else if (type === 'chart-block') container.innerHTML = chartForm();
  else container.replaceChildren();
}

function parseRows(text, parser, label) {
  return String(text || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line, index) => {
    try { return parser(line); } catch { throw new Error(`${label}, línea ${index + 1}: revisa el formato.`); }
  });
}

function collectBoard(fieldset) {
  const players = [...fieldset.querySelectorAll('.board-player-row')].map((row) => ({ name: row.querySelector('[data-player-name]').value.trim(), role: row.querySelector('[data-player-role]').value.trim(), x: Number(row.querySelector('[data-player-x]').value), y: Number(row.querySelector('[data-player-y]').value) }));
  const connections = parseRows(fieldset.querySelector('[data-board-connections]').value, (line) => { const parts = line.split('|').map((part) => part.trim()); if (parts.length !== 2 || parts.some((part) => !part)) throw new Error(); return parts; }, 'Conexión');
  const movements = parseRows(fieldset.querySelector('[data-board-movements]').value, (line) => { const parts = line.split(/\s*(?:->|→)\s*/); if (parts.length !== 2) throw new Error(); const parsePoint = (point) => { const values = point.split(',').map((value) => Number(value.trim())); if (values.length !== 2 || values.some((value) => !Number.isFinite(value))) throw new Error(); return values; }; return { from: parsePoint(parts[0]), to: parsePoint(parts[1]) }; }, 'Movimiento');
  const zones = parseRows(fieldset.querySelector('[data-board-zones]').value, (line) => { const parts = line.split(',').map((part) => part.trim()); if (parts.length < 4 || parts.length > 5) throw new Error(); const values = parts.slice(0, 4).map(Number); if (values.some((value) => !Number.isFinite(value))) throw new Error(); return { x: values[0], y: values[1], width: values[2], height: values[3], label: parts[4] || '' }; }, 'Zona');
  const formation = fieldset.querySelector('[data-board-formation]').value;
  return { title: fieldset.querySelector('[data-board-title]').value.trim(), formation: formation === 'personalizada' ? 'Personalizada' : formation, description: fieldset.querySelector('[data-board-description]').value.trim(), players, connections, movements, zones };
}

function collectConfig(type, container) {
  if (type === 'tactical-board') return { type, ...collectBoard(container.querySelector('[data-board-index]')) };
  if (type === 'tactical-comparison') {
    const [left, right] = [...container.querySelectorAll('[data-board-index]')].map(collectBoard);
    return { type, title: container.querySelector('[data-comparison-title]').value.trim(), explanation: container.querySelector('[data-comparison-explanation]').value.trim(), left, right };
  }
  if (type === 'stat-cards') return { type, title: container.querySelector('[data-stat-title]').value.trim(), stats: [...container.querySelectorAll('.stat-editor-row')].map((row) => ({ value: row.querySelector('[data-stat-value]').value.trim(), label: row.querySelector('[data-stat-label]').value.trim(), source: row.querySelector('[data-stat-source]').value.trim() })), note: container.querySelector('[data-stat-note]').value.trim() };
  if (type === 'editorial-callout') return { type, title: container.querySelector('[data-callout-title]').value.trim(), text: container.querySelector('[data-callout-text]').value.trim() };
  if (type === 'source-note') return { type, source: container.querySelector('[data-source-name]').value.trim(), url: container.querySelector('[data-source-url]').value.trim(), date: container.querySelector('[data-source-date]').value, description: container.querySelector('[data-source-description]').value.trim(), methodology: container.querySelector('[data-source-methodology]').value.trim() };
  if (type === 'chart-block') {
    const labels = container.querySelector('[data-chart-labels]').value.split(',').map((value) => value.trim());
    return { type, chartType: container.querySelector('[data-chart-kind]').value, title: container.querySelector('[data-chart-title]').value.trim(), labels, series: [...container.querySelectorAll('.chart-editor-row')].map((row) => ({ name: row.querySelector('[data-series-name]').value.trim(), values: row.querySelector('[data-series-values]').value.split(',').map((value) => Number(value.trim())) })), description: container.querySelector('[data-chart-description]').value.trim(), source: container.querySelector('[data-chart-source]').value.trim(), note: container.querySelector('[data-chart-note]').value.trim() };
  }
  throw new Error('Tipo de bloque no reconocido.');
}

function createBoardPreview(fieldset) {
  const target = fieldset.querySelector('.board-editor-preview');
  try { target.innerHTML = renderArticleBlock({ type: 'tactical-board', ...collectBoard(fieldset) }, { editor: true }); }
  catch (error) { target.innerHTML = `<p class="block-form-error">${escapeHtml(error.message)}</p>`; }
}

function attachBoardInteraction(fieldset) {
  const svg = fieldset.querySelector('[data-editor-board]');
  if (!svg) return;
  const refresh = () => createBoardPreview(fieldset);
  const setPosition = (marker, clientX, clientY) => {
    const rect = svg.getBoundingClientRect(); const index = marker.dataset.playerIndex; const row = fieldset.querySelector(`[data-player-row="${index}"]`);
    if (!row || !rect.width || !rect.height) return;
    const x = clamp(Math.round(((clientX - rect.left) / rect.width * 360 - 24) / 3.12), 0, 100);
    const y = clamp(Math.round(((clientY - rect.top) / rect.height * 520 - 24) / 4.72), 0, 100);
    row.querySelector('[data-player-x]').value = String(x); row.querySelector('[data-player-y]').value = String(y);
    const pointX = 24 + x * 3.12; const pointY = 24 + y * 4.72;
    const circle = marker.querySelector('circle'); const initial = marker.querySelector('.tactical-player-initial'); const name = marker.querySelector('.tactical-player-name');
    circle?.setAttribute('cx', String(pointX)); circle?.setAttribute('cy', String(pointY));
    initial?.setAttribute('x', String(pointX)); initial?.setAttribute('y', String(pointY + 3.4));
    name?.setAttribute('x', String(pointX)); name?.setAttribute('y', String(pointY + 25));
  };
  svg.querySelectorAll('[data-player-index]').forEach((marker) => {
    marker.addEventListener('pointerdown', (event) => { event.preventDefault(); marker.setPointerCapture?.(event.pointerId); marker.dataset.dragging = 'true'; setPosition(marker, event.clientX, event.clientY); });
    marker.addEventListener('pointermove', (event) => { if (marker.dataset.dragging === 'true') setPosition(marker, event.clientX, event.clientY); });
    const finish = () => { if (marker.dataset.dragging === 'true') { delete marker.dataset.dragging; refresh(); } };
    marker.addEventListener('pointerup', finish); marker.addEventListener('pointercancel', finish);
    marker.addEventListener('keydown', (event) => {
      const change = event.shiftKey ? 5 : 1; const row = fieldset.querySelector(`[data-player-row="${marker.dataset.playerIndex}"]`);
      if (!row || !['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key)) return;
      event.preventDefault(); const x = row.querySelector('[data-player-x]'); const y = row.querySelector('[data-player-y]');
      if (event.key === 'ArrowLeft') x.value = String(clamp(Number(x.value) - change, 0, 100));
      if (event.key === 'ArrowRight') x.value = String(clamp(Number(x.value) + change, 0, 100));
      if (event.key === 'ArrowUp') y.value = String(clamp(Number(y.value) - change, 0, 100));
      if (event.key === 'ArrowDown') y.value = String(clamp(Number(y.value) + change, 0, 100));
      refresh();
    });
  });
}

function updateBoardPreviews(root) {
  root.querySelectorAll('[data-board-index]').forEach((fieldset) => { createBoardPreview(fieldset); attachBoardInteraction(fieldset); });
}

function applyFormation(fieldset, formation) {
  const positions = PRESETS[formation];
  if (!positions) return;
  const rows = [...fieldset.querySelectorAll('.board-player-row')];
  rows.forEach((row, index) => {
    const point = positions[index % positions.length];
    row.querySelector('[data-player-x]').value = String(point[0]); row.querySelector('[data-player-y]').value = String(point[1]);
    if (index < positions.length) row.querySelector('[data-player-role]').value = point[2];
  });
  updateBoardPreviews(fieldset.closest('#article-block-form'));
}

function bindDynamicControls(container) {
  container.querySelectorAll('[data-board-index]').forEach((fieldset) => {
    fieldset.addEventListener('change', (event) => { if (event.target.matches('[data-board-formation]')) applyFormation(fieldset, event.target.value); });
    fieldset.addEventListener('input', () => { createBoardPreview(fieldset); attachBoardInteraction(fieldset); });
    fieldset.querySelector('[data-add-player]').addEventListener('click', () => {
      const list = fieldset.querySelector('.board-player-list'); const index = list.querySelectorAll('.board-player-row').length;
      if (index >= 25) return;
      const row = document.createElement('div'); row.className = 'board-player-row'; row.dataset.playerRow = String(index);
      row.innerHTML = `<label>Futbolista ${index + 1}<input data-player-name value="Jugador ${index + 1}" maxlength="48" /></label><label>Posición<input data-player-role value="" maxlength="24" /></label><label>X<input data-player-x type="number" inputmode="decimal" min="0" max="100" step="1" value="50" /></label><label>Y<input data-player-y type="number" inputmode="decimal" min="0" max="100" step="1" value="50" /></label><button type="button" data-remove-player aria-label="Quitar jugador ${index + 1}">Quitar</button>`;
      list.append(row); row.querySelector('[data-player-name]').focus(); updateBoardPreviews(container);
    });
    fieldset.addEventListener('click', (event) => {
      const button = event.target.closest('[data-remove-player]'); if (!button) return;
      const rows = [...fieldset.querySelectorAll('.board-player-row')]; if (rows.length <= 1) return;
      rows[rows.indexOf(button.closest('.board-player-row'))].remove();
      [...fieldset.querySelectorAll('.board-player-row')].forEach((row, index) => { row.dataset.playerRow = String(index); row.querySelector('label').firstChild.textContent = `Futbolista ${index + 1}`; row.querySelector('[data-remove-player]').setAttribute('aria-label', `Quitar jugador ${index + 1}`); });
      updateBoardPreviews(container);
    });
  });
  container.querySelector('[data-add-stat]')?.addEventListener('click', () => {
    const list = container.querySelector('.stat-editor-list'); if (list.children.length >= 6) return;
    const row = document.createElement('div'); row.className = 'stat-editor-row'; row.innerHTML = '<label>Valor<input data-stat-value maxlength="32" /></label><label>Etiqueta<input data-stat-label maxlength="64" /></label><label>Fuente opcional<input data-stat-source maxlength="120" /></label><button type="button" data-remove-stat>Quitar</button>'; list.append(row); row.querySelector('[data-stat-value]').focus();
  });
  container.addEventListener('click', (event) => {
    const stat = event.target.closest('[data-remove-stat]'); if (stat) { const list = container.querySelector('.stat-editor-list'); if (list.children.length > 1) stat.closest('.stat-editor-row').remove(); }
    const series = event.target.closest('[data-remove-series]'); if (series) { const list = container.querySelector('.chart-editor-series'); if (list.children.length > 1) series.closest('.chart-editor-row').remove(); }
    if (event.target.closest('[data-add-series]')) {
      const list = container.querySelector('.chart-editor-series'); if (list.children.length >= 4) return;
      const row = document.createElement('div'); row.className = 'chart-editor-row'; row.innerHTML = '<label>Serie<input data-series-name maxlength="48" /></label><label>Valores numéricos, en el mismo orden<input data-series-values inputmode="decimal" /></label><button type="button" data-remove-series>Quitar</button>'; list.append(row); row.querySelector('[data-series-name]').focus();
    }
  });
}

export function initializeArticleBlockEditor({ textarea, refreshPreview }) {
  const dialog = document.querySelector('#article-block-dialog'); const opener = document.querySelector('#open-block-editor'); const close = document.querySelector('#close-block-dialog'); const cancel = document.querySelector('#cancel-block-editor');
  const typeSelect = document.querySelector('#article-block-type'); const form = document.querySelector('#article-block-form'); const error = document.querySelector('#article-block-error'); const preview = document.querySelector('#article-block-preview'); const insert = document.querySelector('#insert-article-block'); const loadDemo = document.querySelector('#load-editorial-demo');
  if (!dialog || !opener || !textarea) return;
  const markdownImport = document.querySelector('#markdown-import');
  const closeDialog = () => dialog.close?.() ?? dialog.removeAttribute('open');
  const showDialog = () => dialog.showModal ? dialog.showModal() : dialog.setAttribute('open', '');
  const showBlockPreview = () => {
    try { const config = validateArticleBlock(collectConfig(typeSelect.value, form)); preview.innerHTML = renderArticleBlock(config, { editor: true }); error.hidden = true; updateBoardPreviews(form); }
    catch (exception) { preview.replaceChildren(); error.textContent = exception.message; error.hidden = false; updateBoardPreviews(form); }
  };
  const renderForm = () => { renderEditorFields(typeSelect.value, form); bindDynamicControls(form); showBlockPreview(); };
  opener.addEventListener('click', () => { renderForm(); showDialog(); });
  close?.addEventListener('click', closeDialog); cancel?.addEventListener('click', closeDialog);
  typeSelect.addEventListener('change', renderForm); form.addEventListener('input', showBlockPreview);
  form.addEventListener('change', showBlockPreview);
  insert.addEventListener('click', () => {
    try {
      const block = validateArticleBlock(collectConfig(typeSelect.value, form));
      const start = textarea.selectionStart; const end = textarea.selectionEnd; const before = textarea.value.slice(0, start); const after = textarea.value.slice(end);
      const prefix = before && !before.endsWith('\n\n') ? before.endsWith('\n') ? '\n' : '\n\n' : '';
      const suffix = after && !after.startsWith('\n\n') ? after.startsWith('\n') ? '\n' : '\n\n' : '';
      const fence = `\`\`\`oneshot\n${JSON.stringify(block, null, 2)}\n\`\`\``;
      textarea.setRangeText(`${prefix}${fence}${suffix}`, start, end, 'end'); textarea.focus();
      textarea.dispatchEvent(new Event('input', { bubbles: true })); refreshPreview?.(); closeDialog();
    } catch (exception) { error.textContent = exception.message; error.hidden = false; }
  });
  loadDemo?.addEventListener('click', async () => {
    loadDemo.disabled = true; loadDemo.textContent = 'Cargando ejemplo…';
    try {
      const response = await fetch('/api/studio/demo', { credentials: 'same-origin', cache: 'no-store' }); const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'No se pudo cargar el ejemplo.');
      const article = payload.result; document.querySelector('#title').value = article.title; textarea.value = article.text;
      for (const [name, value] of Object.entries({ category: article.category, subject: article.subject, season: article.season, excerpt: article.excerpt })) { const field = document.querySelector(`[name="${name}"]`); if (field) field.value = value; }
      document.querySelector('[name="slug"]')?.setAttribute('value', '');
      document.querySelector('#image')?.dispatchEvent(new CustomEvent('studio:clear-image'));
      textarea.dispatchEvent(new Event('input', { bubbles: true })); refreshPreview?.();
      document.querySelector('#status').textContent = 'Ejemplo cargado para previsualizar. Incluye datos sintéticos marcados; no es una publicación real. Añade tu propia imagen antes de guardar.';
    } catch (exception) { document.querySelector('#status').textContent = exception.message; }
    finally { loadDemo.disabled = false; loadDemo.textContent = 'Cargar artículo de demostración'; }
  });
  markdownImport?.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!/\.md$/i.test(file.name) || file.size > 1_000_000) {
      document.querySelector('#status').textContent = 'Elige un archivo .md de menos de 1 MB.';
      event.target.value = '';
      return;
    }
    try {
      textarea.value = await file.text();
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      refreshPreview?.();
      document.querySelector('#status').textContent = `Markdown importado: ${file.name}. El contenido se conserva en el campo TEXTO.`;
    } catch {
      document.querySelector('#status').textContent = 'No se pudo leer el archivo Markdown.';
    } finally { event.target.value = ''; }
  });
}

export { renderEnrichedMarkdown };
