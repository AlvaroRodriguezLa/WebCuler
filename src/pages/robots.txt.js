export function GET({ site }) {
  const origin = site?.origin || 'https://1shot-studio.vercel.app';
  return new Response(`User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap-index.xml\n`, { headers: { 'Content-Type': 'text/plain' } });
}
