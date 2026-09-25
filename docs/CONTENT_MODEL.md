# Modelo de contenido

ONE SHOT genera sus páginas desde Markdown con Astro Content Collections. Cada publicación pública tiene un archivo independiente en `src/content/articles/<slug>.md`.

## Campos editoriales

- `title`, `slug`, `date`, `category`, `excerpt`, `image`, `imageAlt` y `tags`: datos de página, navegación, accesibilidad y listados.
- `draft`: los borradores quedan excluidos de páginas, categorías, portada, archivo y tarjetas Open Graph.
- `evergreen` y `featured`: priorizan las ideas duraderas en portada; el destacado explícito tiene preferencia.
- `season`, `subject`, `readingTime`, `imageFit` e `imagePosition`: presentación y contexto editorial.
- `archive`: agrupa una pieza de actualidad, por ejemplo `mercado-2026-27`, en su archivo propio.
- `canonical` y `publishedBase`: indican que el texto procede de una publicación base verificada.
- `sourceTweetIds` y `sourceTweetUrls`: trazabilidad editorial a la publicación original.
- `legacyVisuals`: rutas a las láminas/PDF originales, conservadas para consulta al final del artículo.
- `redirectTo`: alias histórico de una URL anterior; emite una página de transición y no aparece como un artículo en portada o categorías.
- `migrationStatus`: estado de procedencia del registro.

## Categorías

La navegación está normalizada a Identidad, Táctica, Perfiles, Planificación, Plantilla, Cantera / La Masia, Partidos e Historia. Las variaciones existentes —por ejemplo, «Táctica y encaje» o «Construcción de plantilla»— se agrupan en una sola sección mediante `categorySlug()`. Mercado es un archivo editorial mediante `archive`, no una categoría duplicada.

## Imágenes y metadatos sociales

El artículo conserva su cover en `image`; las láminas originales quedan en `legacyVisuals`. El build crea una tarjeta Open Graph de 1200×630 por cada artículo público y añade canonical URL, Open Graph y Twitter/X card. El generador omite borradores y alias.

El manifest y el inventario de X están bajo `data/`, fuera de la colección Astro; no generan páginas públicas. Consulta [ARCHIVE_IMPORT.md](ARCHIVE_IMPORT.md) para ampliar el archivo sin duplicados.
