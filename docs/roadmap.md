# Painel Coevo — Portal do Cliente
**Roadmap & Documentação viva**
_Última atualização: 09/07/2026 · Milestone: **tríade de documentação implantada (README + roadmap + prompt de continuidade)**_

---

## 1. Objetivo
Portal único e protegido por login onde os clientes hoteleiros da Coevo centralizam tudo da conta — fichas das unidades, documentos, dashboards, pauta de tarefas, solicitação de jobs com IA — e onde a equipe Coevo opera rotinas administrativas (disparos de cobrança, comunicados, changelog de produto). Base: Wix Studio + Velo + CMS, integrado a ClickUp, Brevo, Anthropic e (próximo passo) BigQuery.

## 2. Por que o projeto existe
Reunião de 27/03/2026 (resumo executivo no projeto Claude «Painel do Cliente»): painel aprovado pela equipe como MVP evolutivo, substituindo planilhas por banco unificado, com hierarquia cliente → subcliente → hotel e permissões granulares. Motivações: centralizar a relação com o cliente numa plataforma com identidade Coevo, automatizar rotinas manuais (relatórios, cobranças), criar diferencial competitivo e oportunidade de upsell (plano com painel: +R$ 90–430/mês, a definir). Responsável principal: Gui Mendes; validação: André Farias.

Visão original (módulos previstos na reunião): dashboard de hotéis · gestão de relatórios com notificações · gestão financeira (Conta Azul) · documentação/FAQ · gerenciador de arquivos · entrega de jobs · integração ClickUp · (futuro) geração de prompts personalizados e transcrições de reuniões · 3 versões de layout por tipo de cliente. O mapeamento visão × implementado está no §6.

## 3. Arquitetura atual
```
GitHub coevo-gui/coevo (main) ──► Wix Git Integration ──► coevo.co (build automático de src/)
                                        │
Wix Editor (design/IDs) ◄──sync──► wix.config.json
public/disparos.html ──upload manual──► Wix Media Manager ──► HtmlComponent #htmlDisparos

Membro Wix ─► acessoUsuario (nivel) ─► filtros por página (masterPage + cada página Velo)
                                        │
     ┌──────────────┬─────────────┬─────┴────────┬──────────────┬───────────────┐
     ▼              ▼             ▼              ▼              ▼               ▼
  Núcleo do    Smart Briefing   Pauta        Disparos de    Painel em Dia   Insights BQ
  portal       (embed + IA)    (ClickUp)     Cobrança       (Brevo)         (protótipo)
  (CMS)             │             │          (embed+Brevo)      │                │
                Anthropic      ClickUp API   Brevo API       Brevo API      BigQuery coevo-co
                ClickUp                      Anthropic                      (gold_* por Sigla)
                Brevo
```
Coleções CMS: `clientes`, `subclientes`, `categoriaDocumento`, `documentos`, `acessoUsuario`, `disparos`, `itensDisparo`, `versoes`, `briefingLogs`. Chave universal: `sigla`.

## 4. Decisões travadas

### Estratégicas
- **Fonte de verdade das dimensões: Wix CMS** — `subclientes` alimenta o portal E o pipeline BigQuery (`coevo-co`, via sync-dim). Alterar cadastro tem efeito colateral no analytics.
- **Chave universal: `Sigla`** (portal, ClickUp, BigQuery, Looker).
- **3 níveis de acesso** (`coevo_admin`, `cliente_rede`, `cliente_unidade`) resolvidos por página via `acessoUsuario`; Disparos é exclusivo de admin.
- **Painel em Dia operado via conversa** (Gui fornece conteúdo → Claude dispara via Brevo MCP → registra em `versoes`). Só o Gui inicia disparos. Formato de versão: `vX.Y · mês/ano`.

### Segurança de dados (pós-incidente 01/07/2026)
- **🚨 Wix Data API: NUNCA PUT em item existente.** PUT substitui o item inteiro; campos não enviados viram null. O incidente apagou `sigla`, `nome`, `clienteRef` e emails de 67 subclientes AHI (recuperado de backups). Padrão obrigatório: fetch completo → spread → override do campo → gravar. Via API externa, `POST /wix-data/v2/bulk/items/patch` com `fieldModifications`.
- **🚨 Operações em massa em `subclientes`/`clientes` exigem confirmação explícita do Gui** antes de executar. Corrupção propaga ao BigQuery via sync-dim.
- **Autonomia nunca cobre ações destrutivas/irreversíveis em produção.**

