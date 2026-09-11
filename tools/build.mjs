// Construit le site local à partir des pages Wix brutes de source/.
// - retire le runtime Wix (scripts, prefetch), garde le HTML rendu côté serveur et ses CSS inlinées
// - télécharge images, polices et formes dans www/assets/ et réécrit les références
// - remplace les images floues (LQIP) par leur version nette
// - remplace l'iframe du diaporama d'accueil par un diaporama local
// - réécrit les liens internes en chemins locaux
// - applique les corrections de contenu de content-fixes.mjs
// Usage : node tools/build.mjs [--offline] [--base=/prefixe/]
//   --offline : ne retélécharge pas, réutilise assets/manifest.json
//   --base    : préfixe des chemins absolus (GitHub Pages sert un dépôt de projet sous /<dépôt>/)

import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { applyContentFixes } from './content-fixes.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = path.join(ROOT, 'source');
const OUT = path.join(ROOT, 'www');
const ASSETS = path.join(OUT, 'assets');
const MANIFEST = path.join(ASSETS, 'manifest.json');
const OFFLINE = process.argv.includes('--offline');
const BASE = (process.argv.find((a) => a.startsWith('--base=')) || '--base=/').slice(7).replace(/\/?$/, '/');

const PAGES = [
  { src: 'index.html', out: 'index.html', route: '/' },
  { src: 'l-orthoptie-en-detail.html', out: 'l-orthoptie-en-detail/index.html', route: '/l-orthoptie-en-detail/' },
  { src: 'rendez-vous.html', out: 'rendez-vous/index.html', route: '/rendez-vous/' },
];

