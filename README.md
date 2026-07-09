# coevo — Site coevo.co + Painel Coevo (portal do cliente)

_Status: Portal no ar com 5 módulos (núcleo, Smart Briefing, Pauta, Painel em Dia v1.0, Disparos de Cobrança). Próximo grande passo: integração de insights BigQuery._
_Atualizado: 09/07/2026._

Repositório do site **coevo.co** (Wix Studio + Velo, via Git Integration & Wix CLI). Contém o site institucional **e** o **Painel Coevo** — portal protegido por login onde clientes hoteleiros acessam fichas de unidades, documentos, dashboards, pauta de tarefas e solicitam jobs; e onde a equipe Coevo (admin) opera disparos de cobrança.

---

## Workflow de deploy (leia antes de mexer)

| O quê | Como chega em produção |
|---|---|
| Código Velo (`src/backend`, `src/pages`) | **Push para `main` neste repo** → Wix Git Integration builda e publica. Não se edita código no Wix IDE (lá é read-only). |
| Design (elementos, páginas, IDs) | Wix Editor (Local Editor: Publish vira Save) → gera nova UI version → sincronizar de volta ao repo via `wix.config.json`. |
| Campos de coleção CMS | Mudanças no Wix entram em vigor imediatamente, sem publish. |
| `public/disparos.html` | **Deploy manual**: upload/sobrescrita do arquivo no **Wix Media Manager**; o HtmlComponent `#htmlDisparos` aponta para a URL do arquivo. Versionar no repo E subir no Media. |
| `smart-briefing.html` | Mantido fora do repo (embed colado no Editor). ⚠️ Não versionado — pendência no roadmap. |

**Repo correto: `coevo-gui/coevo`.** O repo `coevo-gui/painel-coevo` é legado/arquivado — nunca commitar lá.

---

## Estrutura do repositório

```
coevo/
├── src/                            ← código deployado pelo Wix
│   ├── backend/
│   │   ├── briefing.jsw            Smart Briefing (IA, subclientes, emails, logs)
│   │   ├── clickup.jsw             Pauta de Tarefas (getTarefasCliente)
│   │   ├── emailDisparo.jsw        Disparos de Cobrança (13 Web Methods)
│   │   ├── painelEmDia.jsw         Painel em Dia (inscrição/sync Brevo)
│   │   ├── events.js               wixMembers_onMemberCreated → acessoUsuario + Brevo
│   │   ├── data.jsw                getCaseItem (site institucional)
│   │   ├── http-functions.js       vazio (substituído por .jsw)
│   │   └── permissions.json        permissões dos Web Methods (⚠️ hoje: '*' anônimo)
│   ├── pages/
│   │   ├── masterPage.js           menu dinâmico #membersMenu por nível de acesso
│   │   ├── Portal.w6koo.js         Início do portal
│   │   ├── Subcliente.footl.js     Ficha do subcliente (página dinâmica)
│   │   ├── Editar subcliente.d3ws1.js  Edição (página dinâmica + #itemSelector)
│   │   ├── Documentos.lsisv.js     Documentos
│   │   ├── Dashboards.ptqn2.js     Dashboards
│   │   ├── dashboardWindow.gaqzj.js    Lightbox de dashboard (Looker embed)
│   │   ├── Pauta.s1ic6.js          Pauta de Tarefas (ClickUp)
│   │   ├── Envios - Home.ph33t.js  Disparos de Cobrança (bridge do embed)
│   │   ├── Smart Briefing.p8xhc.js Smart Briefing (bridge do embed)
│   │   ├── [site institucional]    Blog, Cases, Vagas, home-2024, calculadora OTA, LP Dash…
│   │   └── [LEGADO] portal-envios-novo.js / -detalhe.js / -envios.js (órfãos, sem sufixo de página)
│   └── public/                     data.js, formsRD.js (site institucional)
├── public/
│   └── disparos.html               fonte do embed de Disparos (deploy manual, ver acima)
├── docs/
│   ├── roadmap.md                  documentação viva (decisões, status, pendências, log)
│   └── prompt-continuidade.md      regras + armadilhas para continuidade em nova conversa
├── portal*.js (raiz)               [LEGADO] cópias pré-Git-Integration — limpar (roadmap)
└── wix.config.json / wix.lock / package.json
```

Regra do Wix Git: arquivos de página seguem `Nome.pageId.js` (ex.: `Pauta.s1ic6.js`). Arquivo em `src/pages/` **sem** o sufixo de página não está vinculado a página nenhuma.

