import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
export const revision = (catalog, events) =>
  crypto
    .createHash('sha256')
    .update(JSON.stringify([catalog, events]))
    .digest('hex');
const text = (v, max = 4000) => typeof v === 'string' && v.length <= max;
const id = (v) =>
  typeof v === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v) && v.length <= 180;
export const imagePath = (v) =>
  typeof v === 'string' &&
  /^(?:images\/[a-zA-Z0-9_/-]+|[a-zA-Z0-9_-]+)\.(?:jpeg|jpg|png|webp)$/.test(v) &&
  !v.includes('..');
export function validate(catalog, events) {
  if (
    catalog?.version !== 1 ||
    !Array.isArray(catalog.categories) ||
    !Array.isArray(catalog.products) ||
    !Array.isArray(events)
  )
    throw Error('Formato de dados inválido.');
  const categories = new Set(),
    products = new Set();
  for (const c of catalog.categories) {
    if (
      !id(c.id) ||
      categories.has(c.id) ||
      !text(c.name, 180) ||
      !c.name.trim() ||
      !(c.cover === '' || imagePath(c.cover))
    )
      throw Error('Categoria inválida ou repetida.');
    categories.add(c.id);
  }
  for (const p of catalog.products) {
    if (
      !id(p.id) ||
      products.has(p.id) ||
      !text(p.name, 180) ||
      !p.name.trim() ||
      !categories.has(p.category) ||
      !text(p.price, 60) ||
      !text(p.subcategory, 180) ||
      !text(p.description) ||
      !Array.isArray(p.images) ||
      !p.images.length ||
      p.images.some((i) => !imagePath(i))
    )
      throw Error('Peça inválida: verifica nome, categoria e fotografias.');
    products.add(p.id);
  }
  for (const e of events)
    if (
      !text(e.title, 180) ||
      !e.title.trim() ||
      !text(e.date, 180) ||
      !e.date.trim() ||
      !text(e.time, 180) ||
      !text(e.location, 180) ||
      !text(e.description)
    )
      throw Error('Evento inválido.');
}
export async function readState(root) {
  const catalog = JSON.parse(
      await fs.readFile(path.join(root, 'data/catalog.json'), 'utf8'),
    ),
    events = JSON.parse(await fs.readFile(path.join(root, 'data/events.json'), 'utf8'));
  return { catalog, events, revision: revision(catalog, events) };
}
export async function saveState(root, body) {
  const old = await readState(root);
  if (body.revision !== old.revision) {
    const e = Error(
      'Os dados foram alterados noutra janela. Guarda uma cópia do teu trabalho e recarrega antes de continuar.',
    );
    e.status = 409;
    throw e;
  }
  validate(body.catalog, body.events);
  if (!Array.isArray(body.uploads) || body.uploads.length > 100)
    throw Error('Lista de fotografias inválida.');
  const incoming = new Map();
  for (const u of body.uploads) {
    if (
      !imagePath(u.path) ||
      !u.path.startsWith('images/catalogo/uploads/') ||
      !text(u.data, 16000000) ||
      !/^[A-Za-z0-9+/]*={0,2}$/.test(u.data) ||
      incoming.has(u.path)
    )
      throw Error('Fotografia inválida.');
    const bytes = Buffer.from(u.data, 'base64');
    const ext = path.extname(u.path);
    const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    const png = bytes
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const webp =
      bytes.toString('ascii', 0, 4) === 'RIFF' &&
      bytes.toString('ascii', 8, 12) === 'WEBP';
    if (
      bytes.length > 10 * 1024 * 1024 ||
      !(
        (['.jpg', '.jpeg'].includes(ext) && jpeg) ||
        (ext === '.png' && png) ||
        (ext === '.webp' && webp)
      )
    )
      throw Error('Usa imagens JPEG, PNG ou WebP até 10 MB.');
    try {
      await fs.access(path.join(root, u.path));
      throw Error('A fotografia já existe. Escolhe outro ficheiro.');
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
    }
    incoming.set(u.path, bytes);
  }
  for (const ref of [
    ...body.catalog.products.flatMap((p) => p.images),
    ...body.catalog.categories.map((c) => c.cover).filter(Boolean),
  ])
    if (!incoming.has(ref)) {
      try {
        await fs.access(path.join(root, ref));
      } catch {
        throw Error('Fotografia em falta: ' + ref);
      }
    }
  const backup = path.join(
    root,
    'backup',
    'edicao-' + Date.now() + '-' + crypto.randomUUID().slice(0, 8),
  );
  await fs.mkdir(backup, { recursive: true });
  await fs.writeFile(
    path.join(backup, 'catalog.json'),
    JSON.stringify(old.catalog, null, 2) + '\n',
  );
  await fs.writeFile(
    path.join(backup, 'events.json'),
    JSON.stringify(old.events, null, 2) + '\n',
  );
  for (const [file, bytes] of incoming) {
    const target = path.join(root, file);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, bytes, { flag: 'wx' });
  }
  const catalogFile = path.join(root, 'data/catalog.json'),
    eventsFile = path.join(root, 'data/events.json');
  try {
    await fs.writeFile(
      catalogFile + '.tmp',
      JSON.stringify(body.catalog, null, 2) + '\n',
    );
    await fs.writeFile(eventsFile + '.tmp', JSON.stringify(body.events, null, 2) + '\n');
    await fs.rename(catalogFile + '.tmp', catalogFile);
    await fs.rename(eventsFile + '.tmp', eventsFile);
  } catch (e) {
    await fs.writeFile(catalogFile, JSON.stringify(old.catalog, null, 2) + '\n');
    await fs.writeFile(eventsFile, JSON.stringify(old.events, null, 2) + '\n');
    throw e;
  }
  return { revision: revision(body.catalog, body.events) };
}
