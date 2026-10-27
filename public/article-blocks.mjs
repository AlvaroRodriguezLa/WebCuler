const BLOCK_TYPES = new Set(['tactical-board', 'tactical-comparison', 'stat-cards', 'editorial-callout', 'source-note', 'chart-block', 'oneshot-svg']);
const ENRICHED_LANGUAGES = new Set(['tactic', 'tactic-comparison', 'stats', 'insight', 'chart', 'source-note', 'oneshot-svg', 'oneshot']);
const MAX_BLOCK_CHARS = 24_000;
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const cleanText = (value, label, { required = true, max = 300 } = {}) => {
  if (typeof value !== 'string') throw new Error(`${label}: debe ser texto.`);
  const result = value.trim();
  if (required && !result) throw new Error(`${label}: no puede estar vacío.`);
  if (result.length > max) throw new Error(`${label}: supera ${max} caracteres.`);
  return result;
};
const number = (value, label, min = 0, max = 100) => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new Error(`${label}: usa un número entre ${min} y ${max}.`);
  return value;
};
const list = (value, label, min, max) => {
  if (!Array.isArray(value) || value.length < min || value.length > max) throw new Error(`${label}: incluye entre ${min} y ${max} elementos.`);
  return value;
};

export function extractPastedArticleTitle(markdown) {
  const source = String(markdown ?? '');
  const match = source.match(/^TITULO:\s*(.{1,120}?)\s*\r?\n(?:\r?\n)?/i);
  return match ? { title: match[1].trim(), body: source.slice(match[0].length) } : null;
}

function validateBoard(raw, label = 'Campo táctico') {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error(`${label}: se esperaba un objeto.`);
  const players = list(raw.players, `${label} / jugadores`, 1, 25).map((player, index) => {
    const path = `${label} / jugador ${index + 1}`;
    if (!player || typeof player !== 'object') throw new Error(`${path}: se esperaba un objeto.`);
    const assetKey = player.assetKey === undefined ? '' : cleanText(player.assetKey, `${path} / assetKey`, { required: false, max: 32 });
    if (assetKey && !/^tm:\d+$/.test(assetKey)) throw new Error(`${path} / assetKey: usa tm:<número>.`);
    const portraitScale = player.portraitScale === undefined ? 1 : number(player.portraitScale, `${path} / portraitScale`, 0.75, 1.5);
    return { name: cleanText(player.name, `${path} / nombre`, { max: 48 }), role: cleanText(player.role ?? '', `${path} / posición`, { required: false, max: 24 }), assetKey, portraitScale, x: number(player.x, `${path} / X`), y: number(player.y, `${path} / Y`) };
  });
  const playerNames = new Set(players.map((player) => player.name));
  const connections = raw.connections === undefined ? [] : list(raw.connections, `${label} / conexiones`, 0, 40).map((connection, index) => {
    if (!Array.isArray(connection) || connection.length !== 2 || connection.some((name) => !playerNames.has(name))) throw new Error(`${label} / conexión ${index + 1}: indica dos nombres de jugador existentes.`);
    return [String(connection[0]), String(connection[1])];
  });
  const connectionStyles = raw.connectionStyles === undefined ? connections.map(() => 'dashed') : list(raw.connectionStyles, `${label} / estilos de conexión`, connections.length, connections.length).map((style) => {
    if (!['solid', 'dashed'].includes(style)) throw new Error(`${label} / estilo de conexión: usa solid o dashed.`);
    return style;
  });
  const movements = raw.movements === undefined ? [] : list(raw.movements, `${label} / movimientos`, 0, 20).map((movement, index) => {
    const path = `${label} / movimiento ${index + 1}`;
    if (!movement || typeof movement !== 'object' || !Array.isArray(movement.from) || !Array.isArray(movement.to) || movement.from.length !== 2 || movement.to.length !== 2) throw new Error(`${path}: requiere from y to como pares [x, y].`);
    return { from: [number(movement.from[0], `${path} / origen X`), number(movement.from[1], `${path} / origen Y`)], to: [number(movement.to[0], `${path} / destino X`), number(movement.to[1], `${path} / destino Y`)] };
  });
  const zones = raw.zones === undefined ? [] : list(raw.zones, `${label} / zonas`, 0, 12).map((zone, index) => {
    const path = `${label} / zona ${index + 1}`;
    if (!zone || typeof zone !== 'object') throw new Error(`${path}: se esperaba un objeto.`);
    const x = number(zone.x, `${path} / X`); const y = number(zone.y, `${path} / Y`);
    const width = number(zone.width, `${path} / ancho`); const height = number(zone.height, `${path} / alto`);
    if (x + width > 100 || y + height > 100) throw new Error(`${path}: la zona debe caber dentro del campo.`);
    return { x, y, width, height, label: cleanText(zone.label ?? '', `${path} / etiqueta`, { required: false, max: 40 }) };
  });
  const playerAppearance = raw.playerAppearance ?? 'marker';
  if (!['marker', 'portrait'].includes(playerAppearance)) throw new Error(`${label} / playerAppearance: usa marker o portrait.`);
  return {
    title: cleanText(raw.title, `${label} / título`, { max: 100 }),
    formation: cleanText(raw.formation ?? '', `${label} / formación`, { required: false, max: 30 }),
    description: cleanText(raw.description ?? '', `${label} / descripción`, { required: false, max: 600 }),
    players, connections, connectionStyles, movements, zones, playerAppearance,
  };
}

