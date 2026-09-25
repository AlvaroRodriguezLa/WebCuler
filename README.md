# ONE SHOT

Publicación editorial personal sobre fútbol, identidad Barça, táctica y construcción de equipos. La web pública se genera como HTML estático con Astro y Markdown. El Studio de publicación está disponible en localhost y en el despliegue privado de Vercel.

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

La navegación editorial está en `4321`; `4322` es únicamente el Studio de publicación y no contiene las secciones de la web pública.

### Abrir el Studio desde el móvil

Conecta el móvil y el ordenador a la misma Wi-Fi y ejecuta `npm run studio`. La terminal mostrará una dirección como `http://192.168.1.25:4322`; abre esa dirección desde el móvil. Si Windows muestra una alerta del Firewall, permite Node.js únicamente en redes privadas. No uses esta dirección en una Wi-Fi pública: el Studio permite guardar archivos y ejecutar acciones Git en el ordenador.

1. Escribe el título.
2. Pega el texto en Markdown.
3. Arrastra una imagen PNG, JPG o WebP.
4. Comprueba la preview Desktop/Móvil.
5. Pulsa **GUARDAR BORRADOR** para guardar sin publicar, o **PUBLICAR Y ENVIAR A GIT** para crear el artículo, hacer commit y ejecutar `git push` tras una confirmación visible.
6. Abre la URL que muestra el Studio.

El Studio crea slug, fecha, extracto, tiempo estimado, frontmatter, imagen optimizada, copia original, metadata SEO, OpenGraph, registro de home y categoría. Si Git falla, el contenido permanece guardado y el Studio muestra el comando pendiente.

Antes de publicar por primera vez, configura la identidad de Git una sola vez:

```powershell
git config --global user.name "Tu nombre"
git config --global user.email "tu@email.com"
```

## Comandos de comprobación

```bash
npm run check
npm run build
npm run test
```

## Archivo histórico

Las 24 publicaciones verificadas de X y otros artículos ya preparados viven en la colección Astro. El manifest, el inventario y las imágenes originales se conservan como fuentes editoriales. Para importar otro lote sin duplicar ni sobrescribir silenciosamente, consulta [docs/ARCHIVE_IMPORT.md](docs/ARCHIVE_IMPORT.md); el modelo de campos y categorías está en [docs/CONTENT_MODEL.md](docs/CONTENT_MODEL.md).

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
