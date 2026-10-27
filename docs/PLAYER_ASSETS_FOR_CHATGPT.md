# Fotografías de jugadores para ChatGPT y ONE SHOT

## IDs disponibles

`data/player-assets-manifest.json` exporta nombres y claves estables desde el lookup de PORTOFOLIO; no contiene URLs de imagen. Ejemplos verificados:

| Jugador | `assetKey` |
|---|---|
| Rodri | `tm:357565` |
| Pedri | `tm:683840` |
| Gavi | `tm:646740` |
| Raphinha | `tm:411295` |
| Lamine Yamal | `tm:937958` |
| Anthony Gordon | `tm:503733` |
| Fermín López | `tm:636703` |

Los IDs identifican perfiles de PORTOFOLIO. No implican que ONE SHOT tenga una foto ni conceden autorización para publicarla. El catálogo de fotografías activas de ONE SHOT comienza vacío. Las referencias de Transfermarkt no son republicables según la auditoría; ONE SHOT no las descarga ni las enlaza.

## Cómo incorporar una foto

1. Pega el artículo en ONE SHOT Studio.
2. Activa **Mostrar fotografías de jugadores**. Studio analiza solo los bloques `tactic` y `tactic-comparison` con `playerAppearance: "portrait"` y muestra cada ID detectado.
3. Para cada foto ausente, selecciona un archivo PNG, JPG o WebP de hasta 2,8 MB.
4. Escribe la procedencia (por ejemplo, archivo propio autorizado) y marca la confirmación de que tienes permiso para publicarla en ONE SHOT.
5. Pulsa **Subir foto**. La foto queda asociada al ID y reutilizable en artículos futuros. Para sustituir, sube la nueva imagen desde la fila del mismo jugador. **Archivar** la retira de futuros builds; la foto anterior se conserva en Blob para no romper versiones ya desplegadas.
6. Guarda o publica el artículo por el flujo habitual. El commit del catálogo y el del artículo activan el build estático conectado.

No hace falta cargar la imagen en cada artículo, editar el Markdown, introducir URLs o modificar el repositorio desde Codex.

## Sintaxis de artículo

En cada campo táctico:

```json
{
  "schemaVersion": 1,
  "title": "Centro del campo",
  "playerAppearance": "portrait",
  "players": [
    {"id":"rodri","name":"Rodri","role":"Mediocentro","assetKey":"tm:357565","portraitScale":1,"x":50,"y":78},
    {"id":"pedri","name":"Pedri","role":"Interior","assetKey":"tm:683840","x":31,"y":54}
  ]
}
```

El interruptor del artículo está apagado por defecto y se guarda en frontmatter como `showPlayerPhotos: false/true`. Apagado: marcadores. Encendido: los bloques `marker` mantienen marcadores; solo los bloques `portrait` usan imágenes activas. Si falta una foto, no se bloquea la preview ni la publicación: el jugador usa marcador y Studio permite subirla.

`x` e `y` son porcentajes 0–100. `portraitScale` opcional va de 0,75 a 1,5. PNG transparente conserva su alpha; JPG/WebP opaco se ajusta dentro del retrato SVG. No pegues rutas de disco, URL remotas ni Base64 en el Markdown.

## Procedencia, permisos y almacenamiento

La fuente del retrato y la declaración del permiso se registran por imagen en el catálogo privado `data/player-assets-approved.json`, junto con ID, tipo MIME, dimensiones, SHA-256, fecha y autor de subida. La página pública recibe únicamente el ID y la URL pública de Vercel Blob aprobada. Las imágenes son públicamente descargables desde el CDN porque son parte de artículos públicos; el token de escritura Blob queda exclusivamente en el backend autenticado del Studio.

Vercel Blob requiere crear un store con acceso **Public** y asignar `BLOB_READ_WRITE_TOKEN` al proyecto de Studio en Production y Preview. La API comprueba la sesión GitHub ya existente y el usuario numérico permitido, y solo acepta archivos de imagen hasta 2,8 MB. Al fallar el commit de catálogo, el backend elimina el nuevo Blob como compensación. Al reemplazar o archivar no borra versiones anteriores para preservar los despliegues históricos.

La portada del artículo sigue su flujo actual de GitHub. Las fotos se guardan una sola vez en Blob; no se copian a cada artículo. El catálogo se versiona en GitHub, por lo que el workflow actual recompila la web estática y refleja altas, sustituciones y archivados.

## Si no existe un ID

No inventes un `assetKey`. Omítelo; el diagrama usa marcador. La persona administradora puede elegir una fotografía manualmente desde Studio únicamente si puede asociarla con seguridad al ID correcto y documentar el origen/permiso. Las fotos de Transfermarkt alojadas en el lookup PORTOFOLIO no se descargan ni se republican.