---

## Painel Coevo — núcleo

### Coleções CMS (Wix)

| Coleção | Descrição |
|---|---|
| `clientes` | Clientes-pai (redes hoteleiras). Também alimenta o portfólio público. Campo `status`: ativo / inativo / a confirmar |
| `subclientes` | Unidades (hotéis), referenciam `clientes` via `clienteRef`. Chave universal: `sigla` |
| `categoriaDocumento` | Categorias livres de documentos |
| `documentos` | Links/arquivos vinculados a subclientes (`subclienteRef`) |
| `acessoUsuario` | Controle de acesso por membro Wix (`memberId`, `nivel`, `clienteRef`, multi-ref `subclientes`) |
| `disparos` | Cabeçalhos dos disparos de cobrança/comunicado |
| `itensDisparo` | 1 item por hotel dentro de um disparo (`disparoRef`, `subclienteRef`) |
| `versoes` | Histórico de versões do Painel em Dia |
| `briefingLogs` | Log de sessões do Smart Briefing |

Campos de `subclientes` usados pelo código: `sigla`, `nome`, `cidade`, `estado`, `status`, `clienteRef`, `tags`, `logoSubcliente`, `cnpj`, `responsavel`, `cluster`, `idGA4`, `idGAds`, `idMAds`, `idGMB`, `emailGerenteGeral`, `contatoGerenteGeral`, `emailFinanceiro`, `contatoFinanceiro`, `focalMktEmail`, `focalMktContato`, `emailsCopia`, `dashUrl`, `dash2Url`, `clickupUrl`, `wikiUrl`, `valorMidiaGoogle`, `valorMidiaMeta`.

### Níveis de acesso (`acessoUsuario.nivel`)

| Valor | Descrição |
|---|---|
| `coevo_admin` | Equipe Coevo — vê tudo; único nível com acesso a Disparos |
| `cliente_rede` | Gerente de rede — vê todos os subclientes do seu `clienteRef` |
| `cliente_unidade` | Gerente de unidade — vê apenas subclientes vinculados via multi-reference |

Novos membros: `events.js` cria o registro em `acessoUsuario` (campo `nivel` fica vazio — preencher manualmente) e inscreve o email na lista Brevo «Painel em Dia».

### Mapa de páginas do portal

| Página | Arquivo | Rota (conforme código) | Acesso |
|---|---|---|---|
| Início | `Portal.w6koo.js` | `/painel/home` (menu) | todos os níveis |
| Ficha do subcliente | `Subcliente.footl.js` | `/cliente/{sigla}` | filtrado por nível |
| Editar subcliente | `Editar subcliente.d3ws1.js` | `/cliente/editar/{sigla}` | filtrado por nível |
| Documentos | `Documentos.lsisv.js` | `/painel/documentos` | filtrado por nível |
| Dashboards | `Dashboards.ptqn2.js` | `/painel/dashboards` | filtrado por nível |
| Pauta de Tarefas | `Pauta.s1ic6.js` | `/portal/pauta` | filtrado por nível |
| Disparos de Cobrança | `Envios - Home.ph33t.js` | `/portal/envios` | **somente `coevo_admin`** |
| Smart Briefing | `Smart Briefing.p8xhc.js` | página própria | membros logados |

⚠️ **Divergência de rotas conhecida (a confirmar no Editor):** `Portal.w6koo.js` navega para `/portal/subcliente/{sigla}` (btnVerFicha e networkBar), enquanto masterPage/Editar/breadcrumbs usam `/cliente/{sigla}`. Ver pendências no roadmap.

### masterPage.js — menu `#membersMenu`

Itens fixos: Portal, Documentos, Dashboards, meu perfil (`/painel/perfil`). Dinâmicos: «Hotel» (link direto se 1 subcliente, submenu se vários), «Editar Hotel» (se ≥1 subcliente), «Cobranças» → `/portal/envios` (só `coevo_admin`).

### IDs de elementos por página (estado atual do código)

**Portal.w6koo.js** — `#dataset1` (subclientes), `#repeaterUnidades` → `#logoCliente`, `#btnVerFicha`; busca `#searchCliente`; métricas `#contUnidades`, `#contDocs`, `#contDashs`, `#contTags`; banner de rede `#networkBar`, `#networkName`, `#networkDesc`, `#networkLogo`, `#networkSigla`.