### Arquiteturais
- **UIs complexas = SPA em HtmlComponent** (Smart Briefing, Disparos): HTML único com bridge Velo por `onMessage`/`postMessage`, protocolo request/response correlacionado por `id` + handshake `HTML_READY`/`VELO_READY`. `window.addEventListener('message')` não funciona no Web Worker do Velo. UIs simples = elementos nativos + Velo (Pauta, núcleo).
- **Deploy do `disparos.html` é manual** (Wix Media Manager; o `#htmlDisparos` aponta para a URL do arquivo). O repo versiona a fonte; subir no Media faz o deploy. Modo dev standalone: `?dev=true`.
- **Listas com filtros ricos = 1 repeater + filtragem client-side** (Pauta): multi-repeater causou conflito de IDs; filtros em memória sobre um dataset carregado uma vez.
- **Dashboards Looker abrem em lightbox** (`dashboardWindow`) com URL convertida para `/embed/reporting/`, mantendo o usuário dentro do painel (decisão da reunião de 27/03).
- **Reenvio de disparo é idempotente por item** (`statusEnvio='enviado'` pula), permitindo reprocessar disparos parciais sem duplicar emails.
- **«Responder para» é obrigatório no formulário de disparo, sem default** — o reply-to varia por cliente (ex.: `ahi@coevo.co`). O backend mantém fallback `midia@coevo.co` apenas como rede de segurança.
- **Métricas de disparo casadas por tag Brevo** (`{cobranca|comunicado}-{disparoId}`); a API de eventos ignora filtro por tag na query → buscar tudo (máx. 2 páginas × 5000, por timeout ~14s do Velo) e filtrar em JS. `cmsEnviados === 0` → `semEnvios`, sem fallback por assunto.
- **Análise IA dos disparos**: `claude-haiku-4-5-20251001`, 350 tokens, contexto = métricas + até 3 disparos anteriores da plataforma. Custo pontual e baixo.
- **Insights BigQuery: abordagem híbrida validada** — `.jsw` com service account (Secrets) consulta `gold_*` por `Sigla` (+ `fase='vigencia'` obrigatório) e devolve JSON a HtmlComponent com Chart.js. Descartada a leitura direta do frontend.

### Processo
- **Repo único e correto: `coevo-gui/coevo`** (código em `src/`); `painel-coevo` é legado arquivado. Sempre ler a estrutura do repo antes de commitar.
- **Iterativo e visual-first**: protótipo com dados reais antes de fechar arquitetura; decisões de design confirmadas antes de execução.
- **Ao fechar milestone: atualizar README + roadmap + prompt-continuidade num commit único.**

## 5. Status (o que está no ar)

| Módulo | Estado | Notas |
|---|---|---|
| Núcleo (Início, Ficha, Editar, Documentos, Dashboards, menu) | ✅ Produção | ~10 clientes-pai, base migrada da planilha em 02/06 |
| Smart Briefing | ✅ Produção, estável | IA + wiki ClickUp + task + emails + logs |
| Pauta de Tarefas | ✅ Produção, estável | ClickUp, janela −10/+15 dias, `visível cliente` |
| Painel em Dia | ✅ v1.0 disparada (jun/2026) | Backend Brevo pronto; auto-inscrição no cadastro; **falta a Etapa 2 (frontend)** |
| Disparos de Cobrança | ✅ Produção | Sem paginação (revertida); replyTo obrigatório; métricas + análise IA no ar |
| Insights BigQuery | 🔬 Protótipo validado (02/07) | Nada commitado; próximo grande passo |

## 6. Visão original (27/03) × implementado

| Módulo previsto | Estado |
|---|---|
| Dashboard de hotéis com navegação interna | ✅ Início + Ficha + lightbox de dashboards |
| Hierarquia cliente > subcliente + permissões | ✅ 3 níveis via `acessoUsuario` |
| Página de administração (CRUD) | ◑ Edição de subclientes no portal; demais cadastros direto no CMS |
| Gestão financeira / cobranças | ◑ Disparos de Cobrança via Brevo (boleto/PIX manuais); integração Conta Azul não iniciada |
| Gestão de relatórios + notificação | ◑ Coberto parcialmente por Documentos + dashboards; automação mensal não iniciada |
| Documentação/FAQ (wiki) | ◑ Wiki vive no ClickUp e alimenta o Coevito; FAQ no portal não iniciado |
| Gerenciador de arquivos por categoria | ✅ Documentos + `categoriaDocumento` |
| Entrega de jobs | ✅ Smart Briefing (entrada) + Pauta (acompanhamento) |
| Integração ClickUp | ✅ Pauta + criação de tasks |
| 3 versões de layout por tipo de cliente | ◑ Resolvido por visibilidade condicional (collapse) e filtros, não por layouts distintos |
| Prompts personalizados / transcrições | 🔲 Futuro |
| Precificação do plano com painel | 🔲 Comercial, fora do escopo técnico |

## 7. Pendências

