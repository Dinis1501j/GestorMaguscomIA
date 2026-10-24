import { validatePartners } from './partner-data.js?v=partners3';
import { onlineSettings } from './online-settings.js';

export const onlineEnabled = Boolean(
  onlineSettings.supabaseUrl && onlineSettings.publishableKey,
);
let clientPromise;
export function getClient() {
  if (!onlineEnabled)
    throw Error('A gestão online ainda não foi ativada. Falta ligar o projeto Supabase.');
  if (!clientPromise)
    clientPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = new URL('vendor/supabase.js', import.meta.url).href;
      script.onload = () =>
        resolve(
          window.supabase.createClient(
            onlineSettings.supabaseUrl,
            onlineSettings.publishableKey,
            {
              auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true,
                flowType: 'implicit',
              },
            },
          ),
        );
      script.onerror = () => {
        clientPromise = null;
        reject(Error('Não foi possível carregar o início de sessão. Atualiza a página.'));
      };
      document.head.append(script);
    });
  return clientPromise;
}

export async function publicContent(fetcher = fetch) {
  const url = new URL('/rest/v1/magus_content', onlineSettings.supabaseUrl);
  url.search = 'id=eq.1&select=catalog,events,revision';
  const response = await fetcher(url, {
    headers: { apikey: onlineSettings.publishableKey },
    cache: 'no-store',
  });
  if (!response.ok) throw Error('O catálogo online está temporariamente indisponível.');
  const rows = await response.json();
  if (!rows[0]) throw Error('O conteúdo online ainda não foi importado.');
  return rows[0];
}

export async function requireAdmin(client) {
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw Error('Inicia sessão para gerir o catálogo.');
  const permission = await client.rpc('magus_is_admin');
  if (permission.error || permission.data !== true)
    throw Error('Esta conta não tem autorização para gerir a Magus Art.');
  return data.user;
}

export async function readOnlineState(client) {
  await requireAdmin(client);
  const { data, error } = await client
    .from('magus_content')
    .select('catalog,events,revision')
    .eq('id', 1)
    .single();
  if (error || !data)
    throw Error(
      'Não foi possível carregar o conteúdo. Confirma a importação inicial no Supabase.',
    );
  return data;
}

export function validateContent(catalog, events) {
  if (
    catalog?.version !== 1 ||
    !Array.isArray(catalog.categories) ||
    !Array.isArray(catalog.products) ||
    !Array.isArray(events)
  )
    throw Error('Conteúdo inválido.');
  if (catalog.partners !== undefined) validatePartners(catalog.partners);
  const cats = new Set();
  const ids = new Set();
  const validId = (id) => typeof id === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id);
  for (const c of catalog.categories) {
    if (!validId(c.id) || cats.has(c.id) || !c.name?.trim())
      throw Error('Verifica os nomes e identificadores das categorias.');
    cats.add(c.id);
  }
  for (const p of catalog.products) {
    if (
      !validId(p.id) ||
      ids.has(p.id) ||
      !p.name?.trim() ||
      !cats.has(p.category) ||
      typeof p.price !== 'string' ||
      !Array.isArray(p.images) ||
      !p.images.length
    )
      throw Error(
        'Verifica nome, categoria e fotografias da peça: ' + (p.name || 'sem nome'),
      );
    ids.add(p.id);
  }
  for (const e of events)
    if (!e.title?.trim() || !e.date?.trim())
      throw Error('Preenche o nome e a data de todos os eventos.');
}

export async function saveOnlineState(client, state, uploads) {
  await requireAdmin(client);
  validateContent(state.catalog, state.events);
  const next = structuredClone(state);
  const refs = new Set([
    ...next.catalog.products.flatMap((p) => p.images),
    ...next.catalog.categories.map((c) => c.cover),
  ]);
  for (const upload of uploads.filter((u) => refs.has(u.path))) {
    if (!upload.remoteUrl) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(upload.type))
        throw Error('Formato de imagem não permitido.');
      const bytes = Uint8Array.from(atob(upload.data), (c) => c.charCodeAt(0));
      if (bytes.length > 10 * 1024 * 1024)
        throw Error('Cada fotografia pode ter até 10 MB.');
      const extension = {
        'image/jpeg': 'jpeg',
        'image/png': 'png',
        'image/webp': 'webp',
      }[upload.type];
      const key = crypto.randomUUID() + '.' + extension;
      const bucket = client.storage.from(onlineSettings.bucket);
      const result = await bucket.upload(key, bytes, {
        contentType: upload.type,
        upsert: false,
      });
      if (result.error)
        throw Error(
          'Não foi possível enviar a fotografia. As alterações continuam nesta janela; tenta novamente.',
        );
      upload.remoteUrl = bucket.getPublicUrl(key).data.publicUrl;
    }
    for (const p of next.catalog.products)
      p.images = p.images.map((i) => (i === upload.path ? upload.remoteUrl : i));
    for (const c of next.catalog.categories)
      if (c.cover === upload.path) c.cover = upload.remoteUrl;
  }
  const result = await client.rpc('magus_publish', {
    p_catalog: next.catalog,
    p_events: next.events,
    p_revision: state.revision,
  });
  if (result.error) {
    if (result.error.message?.includes('MAGUS_CONFLICT'))
      throw Error(
        'Outra pessoa publicou alterações entretanto. Exporta uma cópia e recarrega antes de voltar a editar. Nada foi substituído.',
      );
    throw Error(
      'Não foi possível publicar. Verifica a sessão e a ligação; as alterações continuam nesta janela.',
    );
  }
  next.revision = result.data;
  return next;
}