**Subcliente.footl.js** — `#dynamicDataset` (filtrado por `sigla` da URL), `#dataset1` (documentos, refiltrado por `subclienteRef`), `#breadcrumbs`; textos `#respMidia`, `#cluster`, `#status`, `#tags`; containers colapsáveis `#boxRespMidia`, `#boxCluster`, `#boxStatus`, `#boxTags`, `#boxGA4`, `#boxGAds`, `#boxMAds`, `#boxGMB`, `#boxGG`, `#boxFinanceiro`, `#financeiroContato`, `#boxMkt`, `#boxEmailsCC`, `#boxDash1`, `#boxDash2`, `#boxTasks`, `#boxWiki`; botões `#btnGG`, `#btnFinanceiro`, `#btnMkt` (mailto), `#btnSubclienteEdit`, `#btnDash1`, `#btnDash2` (abrem lightbox `dashboardWindow` com `{embedUrl, normalUrl}` — `paraEmbedUrl()` converte URL Looker para `/embed/reporting/`).

**Editar subcliente.d3ws1.js** — `#dynamicDataset` popula os campos nativamente; código só monta e pré-seleciona `#itemSelector` (dropdown «SIGLA — Nome», value = sigla minúscula) filtrado por acesso.

**Documentos.lsisv.js** — `#textTotalDocs`; `#repeaterDocs` → `#textTitulo`, `#textCategoria`, `#textDocData`, `#linkAbrir`.

**Dashboards.ptqn2.js** — card destaque `#featuredCard` (`#featuredNome`, `#featuredDesc`, `#featuredCidade`, `#featuredLogo`/`#featuredIcon`, `#btnFeaturedDash`, `#btnFeaturedDash2`; oculto para admin); `#countDash`; `#repeaterDashboards` → `#textNomeDash`, `#textSiglaDash`, `#textCidadeDash`, `#btnDash1`, `#btnDash2`.

**dashboardWindow.gaqzj.js** (lightbox) — `#embedDash` (src = embedUrl), `#btnAbrirDash` (URL original).

**Pauta.s1ic6.js** — chips `#btnFiltroTodas/Atrasadas/Aprovacao/Semana/Concluidas`; `#inputBusca`, `#dropdownCliente` (colapsa se 1 cliente), `#dropdownResponsavel`; `#textPautaTotal`; `#repeaterPauta` → `#boxCard`, `#tagSigla`+`#tagSiglaBox`, `#textNomeTarefa`, `#tagTemporal`, `#tagStatus`, `#textPrazo`, `#textLista`+`#textListaBox`, `#textResponsavel`, `#dotAtividade`, `#textDescricao`+`#btnVerDescricao`, `#btnAbrirTarefa`. Pré-requisito de editor: bordas dos filhos de `#boxCard` com espessura E cor zeradas (cascata de borderColor).

**Envios - Home.ph33t.js** — um único elemento: HtmlComponent `#htmlDisparos` (100% largura, ≥800px, scrolling on).

**Smart Briefing.p8xhc.js** — HtmlComponent `#embedSmartBriefing`.

---

## Módulos

### Disparos de Cobrança (`/portal/envios`)

SPA em `public/disparos.html` embedada via `#htmlDisparos`. Fluxo: criar disparo (plataforma `gads` | `mads` | `comunicado`, mês de referência, vencimento, corpo, **Responder para obrigatório** — sem default no formulário) → selecionar hotéis (gera `itensDisparo` com valor puxado de `valorMidiaGoogle`/`valorMidiaMeta`) → editar itens (boleto/PIX) → preview/teste → enviar via Brevo → dashboard de métricas por hotel + análise em linguagem natural por IA.

**Protocolo embed ↔ Velo**: handshake `HTML_READY` → `VELO_READY`; depois mensagens request/response correlacionadas por `id` (`postMessage({id, type, payload})` / reply `{id, ...data}`). Tipos: `FETCH_DISPAROS`, `FETCH_SUBCLIENTES` (status=ativo), `FETCH_CLIENTES`, `CREATE_DISPARO`, `FETCH_ITENS`, `SALVAR_RASCUNHO`, `ATUALIZAR_DISPARO`, `REMOVER_ITEM`, `PREVIEW_EMAIL`, `ENVIAR_TESTE`, `ENVIAR_DISPAROS`, `DELETE_DISPARO`, `METRICAS_DISPARO`, `ANALISE_DISPARO`. Modo dev standalone: abrir o HTML com `?dev=true` (ou `file:`) usa dados mockados.