### Próximo grande passo
- **Integração de insights BigQuery no painel**: transformar o protótipo de 02/07 em módulo real — `.jsw` de consulta (service account no Secrets, projeto `coevo-co`, tabelas `gold.gold_performance_diario` e `gold.gold_hotelaria_diario`, filtro por `Sigla` + `fase='vigencia'`), HtmlComponent com Chart.js, replicando o Looker «Gerenciamento Performance · Mídia». Atenções conhecidas: divergências GA4-direto × BQ (janela de atribuição), lógica «Saldo Google Ads» do Looker não esclarecida, histórico BQ começa em meados de 2025 (Looker/GA4 volta a 2023).

### Painel em Dia — Etapa 2 (frontend)
- Web Method de leitura da coleção `versoes` (não existe; `painelEmDia.jsw` hoje só tem as funções Brevo) + nova página no portal exibindo o histórico de versões. Auto-inscrição no Brevo já está no ar (`events.js`).

### Disparos de Cobrança
- **Re-implementar paginação do `disparos.html`** — a tentativa anterior quebrou o arquivo e foi revertida (base de recuperação: commit `c879f3d54bdf0a0c27a1a824a3aacb16f01a995d`). Reabordar com edições cirúrgicas (nunca slicing Python `-1`), testando standalone (`?dev=true`) antes do upload.
- Aberturas automáticas × humanas: Brevo não distingue nativamente (scanners/Apple MPP); horário e padrão de IP podem ser indicativos — refinamento futuro da análise IA.

### Portal / cadastro
- **Revisar as 16 entradas `a confirmar` na coleção `clientes`** (status atribuído em 02/06): confirmar dados, atualizar status ou remover.
- **Divergência de rotas (verificar no Editor):** `Portal.w6koo.js` navega para `/portal/subcliente/{sigla}` e, na falha de auth de Envios, para `/portal`; masterPage/Editar/breadcrumbs usam `/cliente/{sigla}` e `/painel/*`. Confirmar as URLs reais das páginas e unificar os links no código.
- Normalização contínua de emails (`emailFinanceiro`, `emailGerenteGeral`, `focalMktEmail`, `emailsCopia`): 47 subclientes já corrigidos (múltiplos emails separados por espaço causaram falha no CYAN); considerar validação periódica com separador vírgula.

### Infraestrutura / qualidade
- **`permissions.json` libera invoke anônimo para todos os Web Methods (`"*"`)** — funções sensíveis (`enviarDisparos`, `deletarDisparo`, `criarDisparoComItens`…) dependem só do redirect da página para proteção. Revisar: restringir por função (ex.: emailDisparo → `siteMember`/checagem de nível no backend).
- **Limpeza de legados (com GO do Gui):** `portal*.js` na raiz do repo (cópias pré-Git-Integration), `src/pages/portal-envios-novo.js` / `-detalhe.js` / `-envios.js` (abordagem antiga de páginas nativas, órfãos sem sufixo de página), `hotéis.eagur.js` vazio, `.DS_Store`.
- **Versionar `smart-briefing.html` no repo** (hoje só existe colado no Editor) — mesmo padrão do `disparos.html` (`public/`), para histórico e recuperação.
- Títulos SEO dinâmicos (`wix-seo`): tentativa de 02/06 não permaneceu no código atual — retomar se ainda desejado.

### Itens ✅ concluídos desde a versão anterior deste roadmap
- ✅ **Resumo de IA nos resultados do disparo** — `gerarAnaliseDisparo` + tipo `ANALISE_DISPARO` no bridge (Haiku 4.5, com histórico comparativo).
- ✅ **Fallback de subject matching suprimido** — `obterMetricasDisparo` retorna `semEnvios` quando `cmsEnviados === 0`; matching é exclusivamente por tag.
- ✅ **`painelEmDia.jsw` populado** (inscrição + sync Brevo) e **auto-inscrição no cadastro** via `events.js`.
- ✅ **«Responder para» obrigatório** no formulário de disparos (06/07).

