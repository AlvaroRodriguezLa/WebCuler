# ONE SHOT Enriched Markdown v1

El artículo completo se pega en **TEXTO** como Markdown normal más los bloques de código descritos aquí. Puede empezar por `TITULO: ...`; Studio lo pasa al campo Título y elimina solo esa línea. El resto de referencias y bloques se conserva sin reescritura.

## Fotos: activación por artículo

El control **Mostrar fotografías de jugadores** es un metadato del artículo (`showPlayerPhotos`), independiente del Markdown y apagado por defecto. Cuando está apagado, todos los campos muestran marcadores, aunque el bloque pida retratos. Cuando está activo, solo se muestran fotografías en campos con `playerAppearance: "portrait"` y jugadores con `assetKey` presente en el catálogo aprobado. `playerAppearance: "marker"` siempre conserva marcadores. Un retrato ausente o archivado también cae a marcador; se puede guardar y publicar.

La preview y Astro comparten `public/article-blocks.mjs`. La foto no se inserta ni se descarga al pegar Markdown; el Studio analiza `tactic` y ambos lados de `tactic-comparison` y gestiona la biblioteca de forma independiente. Los artículos antiguos no tienen `showPlayerPhotos` y, por tanto, conservan el modo marcador.

## Markdown permitido

CommonMark: párrafos, encabezados, listas, citas, negrita, cursiva, código y enlaces HTTPS. Bloques de cercas: `tactic`, `tactic-comparison`, `stats`, `insight`, `chart`, `source-note`, `oneshot-svg`; los bloques heredados `oneshot` siguen funcionando. Los objetos JSON usan `schemaVersion: 1`, comillas dobles y sin comentarios/comas finales. No uses HTML ni JavaScript arbitrario.

Un bloque mal configurado conserva el resto del contenido en preview y muestra el error junto al bloque; el guardado/publicación lo rechaza con una explicación.

## Contrato táctico

`tactic` requiere `schemaVersion: 1`, `players` y coordenadas numéricas de 0 a 100. Los jugadores requieren `id`, `name`, `x`, `y`; `role`, `assetKey` y `portraitScale` son opcionales. `assetKey` usa el ID real `tm:<número>` de `data/player-assets-manifest.json`, por ejemplo `tm:357565` para Rodri. No se resuelve por nombre y no es una ruta ni acredita derechos.

`playerAppearance` admite `marker` o `portrait` y por defecto es `marker`. `portraitScale` admite 0.75–1.5. `connections` enlaza IDs existentes, `movements` usa pares de coordenadas y `zones` rectángulos dentro del campo. `tactic-comparison` tiene `left` y `right` con el mismo esquema de tablero.

Las tarjetas `stats` requieren de 1 a 8 items (`value`, `label`, descripción opcional). `insight` requiere `text`. `chart` acepta `bar`, `line`, `comparison`, etiquetas y series numéricas. `source-note` acepta nombre, URL HTTPS, fecha, descripción y metodología. Nunca inventes fuentes o métricas.

`oneshot-svg` admite SVG geométrico saneado; no acepta `<image>`, `href`, scripts, manejadores, CSS, `url(...)` ni recursos externos. Para retratos usa siempre `assetKey` en un bloque táctico.

## Biblioteca de imágenes

Las imágenes se suben manualmente desde el Studio alojado, tras activar **Mostrar fotografías de jugadores**. El administrador elige PNG/JPG/WebP de hasta 2,8 MB, indica procedencia y confirma que tiene permiso de publicación. El servidor valida contenido real, dimensiones y tipo, sube a Vercel Blob y actualiza `data/player-assets-approved.json` usando la sesión GitHub ya autenticada. El Markdown no cambia.

Los recursos Blob son públicos porque la web pública debe poder mostrarlos; el token de escritura permanece en el servidor. La biblioteca usa rutas inmutables con hash y se publica mediante el build. Archivar una imagen la quita de los siguientes builds, conserva sus bytes para no romper despliegues anteriores y hace que los artículos vuelvan al marcador.

No se importan ni se descargan automáticamente URL de Transfermarkt. El catálogo inicial de fotos está vacío: solo las imágenes que subas y para las que confirmes permiso se publican. Véanse [guía de fotos](PLAYER_ASSETS_FOR_CHATGPT.md) y [auditoría PORTOFOLIO](PORTOFOLIO_PLAYER_IMAGES_AUDIT.md).

## Ejemplo táctico

```tactic
{
  "schemaVersion": 1,
  "title": "Centro del campo",
  "playerAppearance": "portrait",
  "players": [
    {"id":"rodri","name":"Rodri","role":"Mediocentro","assetKey":"tm:357565","x":50,"y":78},
    {"id":"pedri","name":"Pedri","role":"Interior","assetKey":"tm:683840","x":31,"y":54},
    {"id":"gavi","name":"Gavi","role":"Interior","assetKey":"tm:646740","x":69,"y":54}
  ],
  "connections": [{"from":"rodri","to":"pedri","style":"dashed"}]
}
```

Con el interruptor apagado, este ejemplo usa marcadores. Con el interruptor activo, mostrará los retratos que estén cargados y autorizados en la biblioteca.
