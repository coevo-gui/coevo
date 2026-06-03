# coevo — Painel do Cliente

Código Velo (frontend + backend) para o portal do cliente no site [coevo.co](https://www.coevo.co).

---

## Estrutura do repositório

```
src/
  backend/
    briefing.jsw          # Web Methods do Smart Briefing (IA, subclientes, emails)
    http-functions.js     # Vazio — substituído por briefing.jsw
  pages/
    portal.js                  # Página: Início /portal
    portal-subcliente.js       # Página dinâmica: /portal/subcliente/{sigla}
    portal-documentos.js       # Página: Documentos /portal/documentos
    portal-dashboards.js       # Página: Dashboards /portal/dashboards
    portal-configuracoes.js    # Página: Configurações /portal/configuracoes
    Smart Briefing.p8xhc.js    # Página: Smart Briefing — bridge Velo ↔ embed
```

---

## Portal do Cliente

### Coleções CMS (Wix)

| Coleção | Descrição |
|---|---|
| `clientes` | Clientes-pai (redes hoteleiras) |
| `subclientes` | Unidades individuais, referenciando `clientes` |
| `categoriaDocumento` | Categorias livres de documentos |
| `documentos` | Links/arquivos vinculados a subclientes |
| `acessoUsuario` | Controle de acesso por membro do Wix |

### Níveis de acesso (`acessoUsuario.nivel`)

| Valor | Descrição |
|---|---|
| `coevo_admin` | Equipe Coevo — vê tudo |
| `cliente_rede` | Gerente de rede — vê todos os subclientes do seu `clienteRef` |
| `cliente_unidade` | Gerente de unidade — vê apenas os subclientes vinculados via multi-reference |

### IDs de elementos por página

**portal.js**
- `#repeaterUnidades` → `#textSigla`, `#textNome`, `#textCidade`, `#dotStatus`, `#textTags`, `#btnVerFicha`
- `#searchCliente` — input de busca para filtrar cards por nome/sigla

**portal-subcliente.js**
- `#textNomeSC`, `#textSigla`, `#textCNPJ`, `#textStatus`, `#textResponsavel`
- `#textCluster`, `#textCidade`, `#textOnboarding`
- `#textIdGA4`, `#textIdGAds`, `#textIdMAds`, `#textIdGMB`
- `#textEmailGerente`, `#textEmailFinanceiro`
- `#textRevisaoGAds`, `#textRevisaoMeta`
- `#btnDashboard`, `#btnDashboard2`, `#btnWiki`
- `#repeaterDocs` → `#textDocNome`, `#textDocCat`, `#linkDoc`, `#textDocData`
- `#containerDocs`

**portal-documentos.js**
- `#textTotalDocs`
- `#repeaterDocs` → `#textTitulo`, `#textCategoria`, `#textDocData`, `#linkAbrir`

**portal-dashboards.js**
- `#repeaterDashboards` → `#textNomeDash`, `#textSiglaDash`, `#textCidadeDash`, `#btnAbrirDash`, `#btnAbrirDash2`

**portal-configuracoes.js**
- `#textNomeMembro`, `#textEmailMembro`, `#textNivelAcesso`
- `#textTotalUnidades`, `#textResponsavelCoevo`

---

## Smart Briefing

Formulário inteligente para solicitação de jobs por clientes. Integra IA (Anthropic), ClickUp e Brevo.

### Como funciona

1. Cliente preenche o formulário (etapa 1) com nome, unidade, tipo de entrega, campos dinâmicos por categoria, prazo e anexos
2. O Coevito (IA) analisa o briefing, consulta a wiki do cliente no ClickUp e faz perguntas para completar lacunas (etapa 2)
3. Cliente revisa o briefing final e confirma (etapa 3)
4. O sistema cria a task no ClickUp e envia dois emails via Brevo

### Arquitetura

O formulário vive num **HtmlComponent** (`#embedSmartBriefing`) embedado na página Wix. A comunicação entre o embed e o backend Velo é feita via API nativa do HtmlComponent:

```
Embed HTML
  → window.Wix.sendMessage
    → Smart Briefing.p8xhc.js (Velo, onMessage)
      → briefing.jsw (Web Methods, sem CORS)
        → Anthropic API (IA)
        → ClickUp API (task + anexos)
        → Brevo API (emails)
```

### Categorias de entrega

| Categoria | Campos dinâmicos principais |
|---|---|
| Criação visual | Material, dimensões, público, informações, referências |
| Campanha de mídia paga | Objetivo, plataforma, tipo de criativo, URL de destino |
| Site / Landing page | Tipo de entrega, URL, descrição |
| E-mail marketing | Tipo, assunto, conteúdo, público |
| Estande / Evento / Feira | Tipo, local, dimensões*, público-alvo, restrições de comunicação |
| Relatório / Planejamento | Tipo, período de referência |

\* Dimensões obrigatórias para: adesivagem de estande, sinalização física, material gráfico simples/complexo.
Para **adesivagem de estande**: anexo do gabarito da montadora é obrigatório.

### Integração ClickUp

| Campo | Valor |
|---|---|
| Lista | `coevo.pauta` (ID `901305624084`) |
| Status inicial | `REVISÃO` |
| Assignee padrão | Mari (`82199500`) |
| Campo `Cliente` | ID `e4ccb2ed-57e5-4f61-b82d-d09d85eee922` (tipo labels) |
| Campo `Entrega do Escopo` | ID `862f6435-d8a1-46a1-8495-d3f0c248b998` |

A descrição da task inclui: campos do formulário, lacunas identificadas pelo Coevito e histórico da conversa de aprimoramento.

### Integração Brevo

Dois emails disparados em paralelo após criação da task:

| Email | Destinatários | Conteúdo |
|---|---|---|
| Interno | Mari + Bruno (`mari@coevo.co`, `bruno@coevo.co`) | Cliente, nome da task, categoria, prazo, solicitante, link ClickUp |
| Externo | Solicitante (email do membro Wix logado) | Resumo completo dos campos + análise do Coevito |

Remetente: `midia@coevo.co`
Reply-to interno: email do solicitante
Reply-to externo: `mari@coevo.co`

### Wiki de clientes (ClickUp)

O Coevito consulta a wiki interna na primeira análise. Mapeamento de páginas:

| Sigla | Page ID |
|---|---|
| CJOI | `2zpg6-8793` |
| AHI | `2zpg6-1023` |
| WGA | `2zpg6-9153` |
| BRI | `2zpg6-7793` |
| SAG | `2zpg6-7833` |
| DYC | `2zpg6-5493` |
| HCV | `2zpg6-8153` |
| JCB | `2zpg6-9173` |

Documento: `2zpg6-1403`

### Secrets necessários (Wix Secrets Manager)

| Nome | Uso |
|---|---|
| `ANTHROPIC_KEY` | Chamadas à API da Anthropic (IA) |
| `CLICKUP_TOKEN` | Leitura da wiki de clientes no ClickUp |
| `BREVO_API_KEY` | Disparo de emails transacionais |

### Arquivo do embed

O HTML do formulário (`smart-briefing.html`) é gerado e mantido separadamente, embedado via HtmlComponent no Wix Editor. Não está versionado neste repositório.

---

## Dependências Wix

- `wix-members` (frontend + backend)
- `wix-data` (frontend + backend)
- `wix-location` (frontend)
- `wix-secrets-backend` (backend)
