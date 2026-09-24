# Arquitectura

## Producción

- Astro con `output: static`.
- Astro Content Collections tipadas en `src/content.config.ts`.
- Markdown en `src/content/articles/`.
- Rutas estáticas para home, artículos, categorías, archivo y mercado 2026/27.
- Sitemap, robots.txt, RSS, canonical y metadata OpenGraph/Twitter.
- GitHub Actions en `.github/workflows/deploy.yml`.

## Publicación local

`studio/server.mjs` es un servidor Node independiente. Sirve la interfaz en localhost, lanza el servidor Astro y expone únicamente un POST local para recibir el formulario multipart. No se incorpora ningún endpoint dinámico al build de producción.

Las operaciones Git usan `execFile` con arrays de argumentos. La imagen original y el Markdown se escriben antes de intentar commit/push; por eso un fallo de configuración remota no pierde el artículo.

## Social cards

`scripts/generate-social-cards.mjs` lee el frontmatter y crea cards PNG deterministas con Sharp durante `prebuild`. Cada artículo enlaza su card desde `BaseLayout.astro`; no hay servicio de pago ni dependencia externa.

## Decisiones deliberadas

- No hay base de datos, autenticación ni backend público.
- No hay dashboard ni componentes SaaS; la UI sigue el lenguaje de la referencia.
- Las imágenes del Studio no se recortan por defecto.
