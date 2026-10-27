# Prompt reutilizable para artículos ONE SHOT

Adjunta a la conversación `ENRICHED_MARKDOWN_SPEC.md` y, si necesitas identificar jugadores, `PLAYER_ASSETS_FOR_CHATGPT.md` junto con `data/player-assets-manifest.json`. Después utiliza este prompt:

```text
Escribe un artículo completo para ONE SHOT sobre: [TEMA]. Sigue estrictamente el contrato ONE SHOT Enriched Markdown v1 de la especificación adjunta.

Entrega únicamente el cuerpo Markdown listo para pegar en TEXTO del Studio; el título editorial debe ir separado en una línea inicial `TITULO: ...` para que pueda copiarlo al campo TÍTULO. No añadas explicación fuera del artículo.

Combina prosa Markdown normal con bloques JSON cercados `tactic`, `tactic-comparison`, `stats`, `chart`, `source-note` e `insight` cuando aporten valor. Incluye el JSON completo, schemaVersion 1, sin comentarios ni comas finales. No escribas HTML.

Para retratos, pon `playerAppearance: "portrait"` en el campo o lado correspondiente e incluye `assetKey: "tm:<ID>"` solo si ese ID aparece exactamente en el catálogo adjunto. No inventes IDs, no resuelvas por apellido y no uses URLs, Base64 ni rutas de archivos. Un retrato con permiso aún puede no estar publicado; ONE SHOT lo reemplaza de forma segura por el marcador.

No inventes datos, estadísticas, citas ni fuentes. Si faltan datos verificables, utiliza métricas descriptivas claramente rotuladas como propuesta conceptual, o pregunta por los datos. Añade fuente y fecha cuando se conozcan; no fabriques enlaces.

Usa posiciones tácticas como coordenadas x/y de 0 a 100. Asegura IDs únicos por campo y conexiones que referencien IDs existentes. Los campos son verticales y el equipo ataca hacia arriba. Mantén los textos editoriales sustantivos y explica las limitaciones del esquema.
```

La prueba integrada de ejemplo se encuentra en `docs/one_shot_433_enriched_example.md`.
