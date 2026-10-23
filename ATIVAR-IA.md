# GestorMaguscomIA

O gestor manual continua em `/admin/`. A nova área “Importar produtos com IA” permite carregar ou colar uma print, identificar produtos, pesquisar nomes, ler o preço e recortar várias fotografias. Revê os dados, ajusta os recortes em percentagem, retira imagens indesejadas e adiciona ao gestor. Usa “Publicar alterações” para enviar ao Supabase pelo fluxo existente, com controlo de conflitos.

## Ativação necessária no Supabase

A função `magus-analyze` e a migração de limites foram instaladas no projeto `lmgtzauohphfaqduwudz` em 23/10/2026. Falta configurar a chave da API OpenAI e concluir o teste real. Abaixo ficam os passos para configuração ou reinstalação. A chave pública existente não permite instalar funções nem configurar secrets.

1. No SQL Editor do Supabase, executa `supabase/migrations/202610230001_ai_limits.sql`. Usa as funções de autorização já existentes (`magus_is_admin`). Não substitui tabelas do catálogo.
2. Com a CLI Supabase autenticada, na raiz do projeto executa `supabase link --project-ref lmgtzauohphfaqduwudz`.
3. Em Edge Functions → Secrets, cria `OPENAI_API_KEY` com uma chave da tua conta OpenAI. Nunca coloques essa chave em HTML, JavaScript público, GitHub ou no chat.
4. Cria `MAGUS_ALLOWED_ORIGINS` com as origens exatas autorizadas, separadas por vírgulas, sem barra final; por exemplo `https://teudominio.pt,http://127.0.0.1:4173`. Para GitHub Pages a origem é `https://dinis1501j.github.io` (sem nome do repositório).
5. Opcional: `OPENAI_MODEL` seleciona um modelo com visão e pesquisa web na Responses API. O valor predefinido é `gpt-6-astra`; confirma acesso na tua conta.
6. Executa `supabase functions deploy magus-analyze`. A função verifica o token através de `auth.getUser` e exige `magus_is_admin`; a verificação JWT do gateway está desativada apenas para permitir esta validação explícita.
7. Publica os ficheiros do site com a pasta `admin/` incluída. `npm run build` prepara apenas o site público e exclui o gestor; para alojar a gestão usa os ficheiros fonte (sem secrets, backups ou tools).

Cada análise usa duas chamadas à API e pesquisa web, com custo na tua conta OpenAI. Há um limite persistente de 20 análises por hora por administrador. Define também limites de utilização no projeto OpenAI. A print é enviada ao serviço de IA, sem persistência da resposta (`store:false`).

## Verificação

Executa `npm run check`, `npm test` e `npm run build`. Depois de ativar a função, inicia sessão e testa uma print com três fotografias de um produto e preço legível; confirma agrupamento, recortes, fontes e preço. Testa também uma print sem preço: deve apresentar `??€`. Revê sempre os resultados: identificação visual, OCR e limites de recorte podem falhar. A função não publica diretamente nem altera produtos existentes.

Sem uma chave de IA e a função instalada, é possível usar o gestor manual, mas a análise apresenta uma mensagem de configuração em falta. Os testes locais não verificam a qualidade visual da IA nem substituem este teste real.

Referências da integração: [visão](https://developers.openai.com/api/docs/guides/images-vision) e [pesquisa web](https://developers.openai.com/api/docs/guides/tools-web-search).
