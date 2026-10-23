# GestorMaguscomIA — Magus Art

## Assistente IA acrescentado

O gestor manual foi preservado e ganhou a área **Importar produtos com IA**. A função `magus-analyze` e os limites de utilização foram instalados no Supabase. Falta configurar a chave da API de IA e concluir um teste com uma print real. Consulta [ATIVAR-IA.md](ATIVAR-IA.md) para configuração e reinstalação.

Site estático em HTML, CSS e JavaScript. Não necessita de dependências npm.

## Abrir o site e gerir conteúdo

1. Com Node.js 20 ou superior instalado, abre `Abrir-gestor.cmd`.
2. Mantém essa janela aberta e visita http://127.0.0.1:4173/admin/.
3. Escolhe uma peça ou cria uma nova. Preenche o nome, categoria, subcategoria, preço e descrição.
4. Adiciona fotografias JPEG, PNG ou WebP (até 10 MB cada). A primeira é a capa; usa as setas para ordenar.
5. Inicia sessão com uma conta administradora e carrega em **Publicar alterações**. A gravação envia fotografias e conteúdo para o Supabase, com controlo de versões para impedir que uma edição sobreponha outra.
6. Abre **Ver site** para confirmar o resultado.

Também podes executar `npm start` na pasta do site.

Os preços `??€` são intencionais e ficam assim até confirmação do responsável. Os preços são guardados como texto. Os identificadores são estáveis: alterar o nome de uma categoria não quebra o respetivo endereço.

As 17 fotografias inicialmente fora do catálogo aparecem em **Fotografias por rever**. Escolhe uma peça e associa a fotografia, ou cria uma nova peça antes de a associar. Não foram publicadas automaticamente. Os ficheiros originais foram preservados para manter os caminhos existentes.

O gestor usa autenticação e permissões de administrador no Supabase. Pode funcionar no servidor local ou num alojamento HTTPS que inclua `admin/`. Os dois repositórios usam o mesmo projeto Supabase: publicar por qualquer gestor atualiza o catálogo partilhado. Exporta uma cópia antes de alterações importantes.

## Páginas e ligações

- Início: `index.html`
- Catálogo: `catalogo/`; categoria: `catalogo/?c=luminarias`
- Agenda: `agenda/`
- Sobre e processo: `sobre/` e `sobre/#processo`
- Contactos e parceiros: `contacto/` e `contacto/#parceiros`

Os links antigos `#galeria`, `#sobre`, `#processo`, `#agenda`, `#contacto` e `#parceiros` são encaminhados pelo navegador. Os caminhos relativos suportam tanto um domínio próprio como o prefixo `/testemagusart2/` do GitHub Pages. Categorias usam navegação normal: atualizar, partilhar e voltar no navegador funciona sem regras especiais de servidor.

## Organização

- `data/catalog.json`: categorias e produtos (cada produto aceita várias imagens).
- `data/events.json`: agenda.
- `data/unassigned.json`: inventário das fotografias originalmente por rever.
- `images/logo.png`: logótipo partilhado.
- `images/catalogo/`: fotografias organizadas; as carregadas no gestor recebem nomes únicos em `uploads/`.
- `assets/`: estilos e comportamento partilhados.
- `tools/`: servidor local, validação, testes e preparação para publicação.

## Verificar e publicar

Executa `npm run check` e `npm test`. `npm run build` cria uma pasta nova em `dist/site-...` com os ficheiros públicos; exclui o gestor, o servidor e os backups. Publica o **conteúdo** dessa pasta no alojamento, ou usa os ficheiros fonte numa configuração existente de GitHub Pages, sem incluir `backup/`.

Publicar no gestor atualiza o Supabase; não cria commits no GitHub. O catálogo público consulta o Supabase ao abrir a página. Alterações ao código precisam de publicação no alojamento. O novo repositório contém o código, mas criar o repositório não ativa automaticamente GitHub Pages.

Não abras os HTML por duplo clique: o catálogo carrega dados JSON e precisa de um servidor HTTP. Usa o endereço apresentado pelo gestor.

## Recuperação

A cópia integral anterior à reorganização está em `../backups/magus-art-20260923-214518/main/`, fora da pasta pública. Para recuperar uma edição do catálogo, fecha o gestor, copia `catalog.json` e `events.json` do backup escolhido para `data/` e volta a abrir o gestor. As fotografias nunca são apagadas ao remover peças. **Exportar cópia** permite também descarregar os dados em edição, incluindo novas imagens, para salvaguarda manual; não é um pacote para publicação.
