# IA local gratuita

O modo principal usa Ollama no teu computador. Não precisa de chave nem de saldo de uma API paga. O computador tem de estar ligado e o Ollama aberto. A análise não funciona num alojamento estático: usa o gestor em `http://127.0.0.1:4173/admin/`.

## Preparar

1. Instala o Ollama a partir de https://ollama.com/download/windows.
2. Num terminal executa `ollama pull qwen3-vl:4b-instruct` (modelo com cerca de 3,3 GB, além da instalação).
3. Abre o Ollama e `Abrir-gestor.cmd` nesta pasta.
4. Abre o endereço do gestor, inicia sessão com a tua conta administradora do Supabase e carrega ou cola uma print na área de IA.
5. Espera pela análise. A primeira pode demorar mais, enquanto o modelo carrega. O gestor aceita uma análise de cada vez.
6. Revê nome, preço, categoria e fotografias. Ajusta os recortes em percentagem e retira imagens indesejadas. Adiciona ao gestor e usa **Publicar alterações**.

Não é preciso criar outro Supabase: o gestor usa o catálogo e as permissões existentes. Publicar afeta o catálogo partilhado pelos dois repositórios. A nova área acrescenta produtos; as correções continuam no gestor manual.

## Como funciona

A print é analisada no Ollama em `127.0.0.1:11434`. Só o nome identificado é enviado à pesquisa pública DuckDuckGo. O modelo usa os títulos encontrados para melhorar o nome e mostra links para revisão. Se o motor de pesquisa bloquear o pedido ou não devolver resultados úteis, o nome fica assinalado como não confirmado. Não há uma garantia de identificação correta.

O preço vem apenas da print. Se não for legível, fica `??€`. A pesquisa não substitui o teu preço por preços de outras lojas. Várias fotografias do mesmo produto devem ficar agrupadas; os recortes sugeridos podem precisar de ajuste.

As fotografias recortadas só são enviadas para o Supabase ao publicar. A print original não é enviada ao serviço de IA em nuvem. O computador precisa de internet para iniciar sessão, consultar categorias, pesquisar nomes e publicar.

O modelo pode ser alterado com a variável de ambiente `MAGUS_LOCAL_MODEL`, antes de iniciar o servidor. Tem de suportar imagens e respostas JSON. O endereço do Ollama fica fixo no computador local.

## Problemas frequentes

- **Ollama indisponível:** abre a aplicação Ollama e volta a tentar.
- **Modelo em falta:** executa o comando `ollama pull` acima.
- **Análise lenta ou sem memória:** fecha outras aplicações e experimenta uma print com um único produto. O desempenho depende da RAM e da placa gráfica.
- **Sem resultados online:** o motor de pesquisa pode bloquear pedidos automáticos. Revê o nome manualmente nas fontes disponíveis.
- **IA gratuita indisponível no site online:** abre o gestor local. O gestor manual online continua funcional.

Referências: [visão no Ollama](https://docs.ollama.com/capabilities/vision), [respostas estruturadas](https://docs.ollama.com/capabilities/structured-outputs) e [modelo](https://ollama.com/library/qwen3-vl:4b-instruct).