export function validateArticleBlock(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('El bloque debe ser un objeto JSON.');
  if (!BLOCK_TYPES.has(raw.type)) throw new Error(`Tipo de bloque desconocido: ${String(raw.type)}. Opciones: ${[...BLOCK_TYPES].join(', ')}.`);
  switch (raw.type) {
    case 'tactical-board': return { type: raw.type, ...validateBoard(raw, 'Campo táctico'), caption: cleanText(raw.caption ?? '', 'Campo táctico / caption', { required: false, max: 500 }) };
    case 'tactical-comparison':
      return { type: raw.type, title: cleanText(raw.title, 'Comparativa / título', { max: 120 }), explanation: cleanText(raw.explanation ?? '', 'Comparativa / explicación', { required: false, max: 800 }), left: validateBoard(raw.left, 'Comparativa / izquierda'), right: validateBoard(raw.right, 'Comparativa / derecha') };
    case 'stat-cards': {
      const stats = list(raw.stats, 'Estadísticas', 1, 6).map((stat, index) => {
        if (!stat || typeof stat !== 'object') throw new Error(`Estadística ${index + 1}: se esperaba un objeto.`);
        return { value: cleanText(stat.value, `Estadística ${index + 1} / valor`, { max: 32 }), label: cleanText(stat.label, `Estadística ${index + 1} / etiqueta`, { max: 64 }), description: cleanText(stat.description ?? '', `Estadística ${index + 1} / descripción`, { required: false, max: 300 }), source: cleanText(stat.source ?? '', `Estadística ${index + 1} / fuente`, { required: false, max: 120 }) };
      });
      return { type: raw.type, title: cleanText(raw.title ?? '', 'Estadísticas / título', { required: false, max: 120 }), stats, note: cleanText(raw.note ?? '', 'Estadísticas / nota', { required: false, max: 240 }) };
    }
    case 'editorial-callout': return { type: raw.type, title: cleanText(raw.title ?? '', 'Tesis / título', { required: false, max: 120 }), text: cleanText(raw.text, 'Tesis / texto', { max: 1000 }) };
    case 'source-note': {
      const url = cleanText(raw.url ?? '', 'Fuente / URL', { required: false, max: 500 });
      if (url) { let parsed; try { parsed = new URL(url); } catch { throw new Error('Fuente / URL: introduce una dirección https válida.'); } if (parsed.protocol !== 'https:' || parsed.username || parsed.password) throw new Error('Fuente / URL: usa un enlace https sin credenciales incrustadas.'); }
      const date = cleanText(raw.date ?? '', 'Fuente / fecha', { required: false, max: 10 });
      if (date) { const parsedDate = new Date(`${date}T00:00:00Z`); if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) throw new Error('Fuente / fecha: introduce una fecha real en formato AAAA-MM-DD.'); }
      const result = { type: raw.type, source: cleanText(raw.source ?? '', 'Fuente / nombre', { required: false, max: 160 }), url, date, methodology: cleanText(raw.methodology ?? '', 'Fuente / metodología', { required: false, max: 500 }), description: cleanText(raw.description ?? '', 'Fuente / nota', { required: false, max: 500 }) };
      if (!result.source && !result.url && !result.date && !result.methodology && !result.description) throw new Error('Fuente / nota: añade al menos un dato o una observación.');
      return result;
    }
    case 'chart-block': {
      const chartType = raw.chartType;
      if (!['bar', 'line', 'comparison'].includes(chartType)) throw new Error('Gráfico / tipo: elige bar, line o comparison.');
      const labels = list(raw.labels, 'Gráfico / etiquetas', 2, 16).map((label, index) => cleanText(label, `Gráfico / etiqueta ${index + 1}`, { max: 48 }));
      const series = list(raw.series, 'Gráfico / series', 1, 4).map((item, index) => {
        if (!item || typeof item !== 'object') throw new Error(`Gráfico / serie ${index + 1}: se esperaba un objeto.`);
        const values = list(item.values, `Gráfico / valores ${index + 1}`, labels.length, labels.length).map((value, valueIndex) => number(value, `Gráfico / valor ${valueIndex + 1}`, 0, 1_000_000));
        return { name: cleanText(item.name, `Gráfico / nombre de serie ${index + 1}`, { max: 48 }), values };
      });
      return { type: raw.type, chartType, title: cleanText(raw.title, 'Gráfico / título', { max: 120 }), description: cleanText(raw.description ?? '', 'Gráfico / descripción', { required: false, max: 400 }), labels, series, source: cleanText(raw.source ?? '', 'Gráfico / fuente', { required: false, max: 180 }), note: cleanText(raw.note ?? '', 'Gráfico / nota', { required: false, max: 300 }) };
    }
    case 'oneshot-svg': return { type: raw.type, markup: sanitizeOneShotSvg(raw.markup) };
  }
}

