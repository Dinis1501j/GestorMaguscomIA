import { el } from './shared.js';
import { validateIdentification } from './ai-identification.js';
import { photoGroups } from './ai-photo-regions.js';
import { createPhotoReview } from './ai-photo-review.js?v=panels1';

export function startAI({ client, getState, addProducts, setBusy }) {
  const panel = el('section', { class: 'ai-panel' }),
    input = el('input', {
      type: 'file',
      accept: 'image/jpeg,image/png,image/webp',
      multiple: '',
      'aria-label': 'Fotos do produto',
    }),
    preview = el('div', { class: 'ai-previews' }),
    analyze = el(
      'button',
      { type: 'button', class: 'button' },
      'Identificar produto com IA',
    ),
    status = el('p', { role: 'status', 'aria-live': 'polite' }),
    results = el('div');
  const mode = el('select', { 'aria-label': 'Como agrupar as imagens' });
  mode.append(
    el('option', { value: 'same' }, 'Todas as imagens são do mesmo produto'),
    el('option', { value: 'separate' }, 'Produtos diferentes — um produto por ficheiro'),
  );
  mode.value = 'same';
  const modeLabel = el('label', {}, 'Como agrupar as imagens');
  modeLabel.append(mode);
  const clear = el('button', { type: 'button', class: 'button' }, 'Limpar imagens');
  panel.append(
    el('h2', {}, 'Identificar produto com IA'),
    el(
      'p',
      {},
      'Adiciona fotos ou prints. Por defeito, todas pertencem a um único produto. Se uma print tiver várias fotografias, a IA separa-as para as associares ao mesmo produto. Revê os dados e os recortes antes de adicionar.',
    ),
    input,
    modeLabel,
    clear,
    preview,
    analyze,
    status,
    results,
  );
  document.querySelector('#editor .toolbar').after(panel);
  let images = [],
    working = false;
  function renderSources() {
    preview.replaceChildren();
    for (const [index, src] of images.entries()) {
      const wrapper = el('div'),
        remove = el(
          'button',
          { type: 'button', class: 'button' },
          'Retirar imagem ' + (index + 1),
        );
      remove.onclick = () => {
        if (working) return;
        images.splice(index, 1);
        results.replaceChildren();
        renderSources();
        status.textContent = images.length + ' imagem(ns) pronta(s).';
      };
      wrapper.append(
        el('img', { src, alt: 'Imagem enviada ' + (index + 1), class: 'ai-preview' }),
        remove,
      );
      preview.append(wrapper);
    }
  }
  clear.onclick = () => {
    if (working) return;
    images = [];
    input.value = '';
    results.replaceChildren();
    renderSources();
    status.textContent = 'Adiciona as imagens de um produto para começar.';
  };
  mode.onchange = () => {
    results.replaceChildren();
    status.textContent =
      mode.value === 'same'
        ? 'Será criado um único produto com todas as fotografias.'
        : 'Será analisado um produto por ficheiro. As fotografias dentro de cada print ficam juntas.';
  };
  async function select(files) {
    if (working) return;
    working = true;
    analyze.disabled = true;
    input.disabled = true;
    results.replaceChildren();
    try {
      if (!files.length || files.length + images.length > 8)
        throw Error(
          'Podes adicionar até oito imagens. Retira algumas ou usa “Limpar imagens”.',
        );
      const prepared = [...images];
      for (const file of files) {
        if (
          !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
          file.size > 10 * 1024 * 1024
        )
          throw Error('Usa JPEG, PNG ou WebP até 10 MB por foto.');
        const url = URL.createObjectURL(file),
          image = new Image();
        try {
          image.src = url;
          await image.decode();
        } finally {
          URL.revokeObjectURL(url);
        }
        if (image.naturalWidth * image.naturalHeight > 40000000)
          throw Error('Reduz a resolução da fotografia.');
        const canvas = document.createElement('canvas'),
          scale = Math.min(1, 2200 / Math.max(image.naturalWidth, image.naturalHeight));
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        prepared.push(canvas.toDataURL('image/jpeg', 0.85));
      }
      if (prepared.reduce((n, s) => n + s.length, 0) > 7 * 1024 * 1024)
        throw Error(
          'As fotos são demasiado grandes. Reduz a resolução ou envia menos fotos.',
        );
      images = prepared;
      renderSources();
      status.textContent =
        images.length +
        ' imagem(ns) pronta(s). ' +
        (mode.value === 'same'
          ? 'Todas serão analisadas como um único produto.'
          : 'Será analisado um produto por ficheiro.') +
        ' As imagens são enviadas ao Gemini através do Supabase.';
    } catch (e) {
      status.textContent = e.message;
    } finally {
      working = false;
      analyze.disabled = false;
      input.disabled = false;
      input.value = '';
    }
  }
  input.onchange = () => select([...input.files]);
  panel.tabIndex = 0;
  panel.addEventListener('paste', (e) => {
    const files = [...e.clipboardData.items]
      .filter((i) => i.kind === 'file')
      .map((i) => i.getAsFile())
      .filter(Boolean);
    if (files.length) {
      e.preventDefault();
      select(files);
    }
  });
  analyze.onclick = async () => {
    if (working) return;
    if (!images.length) {
      status.textContent = 'Escolhe primeiro as fotos do produto.';
      return;
    }
    working = true;
    analyze.disabled = true;
    input.disabled = true;
    mode.disabled = true;
    clear.disabled = true;
    setBusy(true);
    results.replaceChildren();
    status.textContent = 'A identificar o produto e a franquia…';
    try {
      const groups = photoGroups(images, mode.value);
      const drafts = [];
      for (const photos of groups) {
        const { data, error } = await client.functions.invoke('magus-analyze', {
          body: { task: 'identify', images: photos, extractPhotos: true },
        });
        if (error) {
          let detail;
          try {
            detail = (await error.context.json()).error;
          } catch {}
          throw Error(detail || 'Não foi possível contactar a IA.');
        }
        const state = getState(),
          subcategories = [
            ...new Set(state.catalog.products.map((p) => p.subcategory).filter(Boolean)),
          ];
        const p = validateIdentification(data, state.catalog.categories, subcategories)
          .produtos[0];
        drafts.push({ p, photos, state, subcategories });
      }
      for (const [index, { p, photos, state, subcategories }] of drafts.entries()) {
        const card = el('fieldset', { class: 'ai-card' });
        card.append(el('legend', {}, 'Sugestão — um único produto'));
        const name = el('input', { value: p.nome, maxlength: 180 }),
          category = el('select'),
          subcategory = el('input', {
            value: p.subcategoria,
            maxlength: 180,
            list: 'ai-existing-subcategories-' + index,
          }),
          price = el('input', { value: '??€', maxlength: 60 }),
          list = el('datalist', { id: 'ai-existing-subcategories-' + index });
        category.append(el('option', { value: '' }, 'Seleciona uma categoria'));
        for (const c of state.catalog.categories)
          category.append(el('option', { value: c.id }, c.name));
        category.value =
          state.catalog.categories.find((c) => c.name === p.categoria)?.id || '';
        for (const s of subcategories) list.append(el('option', { value: s }));
        for (const [title, control] of [
          ['Nome em inglês', name],
          ['Categoria (tipo de produto)', category],
          ['Subcategoria (série, filme, anime ou jogo)', subcategory],
          ['Preço — preencher manualmente', price],
        ]) {
          const label = el('label', {}, title);
          label.append(control);
          card.append(label);
        }
        card.append(
          list,
          el(
            'p',
            {},
            'Campos vazios indicam incerteza ou ausência de uma categoria adequada. Confirma a identificação. Todas as fotos serão associadas a este produto.',
          ),
        );
        const reviewedPhotos = await createPhotoReview(card, p, photos);
        const add = el(
          'button',
          { type: 'button', class: 'button' },
          'Adicionar ao gestor para rever',
        );
        add.onclick = () => {
          let finalPhotos;
          try {
            finalPhotos = reviewedPhotos();
          } catch (error) {
            status.textContent = error.message;
            return;
          }
          if (!name.value.trim() || !category.value || !price.value.trim()) {
            status.textContent =
              'Preenche o nome, a categoria e o preço (ou ??€) antes de adicionar.';
            return;
          }
          if (!getState().catalog.categories.some((c) => c.id === category.value)) {
            status.textContent = 'A categoria já não existe. Volta a analisar.';
            return;
          }
          addProducts([
            {
              name: name.value.trim(),
              category: category.value,
              subcategory: subcategory.value.trim(),
              price: price.value.trim(),
              photos: finalPhotos,
            },
          ]);
          card.remove();
          add.remove();
          status.textContent =
            'Produto adicionado ao gestor para revisão. Usa “Publicar alterações” quando terminares.';
        };
        results.append(card, add);
      }
      status.textContent =
        'Identificação concluída. Revê e corrige os campos; nada foi guardado ou publicado.';
    } catch (e) {
      status.textContent = e.message;
    } finally {
      working = false;
      setBusy(false);
      analyze.disabled = false;
      input.disabled = false;
      mode.disabled = false;
      clear.disabled = false;
    }
  };
}
