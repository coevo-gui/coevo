// Página: Ficha do Subclient — /portal/subcliente/{sigla}
// Tipo: Página Dinâmica conectada à coleção "subclientes"
// Campo de URL: sigla (configurar nas opções da coleção dinâmica)

import { currentMember } from 'wix-members';
import wixData from 'wix-data';
import wixLocation from 'wix-location';

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

    // Dados principais
    $w('#textNomeSC').text = sc.nome || '';
    $w('#textSigla').text = sc.sigla || '';
    $w('#textCNPJ').text = sc.cnpj || '—';
    $w('#textStatus').text = sc.status || '—';
    $w('#textResponsavel').text = sc.responsavel || '—';
    $w('#textCluster').text = sc.cluster || '—';
    $w('#textCidade').text =
      [sc.cidade, sc.estado].filter(Boolean).join(', ') || '—';
    $w('#textOnboarding').text = sc.dataOnboarding
      ? new Date(sc.dataOnboarding).toLocaleDateString('pt-BR')
      : '—';

    // IDs de plataforma
    $w('#textIdGA4').text = sc.idGA4 || '—';
    $w('#textIdGAds').text = sc.idGAds || '—';
    $w('#textIdMAds').text = sc.idMAds || '—';
    $w('#textIdGMB').text = sc.idGMB || '—';

    // Contatos
    $w('#textEmailGerente').text = sc.emailGerenteGeral || '—';
    $w('#textEmailFinanceiro').text = sc.emailFinanceiro || '—';
    $w('#textRevisaoGAds').text = sc.revisoesMensaisGAds || '—';
    $w('#textRevisaoMeta').text = sc.revisoesMensaisMetaAds || '—';

    // Links externos
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

    // Documentos vinculados
    const docsResult = await wixData
      .query('documentos')
      .eq('subclienteRef', sc._id)
      .descending('_createdDate')
      .find();

    if (docsResult.items.length) {
      $w('#repeaterDocs').data = docsResult.items;
      $w('#repeaterDocs').onItemReady(($item, doc) => {
        $item('#textDocNome').text = doc.titulo || '';
        $item('#textDocCat').text = doc.descricao || '';
        $item('#linkDoc').link = doc.url || '#';
        $item('#textDocData').text = doc._createdDate
          ? new Date(doc._createdDate).toLocaleDateString('pt-BR')
          : '';
      });
      $w('#containerDocs').show();
    } else {
      $w('#containerDocs').hide();
    }
  } catch (err) {
    console.error('Erro na ficha do subclient:', err);
  }
});

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