## 8. Log de milestones
- **27/03/2026** — Reunião de aprovação: visão completa do Painel do Cliente (resumo executivo no projeto Claude). MVP evolutivo definido; Gui responsável.
- **25/05** — Hook `wixMembers_onMemberCreated` → cria registro em `acessoUsuario` (ainda na era do repo `painel-coevo`).
- **02/06** — **Fundação do portal**: coleções criadas via API (`subclientes`, `categoriaDocumento`, `documentos`, `acessoUsuario` + campos em `clientes`); migração de ~88 subclientes de 10 clientes-pai a partir da planilha; 3 níveis de acesso com membros de teste (Gui admin; André Farias rede; Bruno Schroeder unidade); mockups + Velo das páginas do núcleo. No mesmo dia: sincronização seletiva planilha↔Wix (7 subclientes novos, campo `status` em 28 clientes: 8 ativo / 4 inativo / 16 a confirmar) e consolidação do repo — trabalho migra de `painel-coevo` (arquivado) para `coevo-gui/coevo` (`src/`).
- **07–08/06** — **Painel em Dia v1.0**: coleção `versoes`, infra Brevo (pasta 5, lista 6, template 1), primeiro disparo `v1.0 · jun/2026 — Smart Briefing evoluiu` para 10 membros; `events.js` passa a auto-inscrever novos membros; aprendizados `| safe` e `messageVersions`.
- **09/06** — **Smart Briefing fechado**: formulário dinâmico por categoria, Coevito com wiki ClickUp e prompt caching, task ClickUp com custom fields, anexos, 2 emails Brevo, `briefingLogs`, rascunho automático; descoberta do padrão de bridge do HtmlComponent. **Pauta de Tarefas fechada** no mesmo dia: `clickup.jsw` + página com 1 repeater e filtros client-side; aprendizados de Velo (expand/collapse em Section, cascata de borderColor).
- **02/07** — **Protótipo Insights BigQuery**: dois artifacts com dados reais (CYAN) validam a arquitetura híbrida `.jsw` + HtmlComponent + Chart.js, replicando o Looker de performance; divergências e limitações mapeadas.
- **01–06/07** — **Ciclo Disparos de Cobrança**: paginação quebrada revertida para a base `c879f3d`; **incidente PUT (01/07)** apaga dados de 67 subclientes AHI ao inserir `emailsCopia` em massa — recuperação por backups e consolidação das regras de segurança (§4); caso raiz: `ahi@coevo.co` ausente de `emailsCopia` dos 69 subclientes AHI. Em 06/07, «Responder para» torna-se obrigatório (5 edições em `disparos.html` + Velo) — commitado e re-upado no Media Manager.
- **09/07** — **Tríade de documentação**: README reescrito com o estado real, roadmap convertido em documentação viva, `docs/prompt-continuidade.md` criado. Achados registrados: divergência de rotas, `permissions.json` aberto, legados a limpar, pendências antigas já implementadas marcadas ✅.

## 9. Insights empíricos
- **PUT da Wix Data API é substituição total** — 1 campo enviado = todos os outros apagados. O erro custou uma reconstrução de base (67 registros AHI).
- **Cadastro em `subclientes` não é operação inerte** — propaga ao BigQuery via sync-dim diário.
- **Filtro por `clienteRef` na Wix Data API (externa) é não confiável** — buscar tudo com cursor paging e filtrar em JS.
- **`wixData.update` no Velo também exige fetch + spread** do item completo.
- **Campo DATE do Wix = `YYYY-MM-DD`** (sem hora); bulk patch externo: `patches[]` com `fieldPath` no topo de cada modificação; lotes ≤35 itens.
- **`show()`/`hide()` não funcionam em Section** — usar `expand()`/`collapse()`.
- **`style.borderColor` num Box pai cascateia aos filhos** se estes tiverem qualquer cor de borda, mesmo com 0px — zerar espessura E cor no editor.
- **`queryReferenced` não aceita filtros encadeados nem `.ascending`** — filtrar/ordenar em memória.
- **Registro de membro dispara em `events.js` (`wixMembers_onMemberCreated`)**, nunca em hook de `data.js`; `loginEmail` exige `fieldSet: 'FULL'`.
- **HtmlComponent ↔ Velo**: `window.addEventListener` não funciona no Web Worker; o protocolo por `id` + handshake elimina condições de corrida de carregamento.
- **Brevo**: Jinja2 usa `| safe` (não `| raw`); envio broadcast = `messageVersions` por destinatário; endpoint de eventos ignora `tags` na query — filtrar `e.tag` em JS; timeout prático do Velo ~14s limita a busca a ~10k eventos.
- **ClickUp**: filtro por pasta usa `project_ids[]`; conteúdo completo de página só no endpoint individual (`content_format=text/md`); `due_date` em ms; MCP não cria dims/labels — só lista.
- **Emails múltiplos num campo de texto quebram silenciosamente o envio** (caso CYAN, separador espaço) — normalização preventiva vale mais que tratamento de erro.
- **Aberturas de email incluem scanners/Apple MPP** — taxa de abertura do Brevo superestima leitura humana.
- **Slicing Python com índice `-1` em arquivos grandes já corrompeu o `disparos.html`** — edições sempre cirúrgicas (str replace) e teste standalone antes do deploy.
- **Prompt caching Anthropic** (`anthropic-beta: prompt-caching-2024-07-31`) reduziu custo do Coevito com a wiki no contexto.
- **BigQuery**: toda consulta de performance exige `fase='vigencia'`; `Sigla` é a chave de junção universal; histórico BQ começa em meados de 2025.
