# Importar el archivo editorial

El corpus canónico vive en `docs/PUBLICACIONES_BASE_CANONICAS.md` y su índice estructurado en `data/published_base_manifest.json`. El importador acepta tanto el ZIP completo como una carpeta extraída con la misma estructura.

## Importar otro lote

1. Añade el lote nuevo en una carpeta con `data/published_base_manifest.json`, `docs/PUBLICACIONES_BASE_CANONICAS.md`, sus Markdown preparados en `src/content/articles/` y los assets en `references/` o `public/`. Conserva los nombres y slugs ya publicados.
2. Ejecuta `npm run import:archive -- "C:\ruta\al\lote.zip"` o pasa la carpeta extraída, por ejemplo `npm run import:archive -- ./migration`.
3. Revisa el resumen. Comprueba cada `CONFLICT` y `WARNING`; los conflictos quedan intactos o con una copia de seguridad en `data/archive-import-conflicts/`. El importador preserva las fuentes en `data/archive-source/`, `data/`, `docs/` y `references/`.
4. Ejecuta `npm run check`, `npm run build` y `npm run test`. Revisa los artículos nuevos en la web local y en móvil antes de publicar.
5. Revisa el diff, haz commit y push siguiendo el flujo normal del repositorio. El importador no hace commit ni push.

## Criterios de seguridad editorial

- Solo se publican entradas `canonical: true` y `published_base: true` del manifest y artículos preparados con `draft: false`.
- El cuerpo de una pieza canónica se toma del documento maestro. Si difiere del manifest, se conserva el texto maestro y se informa.
- Los borradores se guardan como material de referencia, fuera de `src/content/articles/`; no generan páginas públicas ni tarjetas sociales.
- El slug identifica primero una publicación; los `sourceTweetIds` ayudan a reconocer una pieza ya presente con otra URL. Los duplicados idénticos conservan la URL anterior como redirección.
- Si un slug canónico choca con una reconstrucción no canónica, la reconstrucción se copia íntegra a `data/archive-import-conflicts/` antes de que prevalezca la fuente canónica. Una pieza canónica ya editada localmente no se sobrescribe: el importador informa del conflicto.
- Los assets se copian sin reemplazar archivos distintos. Si no hay una cover limpia, se usa la visual original completa como último recurso, con `contain`; nunca se recorta automáticamente.
- El inventario completo de X y el mapa de fuentes son datos de referencia, no una orden para convertir cada tweet en artículo.

## Comprobación rápida

```powershell
npm run import:archive -- .\migration
npm run check
npm run build
npm run test
```

Después de importar, comprueba la cantidad y los avisos que imprime el importador, busca slugs repetidos, revisa `Archivo → Mercado 2026/27` y confirma que las tarjetas y páginas de los artículos cargan sus imágenes.
