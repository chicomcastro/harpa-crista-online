import songs from '$lib/songs.json';

export const prerender = true;

const SITE = 'https://chicomcastro.github.io';
const BASE = '/harpa-crista-online';

export function GET() {
  const urls = [
    { loc: `${SITE}${BASE}/`, priority: 1.0, changefreq: 'daily' },
    { loc: `${SITE}${BASE}/inicio`, priority: 0.9, changefreq: 'monthly' },
    { loc: `${SITE}${BASE}/sobre`, priority: 0.5, changefreq: 'monthly' },
    { loc: `${SITE}${BASE}/playlists`, priority: 0.4, changefreq: 'weekly' },
    ...songs.map(s => ({
      loc: `${SITE}${BASE}/song/${s.id}`,
      priority: 0.8,
      changefreq: 'yearly'
    }))
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
}
