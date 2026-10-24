import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// A fresh timestamped output avoids deleting any existing user files.
const out = path.join(root, 'dist', 'site-' + Date.now());
await fs.mkdir(out, { recursive: true });
for (const item of [
  'index.html',
  'assets',
  'images',
  'catalogo',
  'agenda',
  'sobre',
  'contacto',
])
  await fs.cp(path.join(root, item), path.join(out, item), { recursive: true });
await fs.mkdir(path.join(out, 'data'));
for (const item of ['catalog.json', 'events.json'])
  await fs.copyFile(path.join(root, 'data', item), path.join(out, 'data', item));
// Keep original image paths working, including photos explicitly associated in the editor.
for (const item of await fs.readdir(root))
  if (item.endsWith('.jpeg'))
    await fs.copyFile(path.join(root, item), path.join(out, item));
await fs.writeFile(path.join(out, '.nojekyll'), '');
console.log('Site pronto para publicação: ' + out);
