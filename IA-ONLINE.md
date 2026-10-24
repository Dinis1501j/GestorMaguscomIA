# Importação com IA diretamente no admin

A área **Importar produtos com IA** funciona no admin do site, através da função `magus-analyze` no Supabase. Não é necessário instalar Ollama, abrir o gestor local ou manter um computador ligado.

## Utilização

1. Entra no admin online com a conta administradora habitual.
2. Carrega uma print JPEG, PNG ou WebP, ou cola-a na área de IA.
3. Clica em **Analisar print**.
4. Revê nomes, preços, categorias e fotografias. Podes ajustar os recortes, retirar fotografias e desmarcar produtos.
5. Clica em **Adicionar ao gestor para publicar** e depois em **Publicar alterações**.

O gestor manual e o catálogo Supabase existente mantêm-se. A análise não publica automaticamente, não elimina produtos e não substitui peças existentes. O preço vem apenas da print; se estiver ilegível fica `??€`. A pesquisa não substitui o teu preço por preços de outras lojas.

## Ativação única

- Cria uma chave Gemini num projeto elegível no plano gratuito do [Google AI Studio](https://aistudio.google.com/apikey), sem ativar faturação. A disponibilidade depende dos requisitos de conta, região e quotas da Google.
- Guarda a chave apenas em **Supabase → Edge Functions → Secrets**, como `GEMINI_API_KEY`. Nunca a coloques em ficheiros públicos, GitHub ou no admin.
- O secret `MAGUS_ALLOWED_ORIGINS` deve incluir as origens exatas do site, sem caminhos: `https://magusart.pt,https://www.magusart.pt,https://dinis1501j.github.io`. Mantém quaisquer outras origens autorizadas existentes.
- A migração `supabase/migrations/202610230001_ai_limits.sql` já foi aplicada ao projeto atual. Em outro projeto, aplica-a depois de configurar `magus_is_admin` e o catálogo.
- Publica a função `magus-analyze` com os ficheiros desta pasta. A entrada é `supabase/functions/magus-analyze/index.ts`; `verify_jwt=false` é intencional porque a função valida o utilizador em `auth.getUser` e exige `magus_is_admin` antes de chamar a IA.
- Publica os ficheiros do site, incluindo `admin/` e os assets. O build público existente exclui `admin/`; não o uses sozinho para alojar o gestor.

## Plano gratuito e pesquisa

O modelo escolhido é `gemini-3.5-flash-lite`, com entrada de imagens e saída de texto no plano gratuito documentado pela Google em 24/10/2026. Cada análise usa uma chamada de visão e, se houver resultados de pesquisa, uma chamada para rever nomes. Não são usadas as ferramentas pagas de pesquisa Google nem há fallback automático para outro fornecedor ou modelo pago.

Mantém o projeto Google sem faturação para utilizar exclusivamente a quota gratuita. Se a quota acabar, a função apresenta um erro de limite. O código não ativa faturação nem compra créditos; não consegue impedir cobranças se o proprietário mudar o projeto para um plano pago fora desta aplicação. Existe também um limite interno de 20 análises por hora por administrador.

A print é enviada à API Gemini através do Supabase. Apenas os nomes identificados são enviados à pesquisa pública DuckDuckGo; se estiver indisponível, a API pública Wikimedia pesquisa a identidade e a franquia em português e inglês. As fontes são apresentadas como links. Fontes enciclopédicas confirmam identidades, sem identificar necessariamente um modelo comercial de uma peça artesanal. Se a pesquisa estiver indisponível ou não permitir confirmar a identidade, o nome fica assinalado para revisão. Os recortes podem precisar de ajuste, sobretudo quando não há margens claras entre fotografias.

Os limites e políticas do fornecedor podem mudar. Consulta [preços](https://ai.google.dev/gemini-api/docs/pricing), [requisitos de acesso](https://ai.google.dev/gemini-api/docs/available-regions), [visão](https://ai.google.dev/gemini-api/docs/image-understanding) e [respostas estruturadas](https://ai.google.dev/gemini-api/docs/generate-content/structured-output).

## Verificação

`npm test` inclui testes da função cloud com respostas simuladas: permissões, CORS, quota, chave em falta, três fotografias, pesquisa indisponível e preço preservado. `npm run check` valida o catálogo e ligações locais. Um teste real requer a chave configurada: testa uma print com várias fotografias e preço legível, e outra sem preço, antes de publicar produtos.

Em 24/10/2026, a chave foi configurada e a função publicada no projeto Supabase atual. O teste real em `https://magusart.pt/admin/` identificou uma peça com três fotografias, categoria Porta-Chaves, preço `12€` e fontes públicas da Wikimedia. Uma fotografia sem preço devolveu `??€`. Os 18 testes automáticos passaram. Os produtos de teste não foram adicionados nem publicados no catálogo.

Os ficheiros de IA local anteriores continuam disponíveis no histórico e em `tools/`, mas o admin atual chama exclusivamente a função online.
