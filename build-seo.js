import fs from 'fs';
import path from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SITE_URL = 'https://la-taberna-del-magallanes-news-ve.netlify.app';
const TABLE_NAME = 'news';

function escaparHtml(texto = '') {
  return String(texto)
    .replace(/&/g, '&')
    .replace(/"/g, '"')
    .replace(/</g, '<')
    .replace(/>/g, '>');
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
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Faltan SUPABASE_URL o SUPABASE_ANON_KEY en las variables de entorno de Netlify.');
  }

  // Consulta directa a public.news ordenada por fecha descendente
  const endpoint = `${SUPABASE_URL}/rest/v1/${TABLE_NAME}?select=id,created_at,titulo,contenido,bajada,cuerpo,imagen,categoria,autor,fecha,destacado&order=created_at.desc`;
  const response = await fetch(endpoint, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Error consultando Supabase (${response.status}): ${await response.text()}`);
  }

  const noticias = await response.json();
  const outDir = path.join(process.cwd(), 'articulos');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const hoy = new Date().toISOString().split('T')[0];
  const urlsSitemap = [
    `  <url>\n    <loc>${SITE_URL}/</loc>\n    <lastmod>${hoy}</lastmod>\n    <changefreq>hourly</changefreq>\n    <priority>1.0</priority>\n  </url>`
  ];

  for (const item of noticias) {
    const slug = crearSlug(item.titulo, item.id);
    const filePath = path.join(outDir, `${slug}.html`);
    const urlCanonica = `${SITE_URL}/articulos/${slug}.html`;
    const fechaCompleta = item.fecha || item.created_at || new Date().toISOString();
    const fechaIso = fechaCompleta.split('T')[0];

    const titulo = item.titulo || 'Nota - La Taberna del Magallanes News';
    const bajada = item.bajada || 'Análisis sabermétrico y actualidad de los Navegantes del Magallanes.';
    const textoPrincipal = item.cuerpo || item.contenido || '';
    const imagen = item.imagen || 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1200&h=630&fit=crop';
    const categoria = item.categoria || 'LVBP / Sabermetría';
    const autor = item.autor || 'Luis Enrique Aponte';
    const prioridad = item.destacado ? '0.9' : '0.8';

    const tituloSeguro = escaparHtml(titulo);
    const bajadaSegura = escaparHtml(bajada);
    const categoriaSegura = escaparHtml(categoria);
    const autorSeguro = escaparHtml(autor);

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
        '@type': 'Organization',
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
  <title>${tituloSeguro} | La Taberna del Magallanes News</title>
  <meta name="description" content="${bajadaSegura}" />
  <meta name="author" content="${autorSeguro}" />
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
    gtag('config', 'G-FWGCQPZNML');
  </script>
  <style>
    body { background: #0a0a0a; color: #f1f5f9; font-family: system-ui, -apple-system, sans-serif; margin: 0; line-height: 1.65; }
    header { background: #111827; border-bottom: 1px solid #1e293b; padding: 1rem 1.5rem; display: flex; justify-content: space-between; align-items: center; }
    header a { color: #38bdf8; text-decoration: none; font-weight: 600; }
    main { max-width: 780px; margin: 2rem auto; padding: 0 1.25rem; }
    .meta-top { display: flex; gap: 0.75rem; align-items: center; margin-bottom: 0.75rem; font-size: 0.85rem; }
    .badge { background: #0284c7; color: #fff; padding: 0.2rem 0.6rem; border-radius: 4px; font-weight: 700; text-transform: uppercase; }
    h1 { font-size: 2rem; line-height: 1.2; margin: 0 0 0.75rem 0; color: #ffffff; }
    .byline { color: #94a3b8; font-size: 0.9rem; margin-bottom: 1.25rem; }
    .bajada { font-size: 1.15rem; color: #cbd5e1; border-left: 3px solid #0284c7; padding-left: 1rem; margin-bottom: 1.5rem; }
    img { width: 100%; max-height: 460px; object-fit: cover; border-radius: 8px; margin-bottom: 1.5rem; }
    .contenido-articulo { font-size: 1.05rem; color: #e2e8f0; white-space: pre-line; }
  </style>
</head>
<body>
  <header>
    <a href="/">← La Taberna del Magallanes News</a>
    <span style="color:#94a3b8;font-size:0.85rem;">Periodismo Sabermétrico</span>
  </header>
  <main>
    <article>
      <div class="meta-top">
        <span class="badge">${categoriaSegura}</span>
        <time datetime="${fechaIso}" style="color:#94a3b8;">${fechaIso}</time>
      </div>
      <h1>${tituloSeguro}</h1>
      <div class="byline">Por <strong>${autorSeguro}</strong></div>
      <p class="bajada">${bajadaSegura}</p>
      <img src="${imagen}" alt="${tituloSeguro}" />
      <div class="contenido-articulo">${textoPrincipal}</div>
    </article>
  </main>
</body>
</html>`;

    fs.writeFileSync(filePath, html, 'utf-8');

    urlsSitemap.push(
      `  <url>\n    <loc>${urlCanonica}</loc>\n    <lastmod>${fechaIso}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${prioridad}</priority>\n  </url>`
    );
  }

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlsSitemap.join('\n')}
</urlset>`;

  fs.writeFileSync(path.join(process.cwd(), 'sitemap.xml'), sitemapXml, 'utf-8');
  console.log(`Éxito: ${noticias.length} noticias de public.news generadas + sitemap.xml`);
}

generarPaginasYSitemap().catch((err) => {
  console.error(err);
  process.exit(1);
});
