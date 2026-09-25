export const siteConfig = {
  name: 'ONE SHOT',
  tagline: 'Fútbol, identidad y construcción de plantilla desde una mirada Barça.',
  description: 'Una publicación editorial personal sobre fútbol, identidad Barça, táctica y construcción de equipos.',
  author: 'ScarFace2824',
  language: 'es-ES',
  baseUrl: import.meta.env.PUBLIC_SITE_URL || 'https://example.github.io',
};

export const categoryConfig = [
  { slug: 'identidad', label: 'Identidad', source: 'Identidad' },
  { slug: 'tactica', label: 'Táctica', source: 'Táctica' },
  { slug: 'perfiles', label: 'Perfiles', source: 'Perfiles de jugador' },
  { slug: 'planificacion', label: 'Planificación', source: 'Planificación' },
  { slug: 'plantilla', label: 'Plantilla', source: 'Construcción de plantilla' },
  { slug: 'cantera', label: 'Cantera / La Masia', source: 'Cantera' },
  { slug: 'partidos', label: 'Partidos', source: 'Partidos' },
  { slug: 'historia', label: 'Historia', source: 'Historia' },
];

export function categorySlug(category: string) {
  const normalized = category.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (normalized.includes('identidad')) return 'identidad';
  if (normalized.includes('tactica')) return 'tactica';
  if (normalized.includes('perfil')) return 'perfiles';
  if (normalized.includes('planificacion')) return 'planificacion';
  if (normalized.includes('cantera') || normalized.includes('masia')) return 'cantera';
  if (normalized.includes('partido')) return 'partidos';
  if (normalized.includes('historia')) return 'historia';
  if (normalized.includes('plantilla') || normalized.includes('mercado')) return 'plantilla';
  return 'analisis';
}

export function categoryLabel(category: string) {
  return categoryConfig.find((item) => item.slug === categorySlug(category))?.label || category || 'Análisis';
}