**Web Methods (`emailDisparo.jsw`)**: `fetchDisparos`, `criarDisparoComItens`, `fetchItensDisparo`, `salvarRascunhoItens`, `removerItemDisparo`, `atualizarDisparoConfig`, `deletarDisparo`, `previewEmailItem`, `enviarTesteItem`, `enviarDisparos`, `obterMetricasDisparo`, `corrigirStatusDisparo`, `gerarAnaliseDisparo`.

**Email**: remetente `midia@coevo.co` (nome configurável); assunto `coevo | Cobrança {Google Ads|Meta Ads} | {sigla} | {nome} | Cobrança - ref. {data}` (comunicado usa o título); tags Brevo `[cobranca|comunicado, {base}-{disparoId}]`; destinatários resolvidos por toggles (financeiro / gerente geral / focal mkt / cópia) a partir dos campos do subcliente, com split por vírgula/espaço e dedupe; `ccGlobal` opcional; replyTo com fallback `midia@coevo.co` **apenas no backend** (o frontend exige preenchimento). Reenvio pula itens `statusEnvio='enviado'` (idempotência por item). Status do disparo: `rascunho` → `enviado` | `parcial` | `erro`.

**Métricas** (`obterMetricasDisparo`): busca eventos Brevo do período (a API ignora filtro por tag na query — busca tudo, máx. 2 páginas × 5000, e filtra por `e.tag` em JS); se `cmsEnviados === 0` retorna `semEnvios` sem consultar o Brevo. Classifica por hotel (sigla extraída do assunto ou por mapa de emails): entregue/aberto/clicado/bounce/bloqueado/spam, com timestamps por email.

**Análise IA** (`gerarAnaliseDisparo`): monta contexto (métricas + até 3 disparos anteriores da mesma plataforma) e chama a Anthropic API (`claude-haiku-4-5-20251001`, máx. 350 tokens) — retorna 1 parágrafo de leitura executiva.

### Smart Briefing

Formulário inteligente para solicitação de jobs. Vive num embed (`smart-briefing.html`, fora do repo) na página com `#embedSmartBriefing`; bridge chama `briefing.jsw` (`callAI`, `getSubclientes`, `sendBriefingEmails`, `createBriefingLog`, `updateBriefingLog`).

Fluxo: (1) formulário com campos dinâmicos por categoria; (2) o Coevito (IA Anthropic) analisa, consulta a wiki do cliente no ClickUp e pergunta lacunas; (3) revisão e confirmação → task no ClickUp + 2 emails Brevo + log em `briefingLogs` (create ao entrar no chat, update no submit). Rascunho automático via sessionStorage.

Categorias e campos dinâmicos:

| Categoria | Campos principais |
|---|---|
| Criação visual | Material, dimensões, público, informações, referências |
| Campanha de mídia paga | Objetivo, plataforma, tipo de criativo, URL de destino |
| Site / Landing page | Tipo de entrega, URL, descrição |
| E-mail marketing | Tipo, assunto, conteúdo, público |
| Estande / Evento / Feira | Tipo, local, dimensões*, público-alvo, restrições |
| Relatório / Planejamento | Tipo, período de referência |

\* Dimensões obrigatórias para adesivagem de estande, sinalização física e material gráfico; **adesivagem de estande exige anexo do gabarito da montadora**.

ClickUp: lista `coevo.pauta` (`901305624084`), status inicial `REVISÃO`, assignee padrão Mari (`82199500`), campo `Cliente` `e4ccb2ed-57e5-4f61-b82d-d09d85eee922` (labels), campo `Entrega do Escopo` `862f6435-d8a1-46a1-8495-d3f0c248b998`. Wiki: documento `2zpg6-1403`; páginas por sigla: CJOI `2zpg6-8793`, AHI `2zpg6-1023`, WGA `2zpg6-9153`, BRI `2zpg6-7793`, SAG `2zpg6-7833`, DYC `2zpg6-5493`, HCV `2zpg6-8153`, JCB `2zpg6-9173`.

Brevo: email interno para `mari@coevo.co` + `bruno@coevo.co` (reply-to = solicitante); email externo para o solicitante (reply-to `mari@coevo.co`). Remetente `midia@coevo.co`.

### Pauta de Tarefas (`/portal/pauta`)

