# Identificação de produtos por fotos e prints

Na área opcional **Identificar produto com IA**, o modo predefinido é **Todas as imagens são do mesmo produto**. Cinco fotos originam um produto com cinco fotografias. Podes selecionar vários ficheiros de uma vez ou juntá-los em seleções sucessivas (até oito imagens enviadas). **Limpar imagens** permite começar outro produto.

Se uma print ou montagem tiver várias fotografias do produto, a IA devolve um recorte para cada fotografia, associado ao mesmo produto. Uma verificação das divisórias claras separa também os painéis quando a IA sugere um recorte demasiado amplo. Antes de adicionar ao gestor, podes rever os recortes, ajustar as percentagens e desmarcar fotografias repetidas ou indesejadas. Prints e fotos normais podem ser misturadas no mesmo envio.

O modo **Produtos diferentes — um produto por ficheiro** só deve ser escolhido quando cada ficheiro representa um produto diferente. Consome uma análise por ficheiro; as fotografias dentro de cada print continuam associadas ao produto desse ficheiro. Prints com produtos diferentes misturados devem ser separadas por produto antes de enviar.

O nome continua a ser sugerido em inglês. Categoria significa tipo de produto; subcategoria significa franquia, série, filme, anime ou jogo. Os campos são editáveis e reutilizam a grafia das categorias/subcategorias existentes. O preço continua manual, inicialmente `??€`.

A função recebe `{task: 'identify', images: [...], extractPhotos: true}`. Cada objeto em `produtos` inclui `nome`, `categoria`, `subcategoria` e `fotos`: uma lista de `{imagem, x, y, width, height}`. O índice `imagem` começa em zero; os recortes são frações 0..1 da imagem indicada. Índices, limites e cobertura de todas as imagens do mesmo produto são validados. São permitidas até 48 fotos por produto. Clientes antigos sem `extractPhotos` continuam compatíveis.

**Adicionar ao gestor para rever** só cria alterações pendentes. É necessário **Publicar alterações** para guardar online. O gestor manual, as fotos publicadas, a escolha de logótipos e a navegação pública mantêm-se. Secrets, autenticação e limite de 20 análises/hora não mudam.

Validação automática: cinco fotos num único produto; uma print com três recortes; mistura de fotos e prints; rejeição de recortes inválidos e fontes omitidas; compatibilidade com clientes antigos. Os 31 testes do projeto passaram.
