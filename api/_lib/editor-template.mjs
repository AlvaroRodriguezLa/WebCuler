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
  </section>
  <section class="preview-panel">
    <div class="preview-toolbar"><span>Vista previa</span><div><button class="device active" data-device="desktop">Escritorio</button><button class="device" data-device="mobile">Móvil</button></div></div>
    <div class="preview-wrap desktop" id="preview-wrap"><article class="preview-page" id="preview"></article></div>
  </section>
</main>
`;
