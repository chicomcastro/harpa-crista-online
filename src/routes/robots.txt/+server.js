export const prerender = true;

export function GET() {
  const txt = `User-agent: *
Allow: /

Sitemap: https://chicomcastro.github.io/harpa-crista-online/sitemap.xml
`;
  return new Response(txt, { headers: { 'Content-Type': 'text/plain' } });
}
