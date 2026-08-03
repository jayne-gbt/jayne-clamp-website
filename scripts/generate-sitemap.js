// Regenerates sitemap.xml from js/main.js's ALBUM_DATA plus the site's static pages.
// Run: node scripts/generate-sitemap.js
//
// Run this after adding new albums so the sitemap doesn't go stale. It fully
// replaces sitemap.xml each time rather than trying to merge - the album list
// in ALBUM_DATA is the source of truth.

const fs = require('fs');
const path = require('path');

const SITE_ROOT = path.join(__dirname, '..');
const MAIN_JS_PATH = path.join(SITE_ROOT, 'js', 'main.js');
const SITEMAP_PATH = path.join(SITE_ROOT, 'sitemap.xml');
const BASE_URL = 'https://jayneclamp.com';

function extractAlbumData(mainJsSource) {
  const start = mainJsSource.indexOf('const ALBUM_DATA = {');
  if (start === -1) throw new Error('Could not find ALBUM_DATA in main.js');
  const braceStart = mainJsSource.indexOf('{', start);
  let depth = 0;
  let i = braceStart;
  while (true) {
    if (mainJsSource[i] === '{') depth++;
    else if (mainJsSource[i] === '}') {
      depth--;
      if (depth === 0) break;
    }
    i++;
  }
  const objectLiteral = mainJsSource.slice(braceStart, i + 1);
  // eslint-disable-next-line no-eval
  return eval('(' + objectLiteral + ')');
}

const STATIC_PAGES = [
  { loc: '/', changefreq: 'weekly', priority: '1.0' },
  { loc: '/index.html', changefreq: 'weekly', priority: '1.0' },
  { loc: '/music.html', changefreq: 'weekly', priority: '0.9' },
  { loc: '/events.html', changefreq: 'weekly', priority: '0.9' },
  { loc: '/misc.html', changefreq: 'weekly', priority: '0.8' },
  { loc: '/travel.html', changefreq: 'monthly', priority: '0.7' },
  { loc: '/birds.html', changefreq: 'monthly', priority: '0.7' },
  { loc: '/landscapes.html', changefreq: 'monthly', priority: '0.7' },
  { loc: '/pets.html', changefreq: 'monthly', priority: '0.7' },
  { loc: '/tags.html', changefreq: 'weekly', priority: '0.8' },
  { loc: '/contact.html', changefreq: 'monthly', priority: '0.7' },
  { loc: '/privacy-policy.html', changefreq: 'yearly', priority: '0.3' },
  { loc: '/terms-of-use.html', changefreq: 'yearly', priority: '0.3' },
  { loc: '/sitemap.html', changefreq: 'monthly', priority: '0.3' },
];

function buildUrlEntry({ loc, changefreq, priority, lastmod }) {
  return [
    '  <url>',
    `    <loc>${BASE_URL}${loc}</loc>`,
    `    <lastmod>${lastmod}</lastmod>`,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    '  </url>',
  ].join('\n');
}

function main() {
  const mainJsSource = fs.readFileSync(MAIN_JS_PATH, 'utf8');
  const albumData = extractAlbumData(mainJsSource);
  const today = new Date().toISOString().slice(0, 10);

  const sections = [];

  sections.push('  <!-- Static Pages -->');
  sections.push(...STATIC_PAGES.map(p => buildUrlEntry({ ...p, lastmod: today })));

  let totalAlbums = 0;
  for (const collection of Object.keys(albumData)) {
    const albums = albumData[collection].filter(a => a.albumPage);
    if (albums.length === 0) continue;

    sections.push('');
    sections.push(`  <!-- ${collection.charAt(0).toUpperCase() + collection.slice(1)} Albums -->`);
    for (const album of albums) {
      const loc = '/' + album.albumPage.replace(/^\.\.\//, '');
      sections.push(buildUrlEntry({ loc, changefreq: 'monthly', priority: '0.6', lastmod: today }));
      totalAlbums++;
    }
  }

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...sections,
    '</urlset>',
    '',
  ].join('\n');

  fs.writeFileSync(SITEMAP_PATH, xml);
  console.log(`Wrote sitemap.xml: ${STATIC_PAGES.length} static pages + ${totalAlbums} album pages.`);
}

main();
