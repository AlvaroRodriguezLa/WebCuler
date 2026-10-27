export const demoArticle = {
  title: 'La vuelta al 4-3-3: por qué Flick debe recuperar el centro del campo',
  category: 'Táctica y encaje',
  subject: 'Estructura de ataque y control',
  season: '2026–2027',
  excerpt: 'Una estructura no debe alejar al Barça de su fútbol: debe devolverle el control del centro sin quitarle profundidad al ataque.',
  text: `La discusión sobre el dibujo suele empezar por los nombres y terminar en una pizarra. Para el Barça de Flick, la pregunta útil es otra: ¿cómo mantener amplitud y presión sin vaciar el centro?

Esta maqueta es un ejemplo editorial. Las posiciones representan una hipótesis táctica, no una alineación confirmada.

\x60\x60\x60oneshot
{
  "type": "tactical-comparison",
  "title": "Del doble pivote a un centro de tres",
  "explanation": "Dos estructuras hipotéticas para mostrar cómo cambian las alturas y las responsabilidades con balón.",
  "left": {
    "title": "AYER · extremos y mediapunta",
    "formation": "4-2-3-1",
    "description": "Raphinha ocupa la punta; Lamine y Gordon parten abiertos. Fermín juega detrás y Pedri acompaña a Rodri en el doble pivote.",
    "players": [
      {"name":"Joan García","role":"POR","x":50,"y":94},
      {"name":"Balde","role":"LI","x":12,"y":76},
      {"name":"Cubarsí","role":"DFC","x":38,"y":76},
      {"name":"Araújo","role":"DFC","x":62,"y":76},
      {"name":"Koundé","role":"LD","x":88,"y":76},
      {"name":"Pedri","role":"MC","x":38,"y":59},
      {"name":"Rodri","role":"MCD","x":62,"y":59},
      {"name":"Lamine","role":"ED","x":14,"y":35},
      {"name":"Fermín","role":"MP","x":50,"y":43},
      {"name":"Gordon","role":"EI","x":86,"y":35},
      {"name":"Raphinha","role":"DC","x":50,"y":15}
    ],
    "connections": [["Pedri","Fermín"],["Rodri","Fermín"],["Fermín","Raphinha"]]
  },
  "right": {
    "title": "PROPUESTA · recuperar el centro",
    "formation": "4-3-3",
    "description": "Rodri fija la base; Pedri y Gavi son interiores. Lamine actúa de falso nueve y Raphinha y Gordon atacan los espacios desde los extremos.",
    "players": [
      {"name":"Joan García","role":"POR","x":50,"y":94},
      {"name":"Balde","role":"LI","x":12,"y":76},
      {"name":"Cubarsí","role":"DFC","x":38,"y":76},
      {"name":"Araújo","role":"DFC","x":62,"y":76},
      {"name":"Koundé","role":"LD","x":88,"y":76},
      {"name":"Pedri","role":"Interior","x":28,"y":54},
      {"name":"Rodri","role":"Mediocentro","x":50,"y":68},
      {"name":"Gavi","role":"Interior","x":72,"y":54},
      {"name":"Raphinha","role":"Extremo","x":14,"y":32},
      {"name":"Lamine","role":"Falso nueve","x":50,"y":18},
      {"name":"Gordon","role":"Extremo","x":86,"y":32}
    ],
    "connections": [["Pedri","Rodri"],["Gavi","Rodri"],["Rodri","Lamine"]],
    "movements": [{"from":[50,18],"to":[50,37]},{"from":[14,32],"to":[27,15]},{"from":[86,32],"to":[73,15]}]
  }
}
\x60\x60\x60

El primer cambio no es una etiqueta, sino una relación de alturas. Con dos mediocentros, Fermín puede recibir entre líneas, pero el equipo corre el riesgo de dejar demasiado terreno entre esa línea y los extremos. La propuesta acerca a Pedri y Gavi a la zona donde pueden conectar con Rodri y sostener la presión tras pérdida.

Lamine como falso nueve tampoco significa fijarlo en el centro. Su descenso puede atraer a un central y abrir el intervalo para las rupturas de Raphinha y Gordon. La condición es que los interiores ocupen el área y que Rodri conserve una línea de pase segura por detrás.

\x60\x60\x60oneshot
{
  "type": "stat-cards",
  "title": "Indicadores de ejemplo",
  "stats": [
    {"value":"62,2 %","label":"Posesión hipotética","source":"Dato ficticio"},
    {"value":"18–10","label":"Remates hipotéticos","source":"Dato ficticio"},
    {"value":"1,19–1,95","label":"xG hipotético","source":"Dato ficticio"}
  ],
  "note":"DATOS DE DEMOSTRACIÓN · No corresponden a un partido ni a una temporada real."
}
\x60\x60\x60

La estructura solo merece la pena si mejora la salida y la defensa de las transiciones. No se trata de juntar centrocampistas por principio: se trata de que siempre exista un apoyo cercano a Rodri, una línea de pase por delante y amplitud suficiente para estirar al rival.

\x60\x60\x60oneshot
{
  "type":"editorial-callout",
  "title":"La tesis",
  "text":"El Barça no necesita renunciar al fútbol agresivo de Flick. Necesita una estructura que permita atacar sin partirse y recuperar el control del centro."
}
\x60\x60\x60

Esta comparativa es un punto de partida para discutir funciones, no una predicción de once. Los movimientos, las conexiones y los datos son esquemáticos y están identificados como demostración.

\x60\x60\x60oneshot
{
  "type":"source-note",
  "source":"Nota editorial",
  "description":"Artículo demostrativo. No se han utilizado estadísticas reales ni fuentes externas; los diagramas expresan una hipótesis táctica.",
  "methodology":"Posiciones normalizadas de 0 a 100 dentro del campo; coordenadas ilustrativas, no tracking de partido."
}
\x60\x60\x60
`,
};
