import { asset, el, json, error } from './shared.js?v=online1';
import { logosFor } from './button-logos.js';
const container = document.querySelector('#catalog'),
  title = document.querySelector('#catalog-title'),
  count = document.querySelector('#catalog-count'),
  search = document.querySelector('#search');
const dialog = document.querySelector('#lightbox');
let active,
  photo = 0;
function updatePhoto() {
  const img = document.querySelector('#large-photo');
  img.src = asset(active.images[photo]);
  img.alt = active.name + ' — fotografia ' + (photo + 1);
  document.querySelector('#photo-count').textContent =
    `${photo + 1} / ${active.images.length}`;
  document.querySelector('#prev-photo').disabled = photo === 0;
  document.querySelector('#next-photo').disabled = photo === active.images.length - 1;
}
function openPhoto(p) {
  if (!p.images.length) return;
  active = p;
  photo = 0;
  document.querySelector('#photo-title').textContent = p.name;
  updatePhoto();
  dialog.showModal();
}
document.querySelector('#close-photo').onclick = () => dialog.close();
document.querySelector('#prev-photo').onclick = () => {
  if (photo > 0) {
    photo--;
    updatePhoto();
  }
};
document.querySelector('#next-photo').onclick = () => {
  if (photo < active.images.length - 1) {
    photo++;
    updatePhoto();
  }
};
dialog.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') document.querySelector('#prev-photo').click();
  if (e.key === 'ArrowRight') document.querySelector('#next-photo').click();
});
dialog.addEventListener('click', (e) => {
  if (e.target === dialog) {
    const r = dialog.getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      dialog.close();
  }
});
const fold = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
const slug = (s) =>
  fold(s)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'subcategoria';
const pieces = (n) => `${n} ${n === 1 ? 'peça' : 'peças'}`;
const route = (category, subcategory) =>
  '#' +
  [category, subcategory]
    .filter((v) => v !== undefined)
    .map(encodeURIComponent)
    .join('/');