// Images du diaporama d'accueil (comp-ihjck6rg), lues dans source/wix-features-accueil.json
async function slideshowImages() {
  const json = JSON.parse(await fs.readFile(path.join(SRC, 'wix-features-accueil.json'), 'utf8'));
  const items = json.tpaGalleries?.tpaGalleriesImageItems?.['comp-ihjck6rg']
    ?? findKey(json, 'tpaGalleriesImageItems')?.['comp-ihjck6rg'] ?? [];
  return items.map((it) => ({
    title: it.title,
    url: `https://static.wixstatic.com/media/${it.uri}/v1/fill/w_1960,h_1506,al_c,q_85/${it.uri}`,
  }));
}
// Ancres Wix : data-anchor="dataItem-…" résolu en JS vers l'id du composant cible.
// L'ancre "Contact" du menu (dataItem-ihetdy1s) n'a plus de cible sur le site en ligne : on la pointe sur la section Contact.
async function anchorTable() {
  const table = { 'dataItem-ihetdy1s': 'comp-ihenviaz' };
  for (const f of await fs.readdir(SRC)) {
    if (!/^wix-features-.*\.json$/.test(f)) continue;
    const txt = await fs.readFile(path.join(SRC, f), 'utf8');
    for (const m of txt.matchAll(/"compId":"(comp-[a-z0-9]+)","dataId":"(dataItem-[a-z0-9]+)","name":"/g)) table[m[2]] = m[1];
  }
  return table;
}
function findKey(obj, key) {
  if (!obj || typeof obj !== 'object') return undefined;
  if (key in obj) return obj[key];
  for (const v of Object.values(obj)) { const r = findKey(v, key); if (r) return r; }
  return undefined;
}

// --- téléchargement des ressources -------------------------------------------------------------
let manifest = {};
try { manifest = JSON.parse(await fs.readFile(MANIFEST, 'utf8')); } catch { /* premier passage */ }

function localNameFor(url) {
  const u = new URL(url);
  let base = decodeURIComponent(path.basename(u.pathname)).replace(/[^\w.-]+/g, '_');
  if (u.hostname === 'static.wixstatic.com' && u.pathname.startsWith('/media/')) {
    // /media/<uri>/v1/<transfo>/<uri> : on distingue les variantes par un hash de l'URL complète
    base = decodeURIComponent(u.pathname.split('/')[2]).replace(/[^\w.-]+/g, '_');
  }
  const hash = crypto.createHash('sha1').update(url).digest('hex').slice(0, 8);
  const ext = path.extname(base);
  return `${path.basename(base, ext)}-${hash}${ext}`;
}

async function fetchAsset(url) {
  if (manifest[url]) return manifest[url];
  const name = localNameFor(url);
  const dest = path.join(ASSETS, name);
  if (!OFFLINE) {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) { console.warn(`  !! ${res.status} ${url}`); return null; }
    await fs.writeFile(dest, Buffer.from(await res.arrayBuffer()));
  }
  manifest[url] = `/assets/${name}`;
  return manifest[url];
}

// --- transformations HTML ------------------------------------------------------------------------
const ASSET_URL_RE = /(?:https?:)?\/\/(?:static\.wixstatic\.com|static\.parastorage\.com)\/[^\s"'<>)*]+/g;

function stripWixRuntime(html) {
  html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  html = html.replace(/\/\*# sourceMappingURL=[^*]*\*\//g, '');
  // les CSS Wix écrivent url('.../open sans.woff2') avec une espace : on l'encode pour l'extraction
  html = html.replace(/url\('([^']*) ([^']*)'\)/g, "url('$1%20$2')");
  html = html.replace(/<link\b(?=[^>]*\brel="(?:prefetch|preload|preconnect|dns-prefetch|modulepreload)")[^>]*>/gi, '');
  html = html.replace(/<meta name="generator"[^>]*>\s*/i, '');
  return html;
}

// wow-image : le SSR fournit une miniature floue, on demande la version nette aux dimensions cibles
function sharpenLqip(html) {
  return html.replace(/<wow-image\b([^>]*?)data-image-info="([^"]+)"([^>]*)>\s*<img\b([^>]*?)\ssrc="[^"]+"/g,
    (m, a, info, b, imgAttrs) => {
      const data = JSON.parse(info.replace(/&quot;/g, '"'));
      const { uri, width, height } = data.imageData;
      const w = Math.min(width, Math.round((data.targetWidth || width) * 2));
      const h = Math.min(height, Math.round((data.targetHeight || height) * 2));
      const align = { top: 'al_t', bottom: 'al_b', left: 'al_l', right: 'al_r' }[data.alignType] || 'al_c';
      const mode = data.displayMode === 'fill' ? `fill/w_${w},h_${h},${align}` : `fit/w_${w},h_${h}`;
      const url = `https://static.wixstatic.com/media/${uri}/v1/${mode},q_85/${uri}`;
      return `<wow-image${a}data-image-info="${info}"${b}><img${imgAttrs} src="${url}"`;
    });
}

function replaceSlideshow(html, slides) {
  const figures = slides.map((s, i) =>
    `<img class="cr-slide${i === 0 ? ' is-active' : ''}" src="${s.url}" alt="${s.title}" width="980" height="753">`).join('');
  return html.replace(/<wix-iframe id="comp-ihjck6rg"[\s\S]*?<\/wix-iframe>/,
    `<div id="comp-ihjck6rg" class="comp-ihjck6rg cr-slideshow" aria-label="Diaporama">${figures}</div>`);
}

function rewriteInternalLinks(html, route, anchors) {
  // ancres résolues par Wix en JS : on pointe directement l'id du composant cible
  html = html.replace(/<a\b[^>]*\bdata-anchor="(dataItem-[a-z0-9]+)"[^>]*>/g, (tag, dataId) => {
    const comp = anchors[dataId];
    if (!comp) return tag;
    return tag.replace(/href="https:\/\/www\.caroline-roche\.fr\/?([a-z0-9-]*)"/, (m, page) => {
      const target = page ? `/${page}/` : '/';
      return `href="${target === route ? '' : target}#${comp}"`;
    });
  });
  html = html.replace(/href="https:\/\/www\.caroline-roche\.fr\/?#[^"]*"([^>]*?)data-anchor-comp-id="([^"]+)"/g,
    (m, between, comp) => `href="${route === '/' ? '' : '/'}#${comp}"${between}data-anchor-comp-id="${comp}"`);
  html = html.replace(/href="https:\/\/www\.caroline-roche\.fr\/?#([^"]*)"/g, (m, frag) =>
    `href="${route === '/' ? '' : '/'}#${frag}"`);
  html = html.replace(/(href|content)="https:\/\/www\.caroline-roche\.fr\/?"/g, '$1="/"');
  html = html.replace(/(href|content)="https:\/\/www\.caroline-roche\.fr\/([a-z0-9-]+)"/g, '$1="/$2/"');
  return html;
}

async function localizeAssets(html) {
  const urls = new Set();
  for (const m of html.matchAll(ASSET_URL_RE)) {
    let u = m[0].replace(/&amp;/g, '&').replace(/[,.]+$/, '');
    if (u.startsWith('//')) u = 'https:' + u;
    if (u.includes('${')) continue;
    urls.add(u);
  }
  const map = new Map();
  for (const u of urls) {
    const local = await fetchAsset(u);
    if (local) map.set(u, local);
  }
  return html.replace(ASSET_URL_RE, (m) => {
    let u = m.replace(/&amp;/g, '&');
    const trail = (u.match(/[,.]+$/) || [''])[0];
    u = u.replace(/[,.]+$/, '');
    if (u.startsWith('//')) u = 'https:' + u;
    return (map.get(u) ?? m.slice(0, m.length - trail.length)) + trail;
  });
}

// Préfixe les chemins absolus du site (liens, assets, srcset, url() des styles) quand il n'est pas servi à la racine
function applyBase(html) {
  if (BASE === '/') return html;
  return html
    .replace(/(["'(,\s])\/assets\//g, `$1${BASE}assets/`)
    .replace(/(href|content)="\/(#|l-orthoptie-en-detail\/|rendez-vous\/|)"/g, (m, attr, rest) => `${attr}="${BASE}${rest}"`)
    .replace(/(href|content)="\/(#[^"]*|l-orthoptie-en-detail\/#[^"]*)"/g, (m, attr, rest) => `${attr}="${BASE}${rest}"`);
}

function injectLocalAssets(html) {
  return html
    .replace('</head>', '  <link rel="stylesheet" href="/assets/local.css">\n</head>')
    .replace('</body>', '  <script src="/assets/local.js"></script>\n</body>');
}

// --- main ----------------------------------------------------------------------------------------
await fs.mkdir(ASSETS, { recursive: true });
const slides = await slideshowImages();
const anchors = await anchorTable();
for (const page of PAGES) {
  console.log(`> ${page.src}`);
  let html = await fs.readFile(path.join(SRC, page.src), 'utf8');
  html = stripWixRuntime(html);
  html = sharpenLqip(html);
  if (page.route === '/') html = replaceSlideshow(html, slides);
  html = rewriteInternalLinks(html, page.route, anchors);
  html = applyContentFixes(html, page.route);
  html = await localizeAssets(html);
  html = injectLocalAssets(html);
  html = applyBase(html);
  const dest = path.join(OUT, page.out);
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.writeFile(dest, html);
}
for (const f of ['local.css', 'local.js']) {
  await fs.copyFile(path.join(ROOT, 'tools', f), path.join(ASSETS, f));
}
await fs.writeFile(MANIFEST, JSON.stringify(manifest, null, 1));
console.log(`OK (base ${BASE}) : ${PAGES.length} pages, ${Object.keys(manifest).length} ressources dans www/assets/`);
