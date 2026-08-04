// Regenerates rss.xml from js/main.js's ALBUM_DATA - the 40 most recent
// albums/shows across every collection, newest first.
// Run: node scripts/generate-rss.js
//
// Run this after adding new albums so the feed doesn't go stale. It fully
// replaces rss.xml each time rather than trying to merge - the album list
// in ALBUM_DATA is the source of truth.

const fs = require('fs');
const path = require('path');

const SITE_ROOT = path.join(__dirname, '..');
const MAIN_JS_PATH = path.join(SITE_ROOT, 'js', 'main.js');
const RSS_PATH = path.join(SITE_ROOT, 'rss.xml');
const BASE_URL = 'https://jayneclamp.com';
const FEED_ITEM_COUNT = 40;

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

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function parseShowDate(title) {
  const match = title.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const [, y, m, d] = match;
  return new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
}

function collectionLabel(collection) {
  return collection.charAt(0).toUpperCase() + collection.slice(1);
}

function buildItem(album, collection) {
  const loc = BASE_URL + '/' + album.albumPage.replace(/^\.\.\//, '');
  const kind = album.isVideoCollection ? 'video collection' : 'photo gallery';
  const description = `New ${kind} in ${collectionLabel(collection)}: ${album.title}`;
  const guid = loc;

  const lines = [
    '    <item>',
    `      <title>${escapeXml(album.title)}</title>`,
    `      <link>${escapeXml(loc)}</link>`,
    `      <guid isPermaLink="true">${escapeXml(guid)}</guid>`,
    `      <pubDate>${album.pubDate.toUTCString()}</pubDate>`,
    `      <description>${escapeXml(description)}</description>`,
  ];
  if (album.coverUrl) {
    lines.push(`      <enclosure url="${escapeXml(album.coverUrl)}" type="image/jpeg" />`);
  }
  lines.push('    </item>');
  return lines.join('\n');
}

function main() {
  const mainJsSource = fs.readFileSync(MAIN_JS_PATH, 'utf8');
  const albumData = extractAlbumData(mainJsSource);

  const allAlbums = [];
  for (const collection of Object.keys(albumData)) {
    for (const album of albumData[collection]) {
      if (!album.albumPage) continue;
      const pubDate = parseShowDate(album.title);
      if (!pubDate) continue;
      allAlbums.push({ ...album, collection, pubDate });
    }
  }

  allAlbums.sort((a, b) => b.pubDate - a.pubDate);
  const recent = allAlbums.slice(0, FEED_ITEM_COUNT);

  const now = new Date().toUTCString();
  const lastBuildDate = recent.length > 0 ? recent[0].pubDate.toUTCString() : now;

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    '  <channel>',
    '    <title>Jayne Clamp Photography</title>',
    `    <link>${BASE_URL}</link>`,
    '    <description>New photo and video galleries from Jayne Clamp Photography</description>',
    '    <language>en-us</language>',
    `    <lastBuildDate>${lastBuildDate}</lastBuildDate>`,
    `    <atom:link href="${BASE_URL}/rss.xml" rel="self" type="application/rss+xml" xmlns:atom="http://www.w3.org/2005/Atom" />`,
    ...recent.map(album => buildItem(album, album.collection)),
    '  </channel>',
    '</rss>',
    '',
  ].join('\n');

  fs.writeFileSync(RSS_PATH, xml);
  console.log(`Wrote rss.xml: ${recent.length} most recent albums (of ${allAlbums.length} total with parseable dates).`);
}

main();
