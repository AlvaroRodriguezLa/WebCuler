export function GET({ site }) {
  const origin = site?.origin || 'https://example.github.io';
  return new Response(`User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap-index.xml\n`, { headers: { 'Content-Type': 'text/plain' } });
}
