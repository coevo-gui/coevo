# Prompt de continuidade — Painel Coevo (`coevo-gui/coevo`)
_Atualizado: 09/07/2026 · Manter em dia junto com o roadmap e o README (ver "Prática de manutenção" no fim)._

**Como usar:** copiar tudo abaixo da linha ao abrir uma nova conversa (falta de memória/contexto). Preencher a seção "Tarefa atual". Este arquivo contém ponteiros, regras e armadilhas — os FATOS do projeto vivem no roadmap e no README e não devem ser duplicados aqui (duplicata envelhece).

---

# Projeto Painel Coevo — continuação

## Leitura obrigatória, nesta ordem, ANTES de qualquer proposta
1. `coevo-gui/coevo` → `docs/roadmap.md` — §4 (decisões travadas e segurança de dados), §5 (status), §7 (pendências). Documentação viva e fonte de verdade.
2. `README.md` (raiz do repo) — workflow de deploy, mapa de páginas/rotas, IDs de elementos, Web Methods, coleções e campos, constantes de integração (Brevo/ClickUp/Anthropic).
3. Se a tarefa tocar uma página ou módulo: **ler o arquivo real** em `src/pages/` / `src/backend/` antes de propor. Não propor a partir do nome dos elementos ou de versões antigas em contexto.
4. Se a tarefa tocar o embed de Disparos: `public/disparos.html` é a fonte; ver README («Disparos de Cobrança») para protocolo e deploy.
5. Se a tarefa tocar dados de clientes/BigQuery: ler também `coevo-gui/coevo-co` → `docs/prompt-continuidade.md` (o cadastro Wix alimenta aquele pipeline).

## Regras críticas (invioláveis)
- **Wix Data API: NUNCA PUT em item existente** (incidente 01/07/2026: 67 subclientes AHI zerados). Sempre fetch completo → spread → override → gravar. Via API externa: `POST /wix-data/v2/bulk/items/patch` com `fieldModifications`. Antes de qualquer escrita, ler 1 item real para confirmar as chaves de campo.
- **Operações em massa ou irreversíveis em produção só com GO explícito do Gui** — inclui bulk em `subclientes`/`clientes` (propaga ao BigQuery via sync-dim), deleção de disparos e envio de emails reais. Apresentar a operação/lista de itens ANTES; autonomia concedida nunca cobre destrutivos.
- **Não inventar**: ID de elemento Wix, nome de campo do CMS, ID de coleção, rota de página, ID de lista/campo do ClickUp, ID de lista/template do Brevo, cor HEX. Ausente do código/README → perguntar ou marcar como desconhecido explícito. IDs de elementos vivem no Editor — o repo não os prova; confirmar com o Gui quando a página for nova.
- **Repo: `coevo-gui/coevo`, código em `src/`** — nunca `painel-coevo` (arquivado). Ler a estrutura da raiz (`get_file_contents /`) antes de qualquer push. Arquivos de página exigem o sufixo `Nome.pageId.js`; sem sufixo = órfão que o Wix ignora.
- **`disparos.html`: nunca editar com slicing Python de índice `-1`** (já corrompeu o arquivo duas vezes). Edições cirúrgicas (str replace com âncora única), validar o HTML standalone (`?dev=true`) e lembrar que o deploy é manual (re-upload no Wix Media Manager — commitar no repo NÃO publica o embed). Base de recuperação: commit `c879f3d54bdf0a0c27a1a824a3aacb16f01a995d`.
- **Emails reais (Brevo) e tasks reais (ClickUp) são produção** — testar com `enviarTesteItem`/preview ou dados de teste antes de disparar de verdade.
- Comunicação em pt-BR, direta, sem bajulação. Em dúvida sobre qualquer informação faltante, perguntar antes de raciocinar longamente.

