import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validate, readState } from './storage.js';
import { logoReferences } from '../assets/button-logos.js';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { catalog, events } = await readState(root);
validate(catalog, events);
for (const ref of [
  ...catalog.products.flatMap((p) => p.images),
  ...catalog.categories.map((c) => c.cover).filter(Boolean),
  ...logoReferences(catalog),
])
  await fs.access(path.join(root, ref));
for (const page of [
  'index.html',
  'catalogo/index.html',
  'agenda/index.html',
  'sobre/index.html',
  'contacto/index.html',
  'admin/index.html',
]) {
  const html = await fs.readFile(path.join(root, page), 'utf8');
  if (html.includes('base64,')) throw Error('Logótipo embutido em ' + page);
  for (const [, link] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    if (/^(https?:|#)/.test(link)) continue;
    const clean = link.split(/[?#]/)[0],
      target = path.resolve(root, path.dirname(page), clean);
    await fs.access(target);
  }
}
console.log(
  `OK: ${catalog.categories.length} categorias, ${catalog.products.length} peças, ${events.length} eventos; imagens e ligações locais válidas.`,
);
