# Magus Art — testemagusart2

## Assistente IA acrescentado

O gestor manual foi preservado e ganhou a área **Importar produtos com IA**. Consulta [ATIVAR-IA.md](ATIVAR-IA.md) para instalar a função protegida no Supabase e configurar a chave de IA. A função ainda precisa de ativação; a ligação pública ao Supabase não permite fazer essa instalação.

Site estático em HTML, CSS e JavaScript. Não necessita de dependências npm.

## Abrir o site e gerir conteúdo

1. Com Node.js 20 ou superior instalado, abre `Abrir-gestor.cmd`.
2. Mantém essa janela aberta e visita http://127.0.0.1:4173/admin/.
3. Escolhe uma peça ou cria uma nova. Preenche o nome, categoria, subcategoria, preço e descrição.
4. Adiciona fotografias JPEG, PNG ou WebP (até 10 MB cada). A primeira é a capa; usa as setas para ordenar.
5. Carrega em **Guardar alterações**. A gravação inclui todas as peças, categorias e eventos editados. Antes de gravar é criada uma cópia em `backup/edicao-.../`.
6. Abre **Ver site** para confirmar o resultado.

Também podes executar `npm start` na pasta do site.

Os preços `??€` são intencionais e ficam assim até confirmação do responsável. Os preços são guardados como texto. Os identificadores são estáveis: alterar o nome de uma categoria não quebra o respetivo endereço.

As 17 fotografias inicialmente fora do catálogo aparecem em **Fotografias por rever**. Escolhe uma peça e associa a fotografia, ou cria uma nova peça antes de a associar. Não foram publicadas automaticamente. Os ficheiros originais foram preservados para manter os caminhos existentes.

O gestor funciona apenas no computador, ligado a 127.0.0.1. Não é um painel remoto com autenticação. Um visitante do site público não pode guardar alterações. Para uma gestão remota futura, será necessário ligar um CMS com autenticação e publicação.

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

Guardar no gestor altera os ficheiros locais; não envia alterações para o GitHub. É necessário enviar os ficheiros alterados e as novas imagens para o repositório e aguardar a publicação. A configuração de alojamento deve ser confirmada antes desse passo.

Não abras os HTML por duplo clique: o catálogo carrega dados JSON e precisa de um servidor HTTP. Usa o endereço apresentado pelo gestor.

## Recuperação

A cópia integral anterior à reorganização está em `../backups/magus-art-20260923-214518/main/`, fora da pasta pública. Para recuperar uma edição do catálogo, fecha o gestor, copia `catalog.json` e `events.json` do backup escolhido para `data/` e volta a abrir o gestor. As fotografias nunca são apagadas ao remover peças. **Exportar cópia** permite também descarregar os dados em edição, incluindo novas imagens, para salvaguarda manual; não é um pacote para publicação.
