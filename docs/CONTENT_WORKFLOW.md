# Flujo de contenido

## Desde el Studio

`npm run studio` inicia Astro en `127.0.0.1:4321` y el publisher independiente en `127.0.0.1:4322`. El Studio acepta título, texto Markdown e imagen como únicos campos obligatorios. `Opciones avanzadas` añade categoría, subtítulo, subject, temporada, fecha, excerpt, alt, tags, featured, evergreen, draft e imagen.

Al guardar:

- el slug se deriva del título y elimina acentos;
- el artículo se escribe en `src/content/articles/<slug>.md`;
- la imagen original se conserva en `src/content/media/<slug>/original.*`;
- se crea una WebP para servirla desde `public/uploads/`;
- el excerpt y el tiempo de lectura se calculan de forma determinista;
- el build crea una imagen social PNG de 1200×630 en `public/social/`.

Guardar borrador deja `draft: true`, por lo que no aparece en páginas públicas ni en el sitemap. Publicar fuerza `draft: false`, pide confirmación y ejecuta `git add`, `git commit` y `git push` con argumentos separados. No hay concatenación de input del usuario en un shell.

## Markdown admitido

Astro renderiza negrita, cursiva, links, listas, subtítulos y blockquotes. El Studio incluye accesos rápidos para insertar los cinco formatos más frecuentes y una preview en Desktop/Móvil.

## Categorías

La categoría por defecto es `Análisis`. Las categorías editoriales se resuelven en `src/config/site.ts`; añadir una categoría nueva requiere añadir su configuración de navegación y su ruta estática.
