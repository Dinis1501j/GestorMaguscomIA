# Identificação de produtos por fotografias

A área opcional “Identificar produto com IA” aceita até oito fotografias JPEG, PNG ou WebP. Por defeito, todas representam ângulos do mesmo produto e originam um único rascunho. A opção “São produtos diferentes” identifica cada foto separadamente (consome uma análise por foto).

O Gemini devolve JSON com `produtos: [{nome, categoria, subcategoria}]`. O nome é solicitado em inglês. Categoria significa tipo de produto; subcategoria significa série, filme, anime ou jogo. A função consulta o catálogo atual no Supabase para reutilizar as categorias e subcategorias existentes. A normalização ignora maiúsculas e acentos, preservando a grafia já utilizada. Categorias desconhecidas ficam vazias e não são criadas automaticamente. Franquias incertas devem ficar vazias.

Todos os campos são editáveis antes de adicionar. O preço é preenchido manualmente (inicialmente `??€`). As fotografias são preservadas, sem recortes automáticos. “Adicionar ao gestor para rever” cria apenas alterações pendentes; “Publicar alterações” continua a ser necessário para guardar online.

Criar, editar e apagar manualmente mantém o funcionamento existente. A integração apenas transfere o rascunho confirmado e a subcategoria para o editor. A autenticação de administrador, a chave Gemini guardada no Supabase e o limite de 20 análises/hora mantêm-se. Não são criados produtos nos testes.

A antiga análise de prints permanece compatível no endpoint através de `{image}`; a nova interface usa `{task: 'identify', images: [...]}`. A configuração de secrets descrita em IA-ONLINE.md mantém-se; a pesquisa pública do modo antigo não é usada na identificação nova.

Validação online em 24/10/2026: três fotografias originaram um único produto, Pokémon Poké Ball Keychain / Porta-Chaves / Pokémon. Confirmada a passagem das três fotos e subcategoria ao editor. O teste não foi publicado. A limpeza do rascunho pendente não pôde ser confirmada porque o navegador deixou de responder ao aviso de saída. 22 testes automáticos passaram (incluindo os testes do gestor manual).
