# Logótipos nos botões do catálogo

No gestor:

1. Em **Categorias**, escolhe a categoria que queres personalizar.
2. Na área **Logótipos dos botões**, escolhe **Categoria: ...** ou uma das suas subcategorias em **Botão a personalizar**.
3. Carrega um ou mais ficheiros, ou escolhe uma imagem existente e clica em **Usar imagem selecionada**.
4. Usa as setas para ordenar e **Retirar logótipo** para remover uma imagem do botão.
5. Clica em **Publicar alterações** para guardar online.

Podes usar até oito logótipos por botão, em PNG, WebP ou JPEG, até 10 MB por ficheiro. PNG ou WebP com transparência permitem mostrar o símbolo sem um retângulo de fundo. A imagem é apresentada inteira, sem corte, e os vários logótipos distribuem-se automaticamente no botão. O texto e a contagem continuam visíveis.

Cada categoria e cada subcategoria dentro dessa categoria tem a sua própria escolha. Os produtos sem subcategoria continuam no botão **Outros**, que também pode ter logótipos. A lista mostra subcategorias já usadas por produtos; não cria nem renomeia séries ou produtos.

Os botões sem logótipos continuam a usar a fotografia atual (capa escolhida, quando existe, ou primeira fotografia do produto). Retirar todos os logótipos repõe esse comportamento. As fotografias dos produtos e a área de IA permanecem independentes.

A configuração opcional fica em `catalog.buttonLogos`; os registos de produtos e categorias mantêm os seus campos atuais. As imagens são enviadas ao mesmo bucket do Supabase usado pelas fotografias. A publicação e o histórico existentes preservam a configuração, sem migração SQL. O código foi publicado diretamente na branch principal, conforme a preferência do utilizador.
