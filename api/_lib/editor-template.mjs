export const editorHtml = `
<header class="studio-top">
  <a href="/" target="_blank" rel="noreferrer">ONE SHOT</a>
  <span>Studio / privado</span>
  <button id="logout" type="button">Cerrar sesión</button>
</header>
<div class="draft-bar"><label for="draft-list">Continuar un borrador
  <select id="draft-list"><option value="">Nuevo artículo</option></select>
</label></div>
<main class="studio-shell">
  <section class="editor-panel">
    <p class="eyebrow">Editor editorial</p>
    <h1>Una idea.<br />Un artículo.</h1>
    <p class="intro">Escribe desde el móvil o el ordenador. Guarda un borrador en GitHub o publícalo directamente.</p>
    <form id="article-form">
      <input type="hidden" name="slug" />
      <label>Título <input id="title" name="title" required maxlength="180" placeholder="El perfil que necesita el Barça" autocomplete="off" /></label>
      <label>Texto del artículo <textarea id="text" name="text" required maxlength="100000" placeholder="Escribe en Markdown. Se guardará con párrafos, subtítulos, listas y citas."></textarea></label>
      <div class="editorial-insert-tools"><span>Markdown enriquecido</span><button type="button" id="open-block-editor">Insertar bloque</button><button type="button" id="load-editorial-demo">Cargar artículo de demostración</button><label class="markdown-import">Importar .md<input type="file" id="markdown-import" accept=".md,text/markdown" /></label></div>
      <p class="editorial-insert-hint">Los bloques se guardan dentro del Markdown y aparecen en ese mismo punto del artículo.</p>
      <section class="player-asset-manager" aria-labelledby="player-photos-title">
        <label class="player-photos-toggle"><input id="show-player-photos" name="showPlayerPhotos" value="true" type="checkbox" /> <span id="player-photos-title">Mostrar fotografías de jugadores</span></label>
        <div id="player-photos-panel" hidden>
          <p>Se analizan los bloques tácticos con <code>playerAppearance: "portrait"</code>. Cada fotografía se guarda una vez en la biblioteca y se puede reutilizar.</p>
          <label>Procedencia de las fotografías subidas <input id="player-photo-source" maxlength="240" placeholder="Ej.: archivo personal con permiso del autor" /></label>
          <label class="player-photo-consent"><input id="player-photo-consent" type="checkbox" /> Confirmo que tengo permiso para publicar estas fotografías en ONE SHOT.</label>
          <p id="player-photos-status" class="player-assets-status" role="status" aria-live="polite"></p>
          <div id="player-assets-list" class="player-assets-list"></div>
        </div>
      </section>
      <div class="toolbar" aria-label="Formato Markdown">
        <button type="button" data-wrap="**" aria-label="Negrita">Negrita</button>
        <button type="button" data-wrap="*" aria-label="Cursiva">Cursiva</button>
        <button type="button" data-prefix="## ">Subtítulo</button>
        <button type="button" data-prefix="> ">Cita</button>
        <button type="button" data-link="true">Enlace</button>
      </div>
      <label class="dropzone" id="dropzone">Imagen de portada
        <input id="image" name="image" type="file" accept="image/png,image/jpeg,image/webp" />
        <span id="image-prompt">Toca para elegir una imagen<br /><small>PNG, JPG o WebP. Se optimiza al guardar.</small></span>
      </label>
      <div class="file-name" id="file-name">No hay imagen seleccionada</div>
      <details><summary>Opciones del artículo</summary><div class="advanced-grid">
        <label>Categoría <select name="category"><option>Análisis</option><option>Identidad Barça</option><option>Táctica y encaje</option><option>Perfiles de jugador</option><option>Historia</option><option>Construcción de plantilla</option><option>Mercado</option></select></label>
        <label>Subtítulo <input name="subtitle" maxlength="200" /></label>
        <label>Jugador / tema <input name="subject" maxlength="120" /></label>
        <label>Temporada <input name="season" placeholder="2026-2027" maxlength="30" /></label>
        <label>Fecha <input name="date" type="date" /></label>
        <label>Etiquetas <input name="tags" placeholder="táctica, Barça" maxlength="240" /></label>
        <label>Ajuste de imagen <select name="imageFit"><option value="contain">Mostrar imagen completa</option><option value="cover">Recortar para cubrir</option></select></label>
        <label>Posición de imagen <select name="imagePosition"><option value="center">Centro</option><option value="top">Arriba</option><option value="bottom">Abajo</option><option value="left">Izquierda</option><option value="right">Derecha</option><option value="center top">Centro arriba</option><option value="center bottom">Centro abajo</option><option value="left center">Izquierda centro</option><option value="right center">Derecha centro</option></select></label>
        <label class="wide">Extracto <textarea name="excerpt" rows="3" maxlength="500" placeholder="Si lo dejas vacío, se crea a partir del texto."></textarea></label>
        <label class="wide">Texto alternativo de imagen <input name="imageAlt" maxlength="240" placeholder="Describe brevemente la imagen" /></label>
        <label class="wide">Archivo de temporada <input name="archive" placeholder="mercado-2026-27" maxlength="80" /></label>
        <label class="check"><input name="featured" type="checkbox" /> Artículo destacado</label>
        <label class="check"><input name="evergreen" type="checkbox" /> Idea permanente</label>
      </div></details>
      <div class="actions"><button class="secondary" type="button" id="save-draft">GUARDAR BORRADOR</button><button class="primary" type="button" id="publish">PUBLICAR ARTÍCULO</button></div>
      <p class="status" id="status" role="status" aria-live="polite"></p>
    </form>
    <dialog id="article-block-dialog" class="article-block-dialog" aria-labelledby="block-dialog-title">
      <div class="block-dialog-head"><div><p class="eyebrow">ONE SHOT / componentes</p><h2 id="block-dialog-title">Insertar bloque editorial</h2></div><button type="button" id="close-block-dialog" aria-label="Cerrar">×</button></div>
      <label>Tipo de bloque<select id="article-block-type"><option value="tactical-board">Campo táctico</option><option value="tactical-comparison">Comparativa táctica</option><option value="stat-cards">Tarjetas estadísticas</option><option value="editorial-callout">Tesis destacada</option><option value="chart-block">Gráfico</option><option value="source-note">Fuente o nota</option></select></label>
      <div id="article-block-form"></div><p id="article-block-error" class="block-form-error" role="alert" hidden></p><div id="article-block-preview" class="block-form-preview"></div>
      <div class="block-dialog-actions"><button type="button" id="cancel-block-editor">Cancelar</button><button type="button" id="insert-article-block">Insertar en el texto</button></div>
    </dialog>
  </section>
  <section class="preview-panel">
    <div class="preview-toolbar"><span>Vista previa</span><div><button class="device active" data-device="desktop">Escritorio</button><button class="device" data-device="mobile">Móvil</button></div></div>
    <p id="preview-runtime-error" class="block-config-error preview-runtime-error" role="alert" hidden></p>
    <div class="preview-wrap desktop" id="preview-wrap"><article class="preview-page" id="preview"></article></div>
  </section>
</main>
<script>
  (() => {
    const showError = (detail) => {
      const box = document.querySelector('#preview-runtime-error');
      if (!box) return;
      box.hidden = false;
      box.textContent = 'La preview no pudo iniciarse. ' + String(detail || 'Recarga el Studio; si persiste, comparte este mensaje con soporte.').slice(0, 240);
    };
    window.addEventListener('error', (event) => { if (event.message || event.target?.tagName === 'SCRIPT') showError(event.message || event.target?.src || 'No se pudo cargar el editor.'); }, true);
    window.addEventListener('unhandledrejection', (event) => showError(event.reason?.message || event.reason), true);
    window.setTimeout(() => { if (document.documentElement.dataset.studioClientReady !== 'true') showError('El editor no terminó de cargar en 8 segundos.'); }, 8000);
  })();
</script>
`;
