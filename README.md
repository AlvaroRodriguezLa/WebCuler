# ONE SHOT

Publicación editorial personal sobre fútbol, identidad Barça, táctica y construcción de equipos. La web pública se genera como HTML estático con Astro y Markdown; el Studio de publicación solo existe en localhost.

## PUBLICAR UN ARTÍCULO

Primera vez:

```bash
npm install
```

Uso habitual:

```bash
npm run studio
```

Se abrirán dos servicios locales. Abre [http://127.0.0.1:4322](http://127.0.0.1:4322) para el Studio y [http://127.0.0.1:4321](http://127.0.0.1:4321) para la web.

1. Escribe el título.
2. Pega el texto en Markdown.
3. Arrastra una imagen PNG, JPG o WebP.
4. Comprueba la preview Desktop/Móvil.
5. Pulsa **GUARDAR BORRADOR** para guardar sin publicar, o **PUBLICAR Y ENVIAR A GIT** para crear el artículo, hacer commit y ejecutar `git push` tras una confirmación visible.
6. Abre la URL que muestra el Studio.

El Studio crea slug, fecha, extracto, tiempo estimado, frontmatter, imagen optimizada, copia original, metadata SEO, OpenGraph, registro de home y categoría. Si Git falla, el contenido permanece guardado y el Studio muestra el comando pendiente.

## Comandos de comprobación

```bash
npm run check
npm run build
npm run test
```

## Publicar gratis en GitHub Pages

1. Crea un repositorio y sube el proyecto a la rama `main`.
2. En GitHub, abre **Settings → Pages → Source: GitHub Actions**.
3. Edita `.github/workflows/deploy.yml` y deja `BASE_PATH` vacío si el repositorio es `usuario.github.io`; para un repositorio de proyecto, usa `/${{ github.event.repository.name }}`.
4. En el siguiente push a `main`, GitHub instala, valida, compila y despliega.

Para dominio propio o repositorio de usuario, ajusta `PUBLIC_SITE_URL` en el workflow. No hay backend de producción ni base de datos.

## Documentación

- [Sistema de diseño](docs/DESIGN_SYSTEM.md)
- [Flujo de contenido](docs/CONTENT_WORKFLOW.md)
- [Arquitectura](docs/ARCHITECTURE.md)

## Alcance actual

El artículo de prueba `Cerrar el Mercado` usa un placeholder editorial porque el PDF de referencia no permite extraer limpiamente el poster derecho sin hacer un recorte destructivo. Sustitúyelo desde el Studio cuando tengas la imagen final.
