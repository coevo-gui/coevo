# painel-coevo

Código Velo (frontend) para o portal do cliente no site coevo.co.

## Estrutura

```
pages/
  portal.js                  # Página: Início /portal
  portal-subcliente.js       # Página dinâmica: /portal/subcliente/{sigla}
  portal-documentos.js       # Página: Documentos /portal/documentos
  portal-dashboards.js       # Página: Dashboards /portal/dashboards
  portal-configuracoes.js    # Página: Configurações /portal/configuracoes
```

## Coleções CMS (Wix)

| Coleção | Descrição |
|---|---|
| `clientes` | Clientes-pai (redes hoteleiras) |
| `subclientes` | Unidades individuais, referenciando `clientes` |
| `categoriaDocumento` | Categorias livres de documentos |
| `documentos` | Links/arquivos vinculados a subclientes |
| `acessoUsuario` | Controle de acesso por membro do Wix |

## Níveis de acesso (`acessoUsuario.nivel`)

| Valor | Descrição |
|---|---|
| `coevo_admin` | Equipe Coevo — vê tudo |
| `cliente_rede` | Gerente de rede — vê todos os subclientes do seu `clienteRef` |
| `cliente_unidade` | Gerente de unidade — vê apenas os subclientes vinculados via multi-reference |

## IDs de elementos esperados por página

### portal.js
- `#repeaterUnidades` — repeater de cards de unidades
  - `#textSigla`, `#textNome`, `#textCidade`, `#dotStatus`, `#textTags`, `#btnVerFicha`

### portal-subcliente.js
- `#textNomeSC`, `#textSigla`, `#textCNPJ`, `#textStatus`, `#textResponsavel`
- `#textCluster`, `#textCidade`, `#textOnboarding`
- `#textIdGA4`, `#textIdGAds`, `#textIdMAds`, `#textIdGMB`
- `#textEmailGerente`, `#textEmailFinanceiro`
- `#textRevisaoGAds`, `#textRevisaoMeta`
- `#btnDashboard`, `#btnDashboard2`, `#btnWiki`
- `#repeaterDocs` → `#textDocNome`, `#textDocCat`, `#linkDoc`, `#textDocData`
- `#containerDocs`

### portal-documentos.js
- `#textTotalDocs`
- `#repeaterDocs` → `#textTitulo`, `#textCategoria`, `#textDocData`, `#linkAbrir`

### portal-dashboards.js
- `#repeaterDashboards` → `#textNomeDash`, `#textSiglaDash`, `#textCidadeDash`, `#btnAbrirDash`, `#btnAbrirDash2`

### portal-configuracoes.js
- `#textNomeMembro`, `#textEmailMembro`, `#textNivelAcesso`
- `#textTotalUnidades`, `#textResponsavelCoevo`

## Como usar

1. No Wix Editor, abra cada página do portal
2. Acesse o painel de código (`{}` → Page Code)
3. Cole o conteúdo do arquivo `.js` correspondente
4. Ajuste os IDs dos elementos para coincidir com os que você criou no canvas

## Dependências Wix

- `wix-members` (frontend)
- `wix-data` (frontend)
- `wix-location` (frontend)
