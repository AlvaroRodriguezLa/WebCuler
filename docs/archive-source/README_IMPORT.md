# Migración editorial @ScarFace2824 — v1

Este paquete convierte el archivo oficial de X y las piezas visuales/PDF aportadas en contenido estructurado para la web.

## Qué he encontrado en el archivo de X

- Tweets totales: **2611**
- Periodo cubierto: **2025-04-25 → 2026-09-23**
- Publicaciones no-respuesta: **104**
- Publicaciones originales no-respuesta (sin RT): **88**
- Respuestas: **2507**
- Respuestas a hilos propios: **169**
- Publicaciones originales con medios: **59**

El archivo tiene muchísimo debate en respuestas. No he convertido cada respuesta en una página independiente: se conserva todo en `data/x_tweets_inventory.csv`, y las ideas sustanciales se han agrupado en artículos.

## Resultado editorial

- Artículos generados: **33**
- Canónicos / listos para revisar en la web: **27**
- Borradores ensamblados desde hilos de X: **6**

### Estructura

- `src/content/articles/` → Markdown listo para adaptar a Astro Content Collections.
- `public/images/articles/` → piezas visuales originales del archivo de X.
- `data/article_source_map.csv` → trazabilidad artículo ↔ tweets.
- `data/x_tweets_inventory.csv` → inventario completo de los 2611 tweets.
- `references/` → PDFs aportados como referencia visual.
- `docs/EDITORIAL_DECISIONS.md` → criterios de migración.

## Cómo importarlo

Puedes copiar:

`src/content/articles/` → `src/content/articles/` de tu proyecto Astro.

y:

`public/images/articles/` → `public/images/articles/`.

Los campos de frontmatter están pensados para el schema que definimos: título, slug, fecha, categoría, excerpt, draft, evergreen, featured, temporada, subject, imagen, tags, archive y trazabilidad a X.

## Criterio importante

Las piezas visuales/PDF ya publicadas se han tratado como **base canónica**.  
Los hilos se han convertido en artículos nuevos solo cuando contienen una idea suficientemente desarrollada y no son simple conversación.

No se han convertido automáticamente en artículos:
- RTs;
- respuestas coyunturales;
- discusiones personales;
- contenido ajeno al proyecto editorial de fútbol/Barça.

Nada se pierde: todo sigue inventariado en CSV.

## Publicaciones base canónicas verificadas

Consulta `docs/PUBLICACIONES_BASE_CANONICAS.md`.

Este documento es la fuente prioritaria para las piezas que el usuario va adjuntando como publicaciones ya cerradas.  
Cuando haya conflicto entre una reconstrucción previa y una publicación visual/PDF verificada, prevalece la publicación verificada.

El manifest machine-readable equivalente está en:

`data/published_base_manifest.json`

## Lote batch 3 incorporado

Se han añadido nuevas publicaciones visuales verificadas al documento maestro:
- Segundo Portero
- El nuevo Raphinha
- Red Flag
- Fichajes 2026-2027
- Tercer Central
- Pieza Clave
- Club Hermano
- Perfil Faltante
- No hay vuelta atrás
- El quinto Medio

Fuente principal actual:
`docs/PUBLICACIONES_BASE_CANONICAS.md`

## Nuevo lote canónico incorporado

Se han verificado mediante las publicaciones visuales adjuntas:
- Tomar Riesgos
- La Sorpresa
- El Tapado
- One Shot
- Solución en casa
- Cerrar Mercado

El documento que Codex debe usar como fuente prioritaria sigue siendo:
`docs/PUBLICACIONES_BASE_CANONICAS.md`
