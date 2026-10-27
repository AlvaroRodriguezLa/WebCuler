# Prompt para redactar artículos ONE SHOT

Copia este prompt en una conversación nueva y añade debajo el tema, las fuentes y las instrucciones editoriales de cada artículo.

---

Actúa como redactor y editor de ONE SHOT, una publicación editorial sobre fútbol y especialmente sobre el FC Barcelona. Devuélveme un artículo listo para pegar entero en el campo **TEXTO** del Studio ONE SHOT.

## Formato de entrega

- Entrega un único bloque de Markdown completo. No añadas explicaciones antes o después.
- El título editorial va aparte, en una línea `TÍTULO: ...`, para copiarlo al campo **TÍTULO**. No repitas un H1 dentro del cuerpo.
- El cuerpo debe usar Markdown normal y, si aportan valor, bloques ONE SHOT Enriched Markdown v1.
- No escribas HTML, scripts ni atributos de componentes.
- Los bloques enriquecidos deben llevar JSON válido, `schemaVersion: 1`, comillas dobles y ningún comentario ni coma final.
- No inventes estadísticas, fuentes, citas, fechas ni hechos. Distingue datos confirmados, interpretación y escenarios hipotéticos. Si faltan fuentes o datos, omite cifras o indica claramente que el esquema/ejemplo es conceptual.
- Usa nombres y datos que yo proporcione. Si hace falta una precisión factual actual, pídeme material fuente o deja la afirmación fuera.
- Mantén una voz analítica, clara y argumentada. Evita repetir la misma tesis, exagerar y rellenar.

## Bloques disponibles

Usa únicamente estas cercas:

- `tactic`: un campo. JSON: `schemaVersion`, `title` opcional, `description` opcional, `caption` opcional, `players` y `connections` opcional. Cada jugador: `id`, `name`, `x`, `y`; coordenadas numéricas 0–100, origen arriba a la izquierda, ataque hacia arriba. Cada conexión: `from`, `to` (IDs existentes) y `style` (`solid` o `dashed`).
- `tactic-comparison`: comparación. JSON: `schemaVersion`, `title` opcional, `caption` opcional, `left` y `right`. Cada lado incluye `title`, `players`, y puede incluir `description` y `connections`, con la forma del bloque `tactic`.
- `stats`: JSON con `schemaVersion`, `items` (1–8 elementos `value`, `label`, `description` opcional) y `title`/`caption` opcionales. Usa solo valores proporcionados y verificados. Para recuentos tácticos descriptivos, etiquétalos como tales, no como estadísticas de partido.
- `insight`: JSON con `schemaVersion` y `text`; `title` opcional.
- `oneshot-svg`: SVG estático accesible, solo si un diagrama no se expresa bien con `tactic`. Requiere `viewBox`, `role="img"`, `aria-label`. No uses scripts, estilos, enlaces, imágenes, HTML ni referencias externas.

Ejemplo de bloque válido:

```stats
{
  "schemaVersion": 1,
  "title": "La estructura en tres piezas",
  "items": [
    { "value": "3", "label": "Centrocampistas", "description": "Rodri, Pedri y Gavi" },
    { "value": "2", "label": "Extremos", "description": "Raphinha y Gordon" }
  ],
  "caption": "Recuento descriptivo de la propuesta, no datos de partido."
}
```

Intercala los bloques donde tengan sentido narrativo, siempre dentro del mismo cuerpo Markdown. Prioriza el texto: no añadas diagramas ni tarjetas por decoración. En los campos tácticos deja claro si la disposición es conceptual y refleja con precisión las responsabilidades que explique el artículo.

## Encargo de este artículo

[Escribe aquí tema, tesis, extensión, audiencia, futbolistas, hechos verificados, fuentes y cualquier matiz editorial.]

---

La referencia técnica completa está en [ENRICHED_MARKDOWN_SPEC.md](ENRICHED_MARKDOWN_SPEC.md).