function mapPoint(x, y) { return { x: Math.round((24 + x * 3.12) * 100) / 100, y: Math.round((24 + y * 4.72) * 100) / 100 }; }

function normalizeTactic(raw, label) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error(`${label}: se esperaba un objeto.`);
  const players = list(raw.players, `${label} / jugadores`, 1, 25).map((player, index) => {
    const path = `${label} / jugador ${index + 1}`;
    if (!player || typeof player !== 'object' || Array.isArray(player)) throw new Error(`${path}: se esperaba un objeto.`);
    const id = cleanText(player.id, `${path} / id`, { max: 48 });
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error(`${path} / id: usa letras, números, guion o guion bajo.`);
    const assetKey = player.assetKey === undefined ? '' : cleanText(player.assetKey, `${path} / assetKey`, { required: false, max: 32 });
    if (assetKey && !/^tm:\d+$/.test(assetKey)) throw new Error(`${path} / assetKey: usa el ID estable tm:<número> del catálogo.`);
    const portraitScale = player.portraitScale === undefined ? 1 : number(player.portraitScale, `${path} / portraitScale`, 0.75, 1.5);
    return { id, name: cleanText(player.name, `${path} / nombre`, { max: 48 }), role: cleanText(player.role ?? '', `${path} / posición`, { required: false, max: 24 }), assetKey, portraitScale, x: number(player.x, `${path} / X`), y: number(player.y, `${path} / Y`) };
  });
  const ids = new Set(players.map(({ id }) => id));
  if (ids.size !== players.length) throw new Error(`${label}: los IDs de los futbolistas deben ser únicos.`);
  const names = new Set(players.map(({ name }) => name));
  if (names.size !== players.length) throw new Error(`${label}: los nombres de los futbolistas deben ser únicos.`);
  const connections = raw.connections === undefined ? [] : list(raw.connections, `${label} / conexiones`, 0, 40).map((connection, index) => {
    if (!connection || typeof connection !== 'object' || Array.isArray(connection) || !ids.has(connection.from) || !ids.has(connection.to)) throw new Error(`${label} / conexión ${index + 1}: from y to deben referirse a IDs existentes.`);
    const style = connection.style ?? 'solid';
    if (!['solid', 'dashed'].includes(style)) throw new Error(`${label} / conexión ${index + 1}: style admite solid o dashed.`);
    return { from: connection.from, to: connection.to, style };
  });
  const playerAppearance = raw.playerAppearance ?? 'marker';
  if (!['marker', 'portrait'].includes(playerAppearance)) throw new Error(`${label} / playerAppearance: usa marker o portrait.`);
  return {
    title: cleanText(raw.title ?? label, `${label} / título`, { max: 100 }),
    formation: cleanText(raw.formation ?? '', `${label} / formación`, { required: false, max: 30 }),
    playerAppearance,
    description: cleanText(raw.description ?? '', `${label} / descripción`, { required: false, max: 600 }),
    players: players.map(({ name, role, assetKey, portraitScale, x, y }) => ({ name, role, assetKey, portraitScale, x, y })),
    connections: connections.map(({ from, to }) => [players.find((player) => player.id === from).name, players.find((player) => player.id === to).name]),
    connectionStyles: connections.map(({ style }) => style),
    movements: (raw.movements ?? []).map((movement, index) => {
      if (!movement || !Array.isArray(movement.from) || !Array.isArray(movement.to) || movement.from.length !== 2 || movement.to.length !== 2) throw new Error(`${label} / movimiento ${index + 1}: requiere pares from y to.`);
      return { from: [number(movement.from[0], `${label} / movimiento / origen X`), number(movement.from[1], `${label} / movimiento / origen Y`)], to: [number(movement.to[0], `${label} / movimiento / destino X`), number(movement.to[1], `${label} / movimiento / destino Y`)] };
    }),
    zones: (raw.zones ?? []).map((zone, index) => {
      if (!zone || typeof zone !== 'object') throw new Error(`${label} / zona ${index + 1}: se esperaba un objeto.`);
      const x = number(zone.x, `${label} / zona / X`); const y = number(zone.y, `${label} / zona / Y`);
      const width = number(zone.width, `${label} / zona / ancho`); const height = number(zone.height, `${label} / zona / alto`);
      if (x + width > 100 || y + height > 100) throw new Error(`${label} / zona ${index + 1}: fuera del campo.`);
      return { x, y, width, height, label: cleanText(zone.label ?? '', `${label} / zona / etiqueta`, { required: false, max: 40 }) };
    }),
  };
}

function requireSchemaV1(raw, label) {
  if (raw?.schemaVersion !== 1) throw new Error(`${label}: schemaVersion debe ser 1.`);
}

