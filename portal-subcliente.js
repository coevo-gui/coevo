// Página: Ficha do Subclient — /portal/subcliente/{sigla}
// Tipo: Página Dinâmica conectada à coleção "subclientes"
// Campo de URL: sigla (configurar nas opções da coleção dinâmica)

import { currentMember } from 'wix-members';
import wixData from 'wix-data';
import wixLocation from 'wix-location';

let _scId = null; // guarda o _id do subclient para o save

$w.onReady(async () => {
  try {
    const member = await currentMember.getMember();
    if (!member) {
      wixLocation.to('/login');
      return;
    }

    const pathParts = wixLocation.path;
    const sigla = pathParts[pathParts.length - 1].toUpperCase();

    const scResult = await wixData
      .query('subclientes')
      .eq('sigla', sigla)
      .find();

    if (!scResult.items.length) {
      wixLocation.to('/portal');
      return;
    }

    const sc = scResult.items[0];
    _scId = sc._id;

    const acessoResult = await wixData
      .query('acessoUsuario')
      .eq('memberId', member._id)
      .find();

    if (!acessoResult.items.length) {
      wixLocation.to('/portal');
      return;
    }

    const acesso = acessoResult.items[0];
    const temAcesso = await verificarAcesso(acesso, sc);

    if (!temAcesso) {
      wixLocation.to('/portal');
      return;
    }

    // ── Dados principais ──────────────────────────────────────
    $w('#textNomeSC').text      = sc.nome        || '';
    $w('#textSigla').text       = sc.sigla       || '';
    $w('#textCNPJ').text        = sc.cnpj        || '—';
    $w('#textStatus').text      = sc.status      || '—';
    $w('#textResponsavel').text = sc.responsavel || '—';
    $w('#textCluster').text     = sc.cluster     || '—';
    $w('#textCidade').text      =
      [sc.cidade, sc.estado].filter(Boolean).join(', ') || '—';
    $w('#textOnboarding').text = sc.dataOnboarding
      ? new Date(sc.dataOnboarding).toLocaleDateString('pt-BR')
      : '—';
    $w('#textInicioContrato').text = sc.inicioContrato
      ? new Date(sc.inicioContrato).toLocaleDateString('pt-BR')
      : '—';
    $w('#textMarcaGA4').text = sc.marcaItemGA4 || '—';
    $w('#textEndereco').text = sc.endereco     || '—';

    // ── IDs de plataforma ─────────────────────────────────────
    $w('#textIdGA4').text  = sc.idGA4  || '—';
    $w('#textIdGAds').text = sc.idGAds || '—';
    $w('#textIdMAds').text = sc.idMAds || '—';
    $w('#textIdGMB').text  = sc.idGMB  || '—';

    // ── Contatos (leitura) ────────────────────────────────────
    $w('#textEmailGerente').text    = sc.emailGerenteGeral       || '—';
    $w('#textEmailFinanceiro').text = sc.emailFinanceiro         || '—';
    $w('#textRevisaoGAds').text     = sc.revisoesMensaisGAds     || '—';
    $w('#textRevisaoMeta').text     = sc.revisoesMensaisMetaAds  || '—';

    // ── Inputs editáveis — pré-populados ──────────────────────
    $w('#inputEmailGerente').value    = sc.emailGerenteGeral  || '';
    $w('#inputEmailFinanceiro').value = sc.emailFinanceiro    || '';
    $w('#inputTelefone').value        = sc.telefone           || '';
    $w('#inputEndereco').value        = sc.endereco           || '';

    // ── Links externos ────────────────────────────────────────
    if (sc.dashUrl) {
      $w('#btnDashboard').link = sc.dashUrl;
      $w('#btnDashboard').show();
    } else {
      $w('#btnDashboard').hide();
    }

    if (sc.dash2Url) {
      $w('#btnDashboard2').link = sc.dash2Url;
      $w('#btnDashboard2').show();
    } else {
      $w('#btnDashboard2').hide();
    }

    if (sc.wikiUrl) {
      $w('#btnWiki').link = sc.wikiUrl;
      $w('#btnWiki').show();
    } else {
      $w('#btnWiki').hide();
    }

    // ── Documentos vinculados ─────────────────────────────────
    const docsResult = await wixData
      .query('documentos')
      .eq('subclienteRef', sc._id)
      .descending('_createdDate')
      .find();

    if (docsResult.items.length) {
      $w('#repeaterDocs').data = docsResult.items;
      $w('#repeaterDocs').onItemReady(($item, doc) => {
        $item('#textDocNome').text = doc.titulo    || '';
        $item('#textDocCat').text  = doc.descricao || '';
        $item('#linkDoc').link     = doc.url       || '#';
        $item('#textDocData').text = doc._createdDate
          ? new Date(doc._createdDate).toLocaleDateString('pt-BR')
          : '';
      });
      $w('#containerDocs').show();
    } else {
      $w('#containerDocs').hide();
    }

    // ── Botões de edição ──────────────────────────────────────
    $w('#btnSalvarEdit').onClick(() => salvarAlteracoes());
    $w('#btnCancelarEdit').onClick(() => cancelarEdicao(sc));

  } catch (err) {
    console.error('Erro na ficha do subclient:', err);
  }
});

