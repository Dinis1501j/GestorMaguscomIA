import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  identifyProduct,
  validateImages,
} from '../supabase/functions/magus-analyze/identify.js';
import { validateIdentification } from '../assets/ai-identification.js';
const categories = [{ id: 'figures', name: 'Figuras' }],
  images = ['data:image/png;base64,aGVsbG8=', 'data:image/jpeg;base64,d29ybGQ='];
test('multiple angles produce one English named draft with canonical existing taxonomy', async () => {
  let sent;
  const result = await identifyProduct(
    { images, categories, subcategories: ['Pokémon'], key: 'test' },
    async (url, options) => {
      sent = JSON.parse(options.body);
      return Response.json({
        candidates: [
          {
            finishReason: 'STOP',
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    produtos: [
                      {
                        nome: 'Pikachu Figure',
                        categoria: 'figuras',
                        subcategoria: 'pokemon',
                      },
                    ],
                  }),
                },
              ],
            },
          },
        ],
      });
    },
  );
  assert.deepEqual(result, {
    produtos: [{ nome: 'Pikachu Figure', categoria: 'Figuras', subcategoria: 'Pokémon' }],
  });
  assert.equal(sent.contents[0].parts.length, 2);
  assert.equal(sent.contents[0].parts[0].inlineData.mimeType, 'image/png');
  assert.equal(sent.contents[0].parts[1].inlineData.mimeType, 'image/jpeg');
  assert.match(sent.systemInstruction.parts[0].text, /exactly ONE/);
  assert.match(sent.systemInstruction.parts[0].text, /MUST be in English/);
  assert.match(sent.systemInstruction.parts[0].text, /Never invent brands/);
});
test('unknown taxonomy stays empty and several products cannot silently split one product', () => {
  assert.equal(
    validateIdentification(
      { produtos: [{ nome: 'Wizard Figure', categoria: 'Figures', subcategoria: '' }] },
      categories,
      [],
    ).produtos[0].categoria,
    '',
  );
  assert.throws(() =>
    validateIdentification(
      {
        produtos: [
          { nome: 'A', categoria: '', subcategoria: '' },
          { nome: 'B', categoria: '', subcategoria: '' },
        ],
      },
      categories,
      [],
    ),
  );
  assert.throws(() => validateImages(Array(9).fill(images[0])));
  assert.throws(() => validateImages(['https://example.com/image']));
});
test('free quota failures do not retry or expose the key', async () => {
  let calls = 0;
  await assert.rejects(
    identifyProduct({ images, categories, key: 'private-key' }, async () => {
      calls++;
      return new Response('', { status: 429 });
    }),
    (e) => e.status === 429 && !e.message.includes('private-key'),
  );
  assert.equal(calls, 1);
});

test('authenticated identification uses existing live taxonomy and never writes catalog data', async () => {
  const { createAnalyzeHandler } = await import(
    '../supabase/functions/magus-analyze/handler.js'
  );
  const rpc = [];
  let prompt;
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: 'admin' } } }) },
    rpc: async (name) => {
      rpc.push(name);
      return { data: true };
    },
    from: (table) => {
      assert.equal(table, 'magus_content');
      return {
        select: () => ({
          eq: () => ({
            single: async () => ({
              data: {
                catalog: { categories, products: [{ subcategory: 'Harry Potter' }] },
              },
            }),
          }),
        }),
      };
    },
  };
  const values = { MAGUS_ALLOWED_ORIGINS: 'https://magusart.pt', GEMINI_API_KEY: 'test' };
  const handler = createAnalyzeHandler({
    createClient: () => client,
    env: (name) => values[name],
    fetcher: async (url, options) => {
      prompt = JSON.parse(options.body).systemInstruction.parts[0].text;
      return Response.json({
        candidates: [
          {
            finishReason: 'STOP',
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    produtos: [
                      {
                        nome: 'Harry Potter Wizard Figure',
                        categoria: 'Figuras',
                        subcategoria: 'Harry Potter',
                      },
                    ],
                  }),
                },
              ],
            },
          },
        ],
      });
    },
  });
  const response = await handler(
    new Request('https://example.com', {
      method: 'POST',
      headers: {
        Origin: 'https://magusart.pt',
        Authorization: 'Bearer test',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ task: 'identify', images }),
    }),
  );
  assert.equal(response.status, 200);
  assert.equal((await response.json()).produtos[0].subcategoria, 'Harry Potter');
  assert.match(prompt, /Harry Potter/);
  assert.deepEqual(rpc, ['magus_is_admin', 'magus_ai_take_slot']);
});