## Armadilhas que já custaram tempo (aprenda antes de propor)
1. **PUT do Wix Data substitui o item inteiro** — mandar 1 campo apaga os demais. Foi o incidente de 01/07 (bulk de `emailsCopia` na AHI). Corolário: `wixData.update` no Velo também exige fetch + spread do item completo.
2. **Bulk patch externo**: corpo com `patches[]` (não `items`); `fieldPath` no TOPO de cada modificação (não dentro de `setFieldOptions`); lotes ≤35 itens. O endpoint alternativo `PATCH /items/bulk` falha com "fieldModifications has size 0". O status da resposta do PATCH nem sempre reflete o resultado — verificar com GET depois.
3. **Filtro por `clienteRef` no query da API externa é não confiável** — buscar tudo com `cursorPaging {limit:100}` e filtrar em JS.
4. **Campo DATE do Wix = `YYYY-MM-DD`** — ISO com hora falha/corrompe (`dataLancamento` do Painel em Dia já precisou de correção).
5. **`show()`/`hide()` não funcionam em Section** — usar `expand()`/`collapse()`. O helper `vis()`/`aplicarVisibilidade()` das páginas já trata os dois.
6. **`style.borderColor` num Box pai cascateia aos Box filhos** se eles tiverem qualquer cor de borda (mesmo 0px). Fix é no EDITOR: zerar espessura E cor nos filhos (pré-requisito documentado no card da Pauta).
7. **`queryReferenced` não aceita filtros encadeados nem `.ascending`** — usado no nível `cliente_unidade`; filtrar/ordenar em memória (há fallback por `hasSome('acessoUsuario_subclientes', …)` no Portal/Dashboards).
8. **Evento de registro de membro é `wixMembers_onMemberCreated` em `backend/events.js`** — hook de `data.js` só dispara em `wixData.insert()` programático. `loginEmail` de membros exige `fieldSet: 'FULL'`.
9. **Bridge HtmlComponent ↔ Velo**: `window.addEventListener('message')` NÃO funciona no Web Worker do Velo — usar `$w('#embed').onMessage()` + `postMessage`. Protocolo do projeto: request `{id, type, payload}` → reply `{id, ...data}`, com handshake `HTML_READY` → `VELO_READY` (o embed usa `window.parent.postMessage(msg, '*')`; não esperar SDK `window.Wix`). Modo dev do disparos.html só com `?dev=true` ou `file:`.
10. **Brevo**: template Jinja2 usa `| safe` para HTML pré-renderizado (`| raw` não existe e quebra). Envio transacional não aceita lista — broadcast = buscar contatos da lista + `messageVersions` (1 por destinatário). O endpoint `GET /smtp/statistics/events` **ignora o filtro `tags` na query** — buscar tudo (máx. ~2 páginas × 5000 por causa do timeout ~14s do Velo) e filtrar `e.tag` em JS. Aberturas incluem scanners/Apple MPP.
11. **ClickUp**: filtro por pasta usa `project_ids[]` (não `folder_id`); conteúdo completo de página de wiki só no endpoint individual `GET /doc/{docId}/page/{pageId}?content_format=text/md` (o de lista trunca em `text_content`); `due_date` em Unix ms; campo `Cliente` (labels) recebe array de option IDs — mapa sigla→id em `clickup.jsw` (`SIGLAS`); MCP do ClickUp não renomeia/cria options — só a UI.
12. **Emails múltiplos em campo de texto do subcliente** (separados por espaço) quebram envio silenciosamente (caso CYAN; 47 registros normalizados). Ao ler `emailFinanceiro`/`emailGerenteGeral`/`focalMktEmail`/`emailsCopia`, sempre splitar por `[,\s]+` e validar.
13. **`permissions.json` está aberto (`*` com invoke anônimo)** — não confiar que um Web Method é "protegido" porque a página redireciona; qualquer proteção real precisa estar no backend. Restringir permissões é pendência (roadmap §7).
14. **Rotas do portal têm divergência conhecida**: código navega ora para `/portal/subcliente/{sigla}`, ora para `/cliente/{sigla}` / `/painel/*`. As URLs reais são configuração do Editor (não estão no repo) — confirmar antes de criar links novos; pendência de unificação no roadmap.
15. **Arquivos legados convivem no repo**: `portal*.js` na raiz e `src/pages/portal-envios-*.js` são de abordagens antigas — não usar como referência de implementação. Referência atual: `Envios - Home.ph33t.js` + `public/disparos.html`.
16. **Anthropic no backend Velo**: análise de disparos usa `claude-haiku-4-5-20251001` (350 tokens); o Coevito (briefing) usa prompt caching (`anthropic-beta: prompt-caching-2024-07-31`). Secrets no Wix Secrets Manager: `ANTHROPIC_KEY`, `CLICKUP_TOKEN`, `BREVO_API_KEY` — nunca colocar chaves em código/docs.
17. **Commitar no repo ≠ publicar**: `src/` publica via Git Integration no push, mas design/IDs dependem de sync do Editor, e o embed de Disparos depende de upload manual. Ao entregar, dizer explicitamente qual passo manual resta para o Gui.

## Tarefa atual
_(Preencher a cada nova conversa. Estado geral: roadmap §5; pendências: §7. Próximos naturais na fila: integração de insights BigQuery no painel — o maior; Painel em Dia Etapa 2 — web method de leitura de `versoes` + página de changelog; re-implementação da paginação do disparos.html; revisão das 16 entradas `a confirmar` em `clientes`.)_

## Entregáveis padrão
1. Mudanças de código: push em `coevo-gui/coevo` (após ler a estrutura), com aviso explícito dos passos manuais restantes (sync do Editor, upload no Media Manager, teste sugerido).
2. Escritas em massa no CMS, envios reais e deleções: operação apresentada antes, execução só com GO.
3. Achados e decisões consolidados no roadmap (§§ relevantes + log §8 + insights §9) e, se a conversa gerar novas regras ou armadilhas, atualizar ESTE prompt — no mesmo commit.

## Prática de manutenção
Ao fechar um milestone: atualizar `README.md` (se mudou estrutura/módulo/IDs), `docs/roadmap.md` (§5, §7, §8, §9) e `docs/prompt-continuidade.md` — num commit único. O prompt contém ponteiros/regras/armadilhas; fatos ficam no roadmap e no README.