// Groups are derived only for display; catalog data and product fields stay intact.
function subcategories(products) {
  const groups = new Map();
  for (const p of products) {
    const key = typeof p.subcategory === 'string' ? p.subcategory.trim() : '';
    if (!groups.has(key)) groups.set(key, { name: key || 'Outros', key, products: [] });
    groups.get(key).products.push(p);
  }
  const used = new Set(['outros']);
  for (const group of groups.values()) {
    if (!group.key) {
      group.id = 'outros';
      continue;
    }
    const base = slug(group.name);
    let id = base,
      n = 2;
    while (used.has(id)) id = base + '-' + n++;
    used.add(id);
    group.id = id;
  }
  return [...groups.values()];
}
try {
  const data = await json('data/catalog.json');
  const categories = data.categories.map((category) => ({
    ...category,
    products: data.products.filter((p) => p.category === category.id),
  }));
  for (const category of categories) category.groups = subcategories(category.products);
  const matches = (p) =>
    !search.value.trim() ||
    fold([p.name, p.subcategory, p.description].join(' ')).includes(
      fold(search.value.trim()),
    );
  function card(name, href, products, cover, logos = []) {
    const link = el('a', {
      class: 'category-card' + (logos.length ? ' has-button-logos' : ''),
      href,
    });
    if (logos.length) {
      const artwork = el('div', { class: 'button-logos', 'aria-hidden': 'true' });
      for (const image of logos)
        artwork.append(el('img', { src: asset(image), alt: '', loading: 'lazy' }));
      link.append(artwork);
    } else if (cover)
      link.append(
        el('img', {
          class: 'category-cover',
          src: asset(cover),
          alt: '',
          loading: 'lazy',
        }),
      );
    link.append(
      el('h3', {}, name),
      el('span', { class: 'cat-count' }, pieces(products.length)),
    );
    return link;
  }
  function breadcrumb(selected, group) {
    const nav = el('nav', {
        class: 'catalog-breadcrumb',
        'aria-label': 'Caminho do catálogo',
      }),
      list = el('ol');
    const parts = [
      ['Início', '#'],
      ...(selected ? [[selected.name, route(selected.id)]] : []),
      ...(group ? [[group.name, route(selected.id, group.id)]] : []),
    ];
    parts.forEach(([name, href], index) => {
      const item = el('li'),
        link = el('a', { href }, name);
      if (index === parts.length - 1) link.setAttribute('aria-current', 'page');
      item.append(link);
      list.append(item);
    });
    nav.append(list);
    container.append(nav);
  }
  function render() {
    let segments;
    try {
      segments = location.hash
        .slice(1)
        .split('/')
        .filter(Boolean)
        .map(decodeURIComponent);
    } catch {
      segments = ['invalid', 'invalid', 'invalid'];
    }
    // The page's skip link is an accessibility anchor, not a catalog destination.
    if (segments.length === 1 && segments[0] === 'conteudo') segments = [];
    const selected = categories.find((c) => c.id === segments[0]),
      group = selected?.groups.find((s) => s.id === segments[1]);
    container.replaceChildren();
    breadcrumb(selected, group);
    title.textContent = group?.name || selected?.name || 'Catálogo';
    document.title = title.textContent + ' — Magus Art';
    if (
      segments.length > 2 ||
      (segments.length && !selected) ||
      (segments.length === 2 && !group)
    ) {
      title.textContent = 'Página não encontrada';
      count.textContent = '';
      container.append(
        el(
          'a',
          { class: 'back-btn', href: selected ? route(selected.id) : '#' },
          '← Voltar',
        ),
        el(
          'p',
          { class: 'empty-category' },
          'Esta categoria ou subcategoria não existe. Escolhe uma opção no caminho acima.',
        ),
      );
      return;
    }
    if (selected)
      container.append(
        el(
          'a',
          { class: 'back-btn', href: group ? route(selected.id) : '#' },
          '← Voltar',
        ),
      );
    if (!selected) {
      const visible = categories.filter(
          (c) => !search.value.trim() || c.products.some(matches),
        ),
        grid = el('div', { class: 'catalog-grid' });
      for (const c of visible) {
        const products = c.products.filter(matches);
        grid.append(
          card(
            c.name,
            route(c.id),
            products,
            c.cover || products[0]?.images[0],
            logosFor(data, c.id),
          ),
        );
      }
      container.append(
        visible.length
          ? grid
          : el(
              'p',
              { class: 'empty-category' },
              'Não encontrámos categorias com peças para essa pesquisa.',
            ),
      );
      count.textContent = `${visible.length} categorias`;
      return;
    }
    if (!group) {
      const visible = selected.groups
          .map((s) => ({ ...s, products: s.products.filter(matches) }))
          .filter((s) => s.products.length),
        grid = el('div', { class: 'catalog-grid' });
      for (const s of visible)
        grid.append(
          card(
            s.name,
            route(selected.id, s.id),
            s.products,
            s.products[0]?.images[0],
            logosFor(data, selected.id, s.key),
          ),
        );
      container.append(
        visible.length
          ? grid
          : el(
              'p',
              { class: 'empty-category' },
              selected.products.length
                ? 'Não encontrámos subcategorias com peças para essa pesquisa.'
                : 'Ainda não há peças nesta categoria.',
            ),
      );
      count.textContent = `${visible.length} subcategorias`;
      return;
    }
    const products = group.products.filter(matches),
      grid = el('div', { class: 'detail-grid' });
    count.textContent = pieces(products.length);
    for (const p of products) {
      const product = el('article', { class: 'product-card', id: p.id }),
        image = el('button', {
          class: 'tile img-tile',
          type: 'button',
          'aria-label': 'Ampliar fotografias de ' + p.name,
        });
      if (p.images.length)
        image.append(
          el('img', {
            src: asset(p.images[0]),
            alt: p.name,
            loading: 'lazy',
            decoding: 'async',
            width: '400',
            height: '500',
          }),
        );
      else image.disabled = true;
      image.onclick = () => openPhoto(p);
      const info = el('div', { class: 'product-info' });
      info.append(
        el('h3', { class: 'product-name' }, p.name),
        el('div', { class: 'product-price' }, p.price),
      );
      if (p.description) info.append(el('p', {}, p.description));
      info.append(
        el(
          'a',
          {
            class: 'button',
            href:
              'https://wa.me/351927732127?text=' +
              encodeURIComponent('Olá! Gostava de saber mais sobre ' + p.name + '.'),
            target: '_blank',
            rel: 'noopener',
          },
          'Perguntar sobre esta peça',
        ),
      );
      product.append(image, info);
      grid.append(product);
    }
    container.append(
      products.length
        ? grid
        : el(
            'p',
            { class: 'empty-category' },
            'Não encontrámos peças com essa pesquisa.',
          ),
    );
  }
  // Keep existing ?c= links working while sharing the new hash-based navigation.
  const initial = new URL(location.href),
    legacy = initial.searchParams.get('c');
  if (legacy) {
    if (!initial.hash) initial.hash = route(legacy);
    initial.searchParams.delete('c');
    history.replaceState(null, '', initial);
  }
  search.value = initial.searchParams.get('q') || '';
  search.addEventListener('input', () => {
    const url = new URL(location.href);
    if (search.value) url.searchParams.set('q', search.value);
    else url.searchParams.delete('q');
    history.replaceState(null, '', url);
    render();
  });
  const restore = () => {
    search.value = new URLSearchParams(location.search).get('q') || '';
    render();
  };
  window.addEventListener('popstate', restore);
  window.addEventListener('hashchange', () => {
    restore();
    title.focus({ preventScroll: true });
    title.scrollIntoView({ block: 'start', behavior: 'instant' });
  });
  render();
} catch (e) {
  error(container, e);
}