// ─────────────────────────────────────────────────────────────
// Salva as alterações feitas pelo cliente nos campos editáveis
// ─────────────────────────────────────────────────────────────
async function salvarAlteracoes() {
  if (!_scId) return;

  const emailGerente    = $w('#inputEmailGerente').value.trim();
  const emailFinanceiro = $w('#inputEmailFinanceiro').value.trim();
  const telefone        = $w('#inputTelefone').value.trim();
  const endereco        = $w('#inputEndereco').value.trim();

  if (!emailGerente) {
    $w('#msgErroEdit').text = 'O e-mail do gerente geral é obrigatório.';
    $w('#msgErroEdit').show();
    return;
  }

  try {
    $w('#btnSalvarEdit').disable();
    $w('#msgErroEdit').hide();

    await wixData.update('subclientes', {
      _id:               _scId,
      emailGerenteGeral: emailGerente,
      emailFinanceiro:   emailFinanceiro,
      telefone:          telefone,
      endereco:          endereco,
    });

    // Atualiza os campos de leitura em tela sem recarregar
    $w('#textEmailGerente').text    = emailGerente    || '—';
    $w('#textEmailFinanceiro').text = emailFinanceiro || '—';
    $w('#textEndereco').text        = endereco        || '—';

    $w('#msgSucessoEdit').show();
    setTimeout(() => {
      try { $w('#msgSucessoEdit').hide(); } catch (_) {}
    }, 3000);

  } catch (err) {
    console.error('Erro ao salvar alterações:', err);
    $w('#msgErroEdit').text = 'Erro ao salvar. Tente novamente.';
    $w('#msgErroEdit').show();
  } finally {
    $w('#btnSalvarEdit').enable();
  }
}

// ─────────────────────────────────────────────────────────────
// Cancela a edição e restaura os valores originais
// ─────────────────────────────────────────────────────────────
function cancelarEdicao(sc) {
  $w('#inputEmailGerente').value    = sc.emailGerenteGeral  || '';
  $w('#inputEmailFinanceiro').value = sc.emailFinanceiro    || '';
  $w('#inputTelefone').value        = sc.telefone           || '';
  $w('#inputEndereco').value        = sc.endereco           || '';
  $w('#msgErroEdit').hide();
  $w('#msgSucessoEdit').hide();
}

// ─────────────────────────────────────────────────────────────
// Verifica se o membro tem acesso ao subclient
// ─────────────────────────────────────────────────────────────
async function verificarAcesso(acesso, sc) {
  if (acesso.nivel === 'coevo_admin') return true;

  if (acesso.nivel === 'cliente_rede') {
    return acesso.clienteRef === sc.clienteRef;
  }

  if (acesso.nivel === 'cliente_unidade') {
    const refs = await wixData.queryReferenced(
      'acessoUsuario',
      acesso._id,
      'subclientes'
    );
    return refs.items.some(s => s._id === sc._id);
  }

  return false;
}
