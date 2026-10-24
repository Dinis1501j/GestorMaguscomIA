import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createServer } from './server.js';
import { readState, saveState, validate } from './storage.js';

test('editor saves photos and data, preserves pending prices, snapshots and rejects conflicting edits', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'magus-test-'));
  await fs.mkdir(path.join(root, 'data'));
  const catalog = {
    version: 1,
    categories: [{ id: 'luz', name: 'Luz', cover: '' }],
    products: [],
  };
  await fs.writeFile(path.join(root, 'data/catalog.json'), JSON.stringify(catalog));
  await fs.writeFile(path.join(root, 'data/events.json'), '[]');
  const state = await readState(root);
  const image = 'images/catalogo/uploads/test.png';
  const next = structuredClone(state);
  next.catalog.products.push({
    id: 'luz-1',
    name: 'Luz',
    category: 'luz',
    subcategory: '',
    price: '??€',
    description: '',
    images: [image],
  });
  next.uploads = [
    {
      path: image,
      data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6B4sAAAAASUVORK5CYII=',
    },
  ];
  await saveState(root, next);
  assert.equal((await readState(root)).catalog.products[0].price, '??€');
  await fs.access(path.join(root, image));
  assert.equal((await fs.readdir(path.join(root, 'backup'))).length, 1);
  await assert.rejects(saveState(root, next), /noutra janela/);
  const latest = await readState(root);
  await assert.rejects(
    saveState(root, {
      ...latest,
      uploads: [{ path: '../../outside.png', data: 'AAAA' }],
    }),
    /Fotografia inválida/,
  );
  const broken = structuredClone(latest);
  broken.catalog.products[0].images = ['missing.jpeg'];
  await assert.rejects(
    saveState(root, { ...broken, uploads: [] }),
    /Fotografia em falta/,
  );
  assert.deepEqual(await readState(root), latest);
});
test('validates missing categories and images instead of publishing broken products', () => {
  assert.throws(
    () =>
      validate(
        {
          version: 1,
          categories: [],
          products: [
            {
              id: 'x',
              name: 'X',
              category: 'missing',
              price: '??€',
              description: '',
              subcategory: '',
              images: [],
            },
          ],
        },
        [],
      ),
    /Peça inválida/,
  );
});
test('HTTP limits editing to same-origin local requests and hides backups', async () => {
  const server = createServer();
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const url = 'http://127.0.0.1:' + server.address().port;
  try {
    for (const p of [
      '/',
      '/catalogo/?c=luminarias',
      '/agenda/',
      '/sobre/',
      '/contacto/',
      '/admin/',
      '/data/catalog.json',
    ])
      assert.equal((await fetch(url + p)).status, 200, p);
    for (const p of [
      '/assets/vendor/supabase.js',
      '/assets/admin-ai.js',
      '/assets/ai-contract.js',
      '/assets/ai-crops.js',
      '/assets/admin-ai.css',
    ])
      assert.equal((await fetch(url + p)).status, 200, p);
    assert.equal(
      (
        await fetch(url + '/api/ai/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Origin: 'https://example.com' },
          body: '{}',
        })
      ).status,
      403,
    );
    const unauthenticated = await fetch(url + '/api/ai/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: url },
      body: '{}',
    });
    assert.equal(unauthenticated.status, 400);
    assert.match((await unauthenticated.json()).error, /Inicia sessão/);
    assert.equal(
      (await fetch(url + '/supabase/functions/magus-analyze/index.ts')).status,
      404,
    );
    assert.equal(
      (await fetch(url + '/backup/2026-09-23-antes-reorganizacao/index.html')).status,
      404,
    );
    assert.equal(
      (
        await fetch(url + '/api/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Origin: 'https://example.com' },
          body: '{}',
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await fetch(url + '/api/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
        })
      ).status,
      403,
    );
  } finally {
    await new Promise((r) => server.close(r));
  }
});
