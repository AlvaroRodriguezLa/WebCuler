# Bloques editoriales ONE SHOT

Los artículos siguen siendo Markdown. Para insertar un componente, coloca el cursor en el punto deseado del texto, usa **Insertar bloque** en Studio, configura el formulario y confirma. Se guarda una cerca `oneshot` con JSON, sin HTML manual ni JavaScript.

La forma general es:

````markdown
Párrafo anterior.

```oneshot
{"type":"editorial-callout","title":"La tesis","text":"Una idea importante."}
```

Párrafo posterior.
````

Astro convierte esos bloques en HTML y SVG estáticos durante la compilación. El validador compartido también se ejecuta en Studio antes de guardar/publicar. Los valores se escapan; los únicos enlaces admitidos en una nota son HTTPS. Un bloque mal formado detiene la publicación con el archivo, línea y campo que hay que corregir. Artículos antiguos sin bloques continúan usando el mismo flujo.

## Tipos

- `tactical-board`: título, formación, descripción, `players` con `name`, `role`, `x`, `y`; coordenadas numéricas normalizadas de 0 a 100. `connections` contiene parejas de nombres; `movements` pares `from`/`to`; `zones` rectángulos normalizados.
- `tactical-comparison`: `title`, `explanation`, y dos objetos de campo `left` y `right` con la misma forma que `tactical-board` sin el campo `type`.
- `stat-cards`: `title`, `stats` con `value`, `label` y `source` opcional; `note` opcional.
- `editorial-callout`: `text` y `title` opcional.
- `chart-block`: `chartType` (`bar`, `line` o `comparison`), `title`, `labels`, `series` (`name` + arreglo de `values` del mismo tamaño), y `source`/`note` opcionales.
- `source-note`: `source`, `url` HTTPS, `date` (`AAAA-MM-DD`), `description` y `methodology`; todos opcionales.

## Límites de validación

Se limitan la longitud de texto, cantidad de jugadores/series/valores y coordenadas para evitar diagramas fuera de campo y payloads excesivos. La previsualización del Studio usa el mismo módulo `public/article-blocks.mjs` que el plugin Remark del build y renderiza los SVG inmediatamente. En los campos tácticos, los marcadores pueden moverse por arrastre o por teclado (flechas; Mayús + flecha mueve cinco unidades), además de editar X/Y numéricamente.

**Cargar artículo de demostración** introduce «La vuelta al 4-3-3: por qué Flick debe recuperar el centro del campo». Los tres valores estadísticos son ficticios y llevan una advertencia explícita; el texto no cita fuentes inventadas. El ejemplo solo rellena el editor, no crea ni publica un artículo.
