import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  logosFor,
  setButtonLogos,
  logoReferences,
  replaceLogoReference,
  validateButtonLogos,
} from '../assets/button-logos.js';
import { saveOnlineState, validateContent } from '../assets/online-store.js';
import { onlineSettings } from '../assets/online-settings.js';
const fixture = () => ({
  version: 1,
  categories: [
    { id: 'figuras', name: 'Figuras', cover: '' },
    { id: 'canecas', name: 'Canecas', cover: '' },
  ],
  products: [
    {
      id: 'harry',
      name: 'Harry',
      category: 'figuras',
      subcategory: 'Harry Potter',
      price: '10€',
      description: '',
      images: ['harry.jpeg'],
    },
  ],
});
test('logos are independent by category and subcategory, keep their order, and preserve old records', () => {
  const catalog = fixture(),
    original = JSON.stringify([catalog.categories, catalog.products]);
  assert.deepEqual(logosFor(catalog, 'figuras'), []);
  setButtonLogos(catalog, 'figuras', null, ['one.png', 'two.webp']);
  setButtonLogos(catalog, 'figuras', 'Harry Potter', ['three.png']);
  setButtonLogos(catalog, 'canecas', 'Harry Potter', ['four.png']);
  setButtonLogos(catalog, 'figuras', '', ['other.png']);
  assert.deepEqual(logosFor(catalog, 'figuras'), ['one.png', 'two.webp']);
  assert.deepEqual(logosFor(catalog, 'figuras', 'Harry Potter'), ['three.png']);
  assert.deepEqual(logosFor(catalog, 'figuras', ''), ['other.png']);
  setButtonLogos(catalog, 'figuras', null, []);
  assert.deepEqual(logosFor(catalog, 'figuras'), []);
  assert.equal(JSON.stringify([catalog.categories, catalog.products]), original);
});
test('invalid, duplicate and oversized button definitions cannot be published', () => {
  for (const entries of [
    null,
    [{ category: 'missing', subcategory: null, images: ['a.png'] }],
    [{ category: 'figuras', subcategory: null, images: Array(9).fill('a.png') }],
    [{ category: 'figuras', subcategory: null, images: ['javascript:alert(1)'] }],
  ]) {
    const catalog = fixture();
    catalog.buttonLogos = entries;
    assert.throws(() => validateContent(catalog, []));
  }
  const catalog = fixture();
  setButtonLogos(catalog, 'figuras', null, ['a.png']);
  catalog.buttonLogos.push(catalog.buttonLogos[0]);
  assert.throws(() => validateButtonLogos(catalog, () => true));
});
test('online save uploads logo-only assets once, retains transparency, and remaps every reference', async () => {
  const state = { catalog: fixture(), events: [], revision: 10 },
    path = 'images/catalogo/uploads/test.png';
  setButtonLogos(state.catalog, 'figuras', null, [path]);
  setButtonLogos(state.catalog, 'figuras', 'Harry Potter', [path]);
  const uploads = [{ path, type: 'image/png', data: 'iVBORw0KGgo=' }],
    calls = [];
  let published;
  const url =
    onlineSettings.supabaseUrl +
    '/storage/v1/object/public/' +
    onlineSettings.bucket +
    '/remote.png';
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: 'admin' } } }) },
    storage: {
      from: () => ({
        upload: async (key, bytes, opts) => {
          calls.push(opts);
          return {};
        },
        getPublicUrl: () => ({ data: { publicUrl: url } }),
      }),
    },
    rpc: async (name, args) => {
      if (name === 'magus_is_admin') return { data: true };
      published = args;
      return { data: 11 };
    },
  };
  const result = await saveOnlineState(client, state, uploads);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].contentType, 'image/png');
  assert.deepEqual(logoReferences(result.catalog), [url, url]);
  assert.equal(published.p_catalog.products[0].images[0], 'harry.jpeg');
  assert.equal(result.revision, 11);
  assert.deepEqual(logoReferences(state.catalog), [path, path]);
  validateContent(result.catalog, []);
  await saveOnlineState(client, state, uploads);
  assert.equal(calls.length, 1);
});
test('a failed upload never publishes catalog changes', async () => {
  const state = { catalog: fixture(), events: [], revision: 1 };
  const path = 'images/catalogo/uploads/fail.png';
  setButtonLogos(state.catalog, 'figuras', null, [path]);
  let published = false;
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: 'admin' } } }) },
    rpc: async (name) => {
      if (name !== 'magus_is_admin') published = true;
      return { data: true };
    },
    storage: { from: () => ({ upload: async () => ({ error: 'failed' }) }) },
  };
  await assert.rejects(
    saveOnlineState(client, state, [{ path, type: 'image/png', data: 'aGVsbG8=' }]),
    /enviar/,
  );
  assert.equal(published, false);
});
