import { test } from 'node:test';
import assert from 'node:assert/strict';
import { photoGroups, validatePhotoRegions } from '../assets/ai-photo-regions.js';
import { identifyProduct } from '../supabase/functions/magus-analyze/identify.js';
const image = 'data:image/jpeg;base64,aGVsbG8=',
  categories = [{ id: 'figuras', name: 'Figuras' }];
const full = (imagem) => ({ imagem, x: 0, y: 0, width: 1, height: 1 });
const product = (fotos) => ({
  nome: 'Harry Potter Figure',
  categoria: 'Figuras',
  subcategoria: 'Harry Potter',
  fotos,
});
const mock =
  (value, capture = () => {}) =>
  async (url, options) => {
    capture(JSON.parse(options.body));
    return Response.json({
      candidates: [
        {
          finishReason: 'STOP',
          content: { parts: [{ text: JSON.stringify({ produtos: [value] }) }] },
        },
      ],
    });
  };
test('five source photos default to one product; only explicit separate mode creates five groups', async () => {
  const images = Array(5).fill(image);
  assert.equal(photoGroups(images, 'same').length, 1);
  assert.equal(photoGroups(images, undefined).length, 1);
  assert.equal(photoGroups(images, 'separate').length, 5);
  let request;
  const result = await identifyProduct(
    { images, categories, key: 'test', extractPhotos: true },
    mock(product(images.map((_, i) => full(i))), (body) => (request = body)),
  );
  assert.equal(result.produtos.length, 1);
  assert.equal(result.produtos[0].fotos.length, 5);
  assert.match(request.systemInstruction.parts[0].text, /exactly ONE/);
  assert.match(request.systemInstruction.parts[0].text, /EVERY submitted image/);
  assert.equal(request.contents[0].parts.filter((p) => p.inlineData).length, 5);
});
test('one screenshot containing three photos keeps one product with three independent crops', async () => {
  const fotos = [0, 0.34, 0.68].map((x) => ({
    imagem: 0,
    x,
    y: 0.1,
    width: 0.3,
    height: 0.8,
  }));
  const result = await identifyProduct(
    { images: [image], categories, key: 'test', extractPhotos: true },
    mock(product(fotos)),
  );
  assert.equal(result.produtos.length, 1);
  assert.deepEqual(result.produtos[0].fotos, fotos);
});
test('several screenshots and standalone photos share a product with explicit source mapping', async () => {
  const fotos = [
    { imagem: 0, x: 0, y: 0, width: 0.5, height: 1 },
    { imagem: 0, x: 0.5, y: 0, width: 0.5, height: 1 },
    full(1),
    full(2),
  ];
  const result = await identifyProduct(
    { images: [image, image, image], categories, key: 'test', extractPhotos: true },
    mock(product(fotos)),
  );
  assert.equal(result.produtos[0].fotos.length, 4);
});
test('bad image indices, out-of-bounds crops and omitted source images are rejected', async () => {
  for (const fotos of [[full(9)], [{ ...full(0), width: 2 }], [full(0)], []]) {
    await assert.rejects(
      identifyProduct(
        { images: [image, image], categories, key: 'test', extractPhotos: true },
        mock(product(fotos)),
      ),
      (e) => e.status === 422,
    );
  }
  assert.throws(() => validatePhotoRegions({ fotos: [{ ...full(0), x: NaN }] }, 1));
});
