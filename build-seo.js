import fs from 'fs';
import path from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://jwizuyoipoymqzvuirnb.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3aXp1eW9pcG95bXF6dnVpcm5iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIxMTU5ODMsImV4cCI6MjEwNzY5MTk4M30.zJCH7t3FkmyNAwxnt6pMGFB-leiANwgdt0QA6wwVMtU';
const SITE_URL = 'https://la-taberna-del-magallanes-news-ve.netlify.app';
const TABLE_NAME = 'articles';

function escaparHtml(texto = '') {
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function crearSlug(texto = '', id) {
  const limpio = String(texto)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 65);
  return limpio ? `${id}-${limpio}` : `articulo-${id}`;
}

async function generarPaginasYSitemap() {
  const endpoint = `${SUPABASE_URL}/rest/v1/${TABLE_NAME}?select=*&order=created_at.desc`;
  const response = await fetch(endpoint, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Error consultando Supabase (${response.status}): ${await response.text()}`);
  }

  const articulos = await response.json();
  const outDir = path.join(process.cwd(), 'articulos');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const hoy = new Date().toISOString().split('T')[0];
  const urlsSitemap = [
    `  <url>\n    <loc>${SITE_URL}/</loc>\n    <lastmod>${hoy}</lastmod>\n    <changefreq>hourly</changefreq>\n    <priority>1.0</priority>\n  </url>`
  ];

  for (const art of articulos) {
    const slug = crearSlug(art.title, art.id);
    const filePath = path.join(outDir, `${slug}.html`);
    const urlCanonica = `${SITE_URL}/articulos/${slug}.html`;
    const fechaCompleta = art.created_at || new Date().toISOString();
    const fechaIso = fechaCompleta.split('T')[0];

    const titulo = art.title || 'Nota - La Taberna del Magallanes News';
    const bajada = art.lead || 'Periodismo deportivo independiente con rigor sabermétrico sobre los Navegantes del Magallanes y la LVBP.';
    const cuerpo = art.content || '';
    const imagen = (art.image_url && !art.image_url.startsWith('data:'))
      ? art.image_url
      : 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1200&h=630&fit=crop';
    const categoria = art.type === 'cronica' ? 'Crónica' : art.type === 'editorial' ? 'Editorial' : 'Noticia';
    const autor = art.author || 'Lic. Luis Aponte';

    const tituloSeguro = escaparHtml(titulo);
    const bajadaSegura = escaparHtml(bajada);
    const autorSeguro = escaparHtml(autor);

    let saberHtml = '';
    if (art.saber && Object.values(art.saber).some((v) => v !== null && v !== undefined)) {
      const s = art.saber;
      const items = [];
      if (s.woba !== null && s.woba !== undefined) items.push(`<div class="stat"><span>wOBA</span><strong>${s.woba}</strong></div>`);
      if (s.ops !== null && s.ops !== undefined) items.push(`<div class="stat"><span>OPS+</span><strong>${s.ops}</strong></div>`);
      if (s.fip !== null && s.fip !== undefined) items.push(`<div class="stat"><span>FIP</span><strong>${s.fip}</strong></div>`);
      if (s.war !== null && s.war !== undefined) items.push(`<div class="stat"><span>WAR</span><strong>${s.war}</strong></div>`);
      if (s.ev !== null && s.ev !== undefined) items.push(`<div class="stat"><span>Exit Vel.</span><strong>${s.ev} mph</strong></div>`);
      if (s.la !== null && s.la !== undefined) items.push(`<div class="stat"><span>Launch Ang.</span><strong>${s.la}°</strong></div>`);
      if (items.length > 0) {
        saberHtml = `<section class="saber"><h2>📊 Datos Sabermétricos</h2><div class="saber-grid">${items.join('')}</div></section>`;
      }
    }

    const schemaNewsArticle = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'NewsArticle',
      headline: titulo,
      description: bajada,
      image: [imagen],
      datePublished: fechaCompleta,
      dateModified: fechaCompleta,
      articleSection: categoria,
      author: [{ '@type': 'Person', name: autor }],
      publisher: {
        '@type': 'NewsMediaOrganization',
        name: 'La Taberna del Magallanes News',
        url: SITE_URL
      },
      mainEntityOfPage: { '@type': 'WebPage', '@id': urlCanonica }
    });

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${tituloSeguro} · La Taberna del Magallanes News</title>
  <meta name="description" content="${bajadaSegura}" />
  <meta name="author" content="${autorSeguro}" />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="${urlCanonica}" />
  <meta property="og:site_name" content="La Taberna del Magallanes News" />
  <meta property="og:type" content="article" />
  <meta property="og:title" content="${tituloSeguro}" />
  <meta property="og:description" content="${bajadaSegura}" />
  <meta property="og:image" content="${imagen}" />
  <meta property="og:url" content="${urlCanonica}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${tituloSeguro}" />
  <meta name="twitter:description" content="${bajadaSegura}" />
  <meta name="twitter:image" content="${imagen}" />
  <script type="application/ld+json">${schemaNewsArticle}</script>
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-FWGCQPZNML"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-FWGCQPZNML', { 'anonymize_ip': true });
  </script>
  <style>
    body { font-family: Georgia, serif; background: #fff; color: #000; margin: 0; line-height: 1.7; }
    header { background: #000; color: #fff; border-bottom: 3px solid #fbbf24; padding: 1rem 1.5rem; display: flex; justify-content: space-between; align-items: center; }
    header a { color: #fbbf24; text-decoration: none; font-weight: 700; font-family: system-ui, sans-serif; font-size: 0.9rem; }
    main { max-width: 800px; margin: 2rem auto; padding: 0 1.25rem; }
    .cat { font-size: 0.75rem; letter-spacing: 0.2em; text-transform: uppercase; color: #d4a017; font-weight: 700; font-family: system-ui, sans-serif; }
    h1 { font-size: clamp(1.75rem, 4vw, 2.6rem); line-height: 1.15; margin: 0.5rem 0 1rem; }
    .meta { font-size: 0.8rem; color: #737373; font-family: system-ui, sans-serif; text-transform: uppercase; margin-bottom: 1.5rem; }
    .lead { font-size: 1.15rem; font-style: italic; color: #404040; border-left: 4px solid #fbbf24; padding-left: 1rem; margin-bottom: 1.5rem; }
    img { width: 100%; max-height: 480px; object-fit: cover; margin-bottom: 1.5rem; }
    .cuerpo { font-size: 1.1rem; color: #262626; }
    .cuerpo p { margin-bottom: 1.1rem; }
    .saber { background: #000; color: #fff; padding: 1.25rem; border-top: 3px solid #fbbf24; margin: 2rem 0; font-family: system-ui, sans-serif; }
    .saber h2 { color: #fbbf24; font-size: 0.8rem; letter-spacing: 0.15em; text-transform: uppercase; margin: 0 0 1rem; }
    .saber-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 0.75rem; }
    .stat { background: rgba(255,255,255,0.06); border: 1px solid rgba(251,191,36,0.35); padding: 0.65rem; text-align: center; }
    .stat span { display: block; font-size: 0.65rem; color: #fbbf24; text-transform: uppercase; }
    .stat strong { font-size: 1.35rem; color: #fbbf24; }
    footer { background: #000; color: #d4d4d4; text-align: center; padding: 2rem 1rem; border-top: 4px solid #fbbf24; margin-top: 3rem; font-size: 0.85rem; }
  </style>
</head>
<body>
  <header>
    <a href="/">← La Taberna del Magallanes News</a>
    <a href="/?article=${art.id}">Comentar en portada 💬</a>
  </header>
  <main>
    <article>
      <div class="cat">${categoria}</div>
      <h1>${tituloSeguro}</h1>
      <div class="meta">✍️ ${autorSeguro} · 📅 ${fechaIso}</div>
      ${art.image_url ? `<img src="${escaparHtml(art.image_url)}" alt="${tituloSeguro}" />` : ''}
      <p class="lead">${bajadaSegura}</p>
      <div class="cuerpo">${cuerpo}</div>
      ${saberHtml}
    </article>
  </main>
  <footer>La Taberna del Magallanes News · Fundado por Lic. Luis Aponte · © 2026</footer>
</body>
</html>`;

    fs.writeFileSync(filePath, html, 'utf-8');

    urlsSitemap.push(
      `  <url>\n    <loc>${urlCanonica}</loc>\n    <lastmod>${fechaIso}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>`
    );
  }

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlsSitemap.join('\n')}
</urlset>`;

  fs.writeFileSync(path.join(process.cwd(), 'sitemap.xml'), sitemapXml, 'utf-8');
  console.log(`Éxito: ${articulos.length} artículos de public.articles generados + sitemap.xml`);
}

generarPaginasYSitemap().catch((err) => {
  console.error(err);
  process.exit(1);
});