Viewer de tarefas do ClickUp para clientes (sem conta ClickUp). Backend `clickup.jsw` → `getTarefasCliente(siglas)`: `GET /v2/team/3136006/task` com `project_ids[]=90133046139` (pasta `coevo.tudo`), `subtasks=true`, `include_closed=true`, janela de prazo −10/+15 dias, custom_fields exigindo `visível cliente = 1` e (para não-admin) `Cliente ANY [option ids]` via mapa `SIGLAS` (sigla → option id + cor). Normaliza status/prazo/responsável/sigla (fallback por regex `SIGLA |` no nome) e ordena atrasadas → ativas → concluídas. Frontend: 1 repeater + filtros client-side (chips, busca, dropdowns).

### Painel em Dia

Emails versionados de novidades do painel (formato `v1.0 · jun/2026`). Operação atual via conversa: Gui fornece o conteúdo → Claude compõe e dispara pelo Brevo MCP (lista 6, template 1, tag `painel-em-dia`, `messageVersions` por destinatário) → registra em `versoes` (campo `dataLancamento` tipo DATE = `YYYY-MM-DD`). Backend `painelEmDia.jsw`: `adicionarMembroBrevo(email, nome)` e `sincronizarMembrosBrevo()`; `events.js` auto-inscreve novos membros. Etapa 2 (página de changelog no portal lendo `versoes`) pendente — ver roadmap.

### Insights BigQuery (protótipo)

Arquitetura validada visualmente (02/07/2026): backend `.jsw` autentica no BigQuery (`coevo-co`) via service account em Wix Secrets, consulta `gold_performance_diario`/`gold_hotelaria_diario` filtrando por `Sigla` e `fase='vigencia'`, e devolve JSON a um HtmlComponent com Chart.js (KPI cards + gráficos, replicando o Looker «Gerenciamento Performance · Mídia»). **Nada commitado ainda** — próximo grande passo do roadmap.

---

## Integrações e secrets

| Serviço | Uso | Secret (Wix Secrets Manager) |
|---|---|---|
| Anthropic API | Coevito (Smart Briefing) + análise de disparos | `ANTHROPIC_KEY` |
| ClickUp API | Wiki + criação de tasks + Pauta | `CLICKUP_TOKEN` |
| Brevo API | Cobranças, briefings, Painel em Dia | `BREVO_API_KEY` |
| BigQuery (`coevo-co`) | Insights (protótipo) | service account — a definir no Secrets |

Wix site ID: `28c0342f-0f6b-4b7e-acba-925f8c2ab138`. Brevo: pasta «Painel Coevo» = 5, lista «Painel em Dia» = 6, template `coevo-painel-em-dia` = 1.

APIs Wix usadas: `wix-members` / `wix-members-backend`, `wix-data`, `wix-location`, `wix-window` (lightbox), `wix-secrets-backend`.

---

## Regras críticas (⚠️ resumo — íntegra em `docs/prompt-continuidade.md`)

1. **Wix Data API: NUNCA PUT em item existente** (PUT substitui o item inteiro — incidente 01/07/2026 apagou dados de 67 subclientes AHI). Sempre fetch completo → spread → override → gravar; via API externa, preferir `bulk/items/patch`.
2. **Operações em massa ou irreversíveis em produção exigem GO explícito do Gui.** Cadastro/edição de `subclientes` propaga ao pipeline BigQuery via sync-dim.
3. **Nunca inventar** ID de elemento, nome de campo, ID de coleção ou rota — confirmar no código/CMS ou perguntar.
4. **Push só em `coevo-gui/coevo`**, sempre lendo a estrutura do repo antes.
5. Editar `disparos.html` **nunca** com slicing Python de índice `-1` (já corrompeu o arquivo); base de recuperação: commit `c879f3d54bdf0a0c27a1a824a3aacb16f01a995d`.

## Como contribuir

1. **Leia:** `docs/roadmap.md` (status e decisões) e `docs/prompt-continuidade.md` (regras + armadilhas).
2. Ao tocar página Velo: ler o arquivo real da página primeiro; IDs de elementos vivem no Editor, não no repo.
3. Ao fechar milestone: atualizar README + roadmap + prompt-continuidade **num commit único**.

## Contato & Status

- **PM/Dev:** Gui Mendes (Coevo)
- **Documentação viva:** `docs/roadmap.md` (fatos) · `docs/prompt-continuidade.md` (regras + aprendizados)
