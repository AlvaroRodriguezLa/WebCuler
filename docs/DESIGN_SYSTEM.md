# Sistema de diseño

## Observación de la referencia

La referencia `Black Beige Minimalist Photography Portfolio Cover Page (10).pdf` es una lámina A4 con fondo gris-hueso cálido, texto casi negro, un titular sans-serif sobredimensionado y muy compacto, y una división vertical fina que separa una columna de lectura izquierda de una columna visual derecha. La imagen ocupa la parte alta de la columna derecha; debajo hay una regla horizontal, metadata en mayúsculas con tracking amplio y el año en un tamaño más contenido.

La composición no depende de cajas, sombras, gradientes ni tarjetas. El espacio vacío, la regla y la relación texto/imagen hacen el trabajo editorial. El sitio mantiene esa lógica pero permite que el artículo crezca sin estar limitado a una página.

## Tokens

```css
--paper: #e7e5df;
--paper-deep: #d8d5ce;
--ink: #20201f;
--muted: #65645f;
--rule: #898780;
--accent: #8c201d;
--max-width: 1440px;
--article-gap: clamp(2rem, 5vw, 6.5rem);
--headline-size: clamp(4rem, 8vw, 8rem);
--body-size: 1.12rem;
```

Son aproximaciones visuales extraídas de la referencia, no una medición de color de producción. La tipografía usa una pila sans-serif del sistema para mantener el build independiente de servicios externos.

## Reglas de composición

- Home: portada editorial, artículo destacado y secciones; el mercado vive más abajo y en un archivo propio.
- Artículo desktop: grid aproximadamente 60/40, divisor vertical y columna visual sticky.
- Artículo móvil: título, imagen, metadata y texto en ese orden; la columna visual deja de ser sticky.
- Imágenes: `contain` por defecto para no destruir posters o textos; `cover` solo cuando se elige expresamente.
- Metadata: mayúsculas, tamaño pequeño y tracking amplio; subject y season se omiten si no existen.
- Controles: reglas finas y botones tipográficos, sin estética de dashboard.