const SVG_ELEMENTS = new Set(['svg', 'g', 'defs', 'title', 'desc', 'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'text', 'tspan']);
const SVG_ATTRIBUTES = new Set(['xmlns', 'viewBox', 'role', 'aria-label', 'aria-labelledby', 'x', 'y', 'width', 'height', 'cx', 'cy', 'r', 'rx', 'ry', 'x1', 'y1', 'x2', 'y2', 'points', 'd', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray', 'opacity', 'fill-opacity', 'stroke-opacity', 'transform', 'text-anchor', 'dominant-baseline', 'font-size', 'font-family', 'font-weight', 'vector-effect', 'id']);

function sanitizeOneShotSvg(source) {
  const input = String(source ?? '').trim();
  if (!input || input.length > 24_000) throw new Error('oneshot-svg: el SVG está vacío o supera 24 000 caracteres.');
  if (/<!|<\?|\bon[a-z]+\s*=|javascript:|data:|url\s*\(|foreignObject|<image\b|\bhref\s*=/i.test(input)) throw new Error('oneshot-svg: se detectó una construcción activa o una referencia externa no permitida.');
  const pieces = input.match(/<[^>]*>|[^<]+/g) || [];
  if (pieces.join('') !== input) throw new Error('oneshot-svg: XML no válido.');
  const stack = [];
  let root = false;
  for (const piece of pieces) {
    if (!piece.startsWith('<')) {
      if (piece.includes('&') && /&(?!amp;|lt;|gt;|quot;|apos;)/.test(piece)) throw new Error('oneshot-svg: entidad XML no permitida.');
      continue;
    }
    const closing = piece.match(/^<\/([A-Za-z][\w:-]*)\s*>$/);
    if (closing) {
      if (stack.pop() !== closing[1]) throw new Error('oneshot-svg: etiquetas XML desordenadas.');
      continue;
    }
    const tag = piece.match(/^<([A-Za-z][\w:-]*)([\s\S]*?)\s*(\/?)>$/);
    if (!tag || !SVG_ELEMENTS.has(tag[1])) throw new Error(`oneshot-svg: elemento no permitido (${tag?.[1] || 'desconocido'}).`);
    const name = tag[1];
    if (!root && name !== 'svg') throw new Error('oneshot-svg: el elemento raíz debe ser svg.');
    if (name === 'svg') root = true;
    const attrSource = tag[2]; const attrs = [...attrSource.matchAll(/([A-Za-z_:][\w:.-]*)\s*=\s*("([^"]*)"|'([^']*)')/g)];
    if (attrs.map((item) => item[0]).join('').replace(/\s/g, '') !== attrSource.replace(/\s/g, '')) throw new Error('oneshot-svg: atributo XML no válido.');
    for (const attr of attrs) {
      const attrName = attr[1]; const value = attr[3] ?? attr[4] ?? '';
      if (!SVG_ATTRIBUTES.has(attrName)) throw new Error(`oneshot-svg: atributo no permitido (${attrName}).`);
      if (/[<>\u0000-\u001f]/.test(value) || /javascript:|data:|url\s*\(/i.test(value)) throw new Error(`oneshot-svg: valor no permitido en ${attrName}.`);
      if (attrName === 'xmlns' && value !== 'http://www.w3.org/2000/svg') throw new Error('oneshot-svg: xmlns debe ser el namespace SVG estándar.');
    }
    if (!tag[3]) stack.push(name);
  }
  if (stack.length || !root || !/<svg\b[^>]*\bviewBox\s*=/.test(input) || !/<svg\b[^>]*\brole\s*=\s*["']img["']/.test(input) || !/<svg\b[^>]*\baria-label\s*=/.test(input)) throw new Error('oneshot-svg: incluye un SVG bien formado con viewBox, role="img" y aria-label.');
  return input;
}

export function decodeEnrichedBlock(language, source, location = 'Bloque editorial') {
  if (language === 'oneshot') return decodeArticleBlock(source, location);
  if (language === 'oneshot-svg') return { type: 'oneshot-svg', markup: sanitizeOneShotSvg(source) };
  let raw;
  try { raw = JSON.parse(source); } catch (error) { throw new Error(`${location}: JSON no válido (${error.message}).`); }
  requireSchemaV1(raw, location);
  if (language === 'tactic') {
    const board = normalizeTactic(raw, raw.title || 'Campo táctico');
    return { type: 'tactical-board', ...board, caption: cleanText(raw.caption ?? '', 'Campo táctico / caption', { required: false, max: 500 }) };
  }
  if (language === 'tactic-comparison') {
    const left = normalizeTactic(raw.left, raw.left?.title || 'Estructura izquierda');
    const right = normalizeTactic(raw.right, raw.right?.title || 'Estructura derecha');
    return { type: 'tactical-comparison', title: cleanText(raw.title ?? 'Comparativa táctica', 'Comparativa / título', { max: 120 }), explanation: cleanText(raw.caption ?? '', 'Comparativa / caption', { required: false, max: 500 }), left, right };
  }
  if (language === 'stats') {
    const items = list(raw.items, 'Tarjetas / items', 1, 8).map((item, index) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error(`Tarjeta ${index + 1}: se esperaba un objeto.`);
      return { value: cleanText(item.value, `Tarjeta ${index + 1} / valor`, { max: 48 }), label: cleanText(item.label, `Tarjeta ${index + 1} / etiqueta`, { max: 80 }), description: cleanText(item.description ?? '', `Tarjeta ${index + 1} / descripción`, { required: false, max: 300 }), source: '' };
    });
    return { type: 'stat-cards', title: cleanText(raw.title ?? '', 'Tarjetas / título', { required: false, max: 120 }), stats: items, note: cleanText(raw.caption ?? '', 'Tarjetas / caption', { required: false, max: 500 }) };
  }
  if (language === 'chart') return validateArticleBlock({ type: 'chart-block', ...raw });
  if (language === 'source-note') return validateArticleBlock({ type: 'source-note', ...raw });
  if (language === 'insight') return { type: 'editorial-callout', title: '', text: cleanText(raw.text, 'Tesis / texto', { max: 1000 }) };
  throw new Error(`${location}: lenguaje de bloque desconocido (${language}).`);
}

let svgInstance = 0;
function renderBoard(board, { editor = false, playerAssets = {}, assetBase = '', showPlayerPhotos = false } = {}) {
  const instance = ++svgInstance;
  const warnings = [];
  const byName = new Map(board.players.map((player) => [player.name, player]));
  const connections = board.connections.map(([first, second], index) => { const a = mapPoint(byName.get(first).x, byName.get(first).y); const b = mapPoint(byName.get(second).x, byName.get(second).y); return `<line class="tactical-connection${board.connectionStyles?.[index] === 'dashed' ? ' is-dashed' : ''}" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" />`; }).join('');
  const zones = board.zones.map((zone) => `<g><rect class="tactical-zone" x="${24 + zone.x * 3.12}" y="${24 + zone.y * 4.72}" width="${zone.width * 3.12}" height="${zone.height * 4.72}" rx="6" />${zone.label ? `<text class="tactical-zone-label" x="${24 + (zone.x + zone.width / 2) * 3.12}" y="${24 + (zone.y + zone.height / 2) * 4.72}" text-anchor="middle">${escapeHtml(zone.label)}</text>` : ''}</g>`).join('');
  const movements = board.movements.map((move) => { const from = mapPoint(...move.from); const to = mapPoint(...move.to); return `<line class="tactical-movement" x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" marker-end="url(#tactical-arrow)" />`; }).join('');
  const players = board.players.map((player, index) => {
    const point = mapPoint(player.x, player.y); const labelX = Math.min(324, Math.max(36, point.x));
    const entry = player.assetKey ? playerAssets?.assets?.[player.assetKey] : null;
    const approvedUrl = entry?.status === 'approved' && typeof entry.url === 'string' && isApprovedPlayerImageUrl(entry.url, player.assetKey) ? entry.url : '';
    const portrait = showPlayerPhotos && board.playerAppearance === 'portrait' && approvedUrl;
    const size = 34 * (player.portraitScale || 1); const href = approvedUrl;
    const portraitMarkup = portrait ? `<image class="tactical-player-portrait" href="${escapeHtml(href)}" x="${point.x - size / 2}" y="${point.y - size / 2}" width="${size}" height="${size}" preserveAspectRatio="xMidYMid slice"/>` : `<circle class="tactical-player-dot" cx="${point.x}" cy="${point.y}" r="13" /><text class="tactical-player-initial" x="${point.x}" y="${point.y + 3.4}" text-anchor="middle">${escapeHtml(player.name.slice(0, 1).toUpperCase())}</text>`;
    if (editor && showPlayerPhotos && board.playerAppearance === 'portrait' && !portrait) warnings.push(`${player.name} (${player.assetKey || 'sin assetKey'}): fotografía autorizada ausente; se muestra marcador.`);
    return `<g class="tactical-player${portrait ? ' has-portrait' : ''}" ${editor ? `data-player-index="${index}" tabindex="0" role="button" aria-label="Mover a ${escapeHtml(player.name)}"` : ''}><title>${escapeHtml(player.name)}${player.role ? ` — ${escapeHtml(player.role)}` : ''}</title>${portraitMarkup}<text class="tactical-player-name" x="${labelX}" y="${point.y + (portrait ? size / 2 + 13 : 25)}" text-anchor="middle">${escapeHtml(player.name)}</text></g>`;
  }).join('');
  const connectionsAndZones = `${zones}${connections}`;
  const accessible = escapeHtml(board.players.map((player) => `${player.name}${player.role ? `, ${player.role}` : ''}`).join('; '));
  const arrowId = `tactical-arrow-${instance}`;
  const arrowMarkup = movements.replaceAll('url(#tactical-arrow)', `url(#${arrowId})`);
  return `<figure class="tactical-board"><figcaption><h3>${escapeHtml(board.title)}</h3>${board.formation ? `<span class="tactical-formation">${escapeHtml(board.formation)}</span>` : ''}</figcaption><svg class="tactical-pitch" viewBox="0 0 360 520" role="img" aria-label="Campo táctico ${escapeHtml(board.title)}${board.formation ? `, formación ${escapeHtml(board.formation)}` : ''}. Jugadores: ${accessible}" ${editor ? 'data-editor-board="true"' : ''}><title>${escapeHtml(board.title)}</title><desc>Campo vertical. El equipo ataca hacia la parte superior. Jugadores: ${accessible}</desc><defs><marker id="${escapeHtml(arrowId)}" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 z" class="tactical-arrowhead" /></marker></defs><rect class="tactical-field" x="18" y="18" width="324" height="484" rx="4"/><g class="tactical-lines"><rect x="24" y="24" width="312" height="472"/><line x1="24" y1="260" x2="336" y2="260"/><circle cx="180" cy="260" r="46"/><circle cx="180" cy="260" r="2"/><rect x="90" y="24" width="132" height="62"/><rect x="135" y="24" width="42" height="18"/><rect x="90" y="434" width="132" height="62"/><rect x="135" y="478" width="42" height="18"/><path d="M150 86 A30 30 0 0 0 210 86 M150 434 A30 30 0 0 1 210 434"/></g>${connectionsAndZones}${arrowMarkup}${players}</svg>${warnings.length ? `<ul class="tactical-asset-warnings" aria-label="Avisos de fotografías">${warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join('')}</ul>` : ''}${board.description ? `<p class="tactical-description">${escapeHtml(board.description)}</p>` : ''}${board.caption ? `<p class="editorial-note">${escapeHtml(board.caption)}</p>` : ''}</figure>`;
}

export function isApprovedPlayerImageUrl(value, assetKey = '') {
  try {
    const url = new URL(value);
    const id = String(assetKey).match(/^tm:(\d+)$/)?.[1];
    return url.protocol === 'https:' && !url.username && !url.password && !url.port && !url.search && !url.hash
      && url.hostname.endsWith('.public.blob.vercel-storage.com')
      && (!id || new RegExp(`^/players/tm-${id}/[a-f0-9]{64}\\.(?:png|jpe?g|webp)$`, 'i').test(url.pathname));
  } catch { return false; }
}

export function extractTacticalPlayerAssets(markdown) {
  const assets = new Map();
  const blocks = validateArticleBlocks(markdown);
  for (const { block } of blocks) {
    const boards = block.type === 'tactical-board' ? [block] : block.type === 'tactical-comparison' ? [block.left, block.right] : [];
    for (const board of boards) {
      if (board.playerAppearance !== 'portrait') continue;
      for (const player of board.players) {
        if (player.assetKey) {
          const current = assets.get(player.assetKey);
          assets.set(player.assetKey, { assetKey: player.assetKey, name: player.name, role: player.role, ...(current ? { aliases: [...new Set([...(current.aliases || []), player.name])] } : {}) });
        }
      }
    }
  }
  return [...assets.values()];
}

function renderChart(block) {
  const width = 720; const height = 300; const left = 48; const top = 22; const plotWidth = 640; const plotHeight = 208;
  const maximum = Math.max(1, ...block.series.flatMap((item) => item.values));
  const grid = [0, 0.25, 0.5, 0.75, 1].map((fraction) => { const y = top + fraction * plotHeight; return `<g><line class="chart-grid" x1="${left}" y1="${y}" x2="${left + plotWidth}" y2="${y}"/><text class="chart-tick" x="${left - 8}" y="${y + 4}" text-anchor="end">${Math.round(maximum * (1 - fraction))}</text></g>`; }).join('');
  const colors = ['chart-series-a', 'chart-series-b', 'chart-series-c', 'chart-series-d'];
  let marks = '';
  if (block.chartType === 'line') {
    const step = plotWidth / Math.max(1, block.labels.length - 1);
    marks = block.series.map((series, seriesIndex) => {
      const points = series.values.map((value, index) => `${left + index * step},${top + plotHeight - (value / maximum) * plotHeight}`).join(' ');
      const dots = series.values.map((value, index) => `<circle class="${colors[seriesIndex]} chart-dot" cx="${left + index * step}" cy="${top + plotHeight - (value / maximum) * plotHeight}" r="5"><title>${escapeHtml(series.name)}: ${value}</title></circle>`).join('');
      return `<polyline class="${colors[seriesIndex]} chart-line" points="${points}"/>${dots}`;
    }).join('');
  } else {
    const groupWidth = plotWidth / block.labels.length; const innerWidth = groupWidth * 0.68; const seriesWidth = innerWidth / block.series.length;
    marks = block.labels.map((_, labelIndex) => block.series.map((series, seriesIndex) => {
      const barHeight = Math.max(1, (series.values[labelIndex] / maximum) * plotHeight); const x = left + labelIndex * groupWidth + (groupWidth - innerWidth) / 2 + seriesIndex * seriesWidth; const y = top + plotHeight - barHeight;
      return `<rect class="${colors[seriesIndex]} chart-bar" x="${x}" y="${y}" width="${Math.max(2, seriesWidth - 4)}" height="${barHeight}" rx="2"><title>${escapeHtml(series.name)} · ${escapeHtml(block.labels[labelIndex])}: ${series.values[labelIndex]}</title></rect>`;
    }).join('')).join('');
  }
  const labels = block.labels.map((label, index) => { const x = block.chartType === 'line' ? left + index * (plotWidth / Math.max(1, block.labels.length - 1)) : left + (index + 0.5) * (plotWidth / block.labels.length); return `<text class="chart-label" x="${x}" y="${top + plotHeight + 26}" text-anchor="middle">${escapeHtml(label)}</text>`; }).join('');
  const legend = block.series.map((series, index) => `<span><i class="${colors[index]}" aria-hidden="true"></i>${escapeHtml(series.name)}</span>`).join('');
  const table = `<table class="chart-data-table"><caption>Datos de ${escapeHtml(block.title)}</caption><thead><tr><th>Serie</th>${block.labels.map((label) => `<th>${escapeHtml(label)}</th>`).join('')}</tr></thead><tbody>${block.series.map((series) => `<tr><th>${escapeHtml(series.name)}</th>${series.values.map((value) => `<td>${value}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  return `<figure class="editorial-chart"><figcaption><h3>${escapeHtml(block.title)}</h3>${block.description ? `<p>${escapeHtml(block.description)}</p>` : ''}</figcaption><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Gráfico ${block.chartType === 'line' ? 'de líneas' : 'de barras'}: ${escapeHtml(block.title)}. ${escapeHtml(block.series.map((series) => `${series.name}: ${series.values.join(', ')}`).join('. '))}">${grid}${marks}${labels}</svg><div class="chart-legend">${legend}</div>${table}${block.source ? `<p class="editorial-source"><strong>Fuente:</strong> ${escapeHtml(block.source)}</p>` : ''}${block.note ? `<p class="editorial-note">${escapeHtml(block.note)}</p>` : ''}</figure>`;
}

export function renderArticleBlock(raw, options = {}) {
  const block = validateArticleBlock(raw);
  switch (block.type) {
    case 'tactical-board': return renderBoard(block, options);
    case 'tactical-comparison': return `<section class="tactical-comparison"><header><h3>${escapeHtml(block.title)}</h3>${block.explanation ? `<p>${escapeHtml(block.explanation)}</p>` : ''}</header><div class="tactical-comparison-grid">${renderBoard(block.left, options)}${renderBoard(block.right, options)}</div></section>`;
    case 'stat-cards': return `<section class="stat-cards" aria-label="${escapeHtml(block.title || 'Estadísticas destacadas')}">${block.title ? `<h3>${escapeHtml(block.title)}</h3>` : ''}<div class="stat-cards-grid">${block.stats.map((stat) => `<article class="stat-card"><strong>${escapeHtml(stat.value)}</strong><span>${escapeHtml(stat.label)}</span>${stat.description ? `<small>${escapeHtml(stat.description)}</small>` : ''}${stat.source ? `<small>${escapeHtml(stat.source)}</small>` : ''}</article>`).join('')}</div>${block.note ? `<p class="editorial-note">${escapeHtml(block.note)}</p>` : ''}</section>`;
    case 'editorial-callout': return `<aside class="editorial-callout">${block.title ? `<h3>${escapeHtml(block.title)}</h3>` : ''}<p>${escapeHtml(block.text)}</p></aside>`;
    case 'source-note': return `<aside class="source-note" aria-label="Nota de fuente">${block.source ? `<strong>${block.url ? `<a href="${escapeHtml(block.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(block.source)}</a>` : escapeHtml(block.source)}</strong>` : ''}${block.date ? `<time datetime="${escapeHtml(block.date)}">${escapeHtml(block.date)}</time>` : ''}${block.description ? `<p>${escapeHtml(block.description)}</p>` : ''}${block.methodology ? `<p><span>Metodología:</span> ${escapeHtml(block.methodology)}</p>` : ''}</aside>`;
    case 'chart-block': return renderChart(block);
    case 'oneshot-svg': return `<figure class="oneshot-svg-figure">${block.markup}</figure>`;
  }
}

export function decodeArticleBlock(source, location = 'Bloque editorial') {
  if (source.length > MAX_BLOCK_CHARS) throw new Error(`${location}: el JSON supera el límite de ${MAX_BLOCK_CHARS} caracteres.`);
  let raw;
  try { raw = JSON.parse(source); } catch (error) { throw new Error(`${location}: JSON no válido (${error.message}).`); }
  return validateArticleBlock(raw);
}

function scanArticleBlocks(markdown) {
  const source = String(markdown); const blocks = [];
  const opener = /(^|\n)([ \t]*)```(oneshot|tactic-comparison|tactic|stats|insight|chart|source-note|oneshot-svg)(?:[ \t]+[^\r\n]*)?[ \t]*\r?\n/gm;
  let match;
  while ((match = opener.exec(source))) {
    const start = match.index + match[1].length;
    const bodyStart = opener.lastIndex;
    const line = source.slice(0, start).split(/\r?\n/).length;
    const closing = /^[ \t]*```[ \t]*\r?$/gm;
    closing.lastIndex = bodyStart;
    const close = closing.exec(source);
    if (!close) {
      blocks.push({ start, end: source.length, line, error: `Bloque ONE SHOT · línea ${line}: falta cerrar la cerca con tres acentos graves.` });
      break;
    }
    const endOfFence = close.index + close[0].length;
    const end = source[endOfFence] === '\n' ? endOfFence + 1 : endOfFence;
    const json = source.slice(bodyStart, close.index).replace(/\r?\n$/, '');
    try { blocks.push({ start, end, line, language: match[3], block: decodeEnrichedBlock(match[3], json, `Bloque ${match[3]} · línea ${line}`) }); }
    catch (error) { blocks.push({ start, end, line, language: match[3], error: error.message }); }
    opener.lastIndex = end;
  }
  return blocks;
}

export function validateArticleBlocks(markdown) {
  const blocks = scanArticleBlocks(markdown);
  const invalid = blocks.find((item) => item.error);
  if (invalid) { const error = new Error(invalid.error); error.status = 400; throw error; }
  return blocks;
}

export function stripArticleBlocks(markdown) {
  const source = String(markdown); const blocks = validateArticleBlocks(source); let text = ''; let last = 0;
  for (const block of blocks) { text += source.slice(last, block.start); last = block.end; }
  return `${text}${source.slice(last)}`.replace(/\n{3,}/g, '\n\n').trim();
}

export function renderMarkdownBlocks(markdown, renderPlain, options = {}) {
  const source = String(markdown); const blocks = scanArticleBlocks(source); let result = ''; let last = 0;
  for (const item of blocks) {
    result += renderPlain(source.slice(last, item.start).trim());
    result += item.error
      ? `<aside class="block-config-error" role="alert"><strong>Bloque ${escapeHtml(item.language || 'editorial')} no válido · línea ${item.line}</strong><p>${escapeHtml(item.error)}</p></aside>`
      : renderArticleBlock(item.block, options);
    last = item.end;
  }
  result += renderPlain(source.slice(last).trim());
  return result;
}

function renderInlineMarkdown(source) {
  let value = escapeHtml(source);
  value = value.replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>').replace(/_(.+?)_/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\((https:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  return value;
}

export function renderPlainMarkdown(markdown) {
  const source = String(markdown ?? '').trim();
  if (!source) return '';
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const output = []; let paragraph = []; let listType = ''; let listItems = []; let quote = [];
  const flushParagraph = () => { if (paragraph.length) { output.push(`<p>${renderInlineMarkdown(paragraph.join('\n')).replace(/\n/g, '<br>')}</p>`); paragraph = []; } };
  const flushList = () => { if (listItems.length) { output.push(`<${listType}>${listItems.map((item) => `<li>${renderInlineMarkdown(item)}</li>`).join('')}</${listType}>`); listItems = []; listType = ''; } };
  const flushQuote = () => { if (quote.length) { output.push(`<blockquote>${quote.map((line) => `<p>${renderInlineMarkdown(line)}</p>`).join('')}</blockquote>`); quote = []; } };
  for (let index = 0; index < lines.length;) {
    const line = lines[index];
    const fence = line.match(/^\s*```([^\s`]*)\s*$/);
    if (fence) {
      flushParagraph(); flushList(); flushQuote(); const code = []; index++;
      while (index < lines.length && !/^\s*```\s*$/.test(lines[index])) code.push(lines[index++]);
      if (index < lines.length) index++;
      output.push(`<pre><code${fence[1] ? ` class="language-${escapeHtml(fence[1])}"` : ''}>${escapeHtml(code.join('\n'))}</code></pre>`); continue;
    }
    const heading = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (heading) { flushParagraph(); flushList(); flushQuote(); const level = heading[1].length; output.push(`<h${level}>${renderInlineMarkdown(heading[2])}</h${level}>`); index++; continue; }
    const quoteMatch = line.match(/^\s*>\s?(.*)$/);
    if (quoteMatch) { flushParagraph(); flushList(); quote.push(quoteMatch[1]); index++; continue; }
    if (/^\s*$/.test(line)) { flushParagraph(); flushList(); flushQuote(); index++; continue; }
    const unordered = line.match(/^\s*[-*+]\s+(.+)$/); const ordered = line.match(/^\s*\d+[.)]\s+(.+)$/);
    if (unordered || ordered) { flushParagraph(); flushQuote(); const type = unordered ? 'ul' : 'ol'; if (listType && listType !== type) flushList(); listType = type; listItems.push((unordered || ordered)[1]); index++; continue; }
    flushList(); flushQuote(); paragraph.push(line); index++;
  }
  flushParagraph(); flushList(); flushQuote();
  return output.join('');
}

export function renderEnrichedMarkdown(markdown, options = {}) {
  return renderMarkdownBlocks(markdown, renderPlainMarkdown, options);
}
