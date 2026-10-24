import { el } from './shared.js';
import { validateIdentification } from './ai-identification.js';

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
  const separate = el('input', { type: 'checkbox' }),
    separateLabel = el(
      'label',
      {},
      'São produtos diferentes (um produto por foto; uma análise por foto)',
    );
  separateLabel.prepend(separate);
  panel.append(
    el('h2', {}, 'Identificar produto com IA'),
    el(
      'p',
      {},
      'Escolhe uma ou mais fotos do mesmo produto, de ângulos diferentes. A IA sugere o nome em inglês, o tipo de produto e a série ou franquia. Revê os campos antes de adicionar. O gestor manual continua disponível.',
    ),
    input,
    separateLabel,
    preview,
    analyze,
    status,
    results,
  );
  document.querySelector('#editor .toolbar').after(panel);
  let images = [],
    working = false;
  async function select(files) {
    if (working) return;
    working = true;
    analyze.disabled = true;
    input.disabled = true;
    images = [];
    results.replaceChildren();
    preview.replaceChildren();
    try {
      if (!files.length || files.length > 8)
        throw Error('Escolhe entre uma e oito fotos do mesmo produto.');
      const prepared = [];
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
          scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
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
      for (const [i, src] of images.entries())
        preview.append(el('img', { src, alt: 'Ângulo ' + (i + 1), class: 'ai-preview' }));
      status.textContent =
        images.length +
        ' foto(s) do mesmo produto prontas. São enviadas ao Gemini através do Supabase ao analisar.';
    } catch (e) {
      status.textContent = e.message;
    } finally {
      working = false;
      analyze.disabled = false;
      input.disabled = false;
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
    separate.disabled = true;
    setBusy(true);
    results.replaceChildren();
    status.textContent = 'A identificar o produto e a franquia…';
    try {
      const groups = separate.checked ? images.map((image) => [image]) : [[...images]];
      const drafts = [];
      for (const photos of groups) {
        const { data, error } = await client.functions.invoke('magus-analyze', {
          body: { task: 'identify', images: photos },
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
        const add = el(
          'button',
          { type: 'button', class: 'button' },
          'Adicionar ao gestor para rever',
        );
        add.onclick = () => {
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
              photos,
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
      separate.disabled = false;
    }
  };
}
