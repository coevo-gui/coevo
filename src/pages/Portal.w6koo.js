// Página: Início — /portal
// Tipo: Página de membro personalizada (privada)

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

    const acessoResult = await wixData
      .query('acessoUsuario')
      .eq('memberId', member._id)
      .find();

    if (!acessoResult.items.length) {
      console.warn('Membro sem registro em acessoUsuario:', member._id);
      return;
    }

    const acesso = acessoResult.items[0];
    let subclientes = [];
    let clientePai  = null; // dados do cliente-pai para o banner da rede

    // ── Busca subclientes e cliente-pai conforme nível de acesso ──────────
    if (acesso.nivel === 'coevo_admin') {
      subclientes = (
        await wixData.query('subclientes').ascending('nome').find()
      ).items;
      // Admin não tem cliente-pai único — oculta o banner de rede
      $w('#networkBar').hide();

    } else if (acesso.nivel === 'cliente_rede' && acesso.clienteRef) {
      subclientes = (
        await wixData
          .query('subclientes')
          .eq('clienteRef', acesso.clienteRef)
          .ascending('nome')
          .find()
      ).items;

      // Busca os dados do cliente-pai para o banner
      const clienteResult = await wixData.get('clientes', acesso.clienteRef);
      clientePai = clienteResult;

    } else if (acesso.nivel === 'cliente_unidade') {
      const refs = await wixData.queryReferenced(
        'acessoUsuario',
        acesso._id,
        'subclientes'
      );
      subclientes = refs.items;

      // Para unidade, busca o cliente-pai via o primeiro subclient
      if (subclientes.length && subclientes[0].clienteRef) {
        const clienteResult = await wixData.get(
          'clientes',
          subclientes[0].clienteRef
        );
        clientePai = clienteResult;
      }
    }

    // ── Banner da rede ────────────────────────────────────────────────────
    if (clientePai) {
      $w('#networkName').text = clientePai.nome || '';
      $w('#networkDesc').text = [
        `${subclientes.length} unidade${subclientes.length !== 1 ? 's' : ''}`,
        clientePai.cidade && clientePai.estado
          ? `${clientePai.cidade}, ${clientePai.estado}`
          : null,
        clientePai.status === 'ativo' ? 'ativo' : null,
      ]
        .filter(Boolean)
        .join(' · ');

      // Logo vs sigla no box #featuredBoxSiglaLogo
      if (clientePai.logo) {
        $w('#featuredLogo').src = clientePai.logo;
        $w('#featuredLogo').show();
        $w('#networkSigla').hide();
      } else {
        $w('#networkSigla').text = clientePai.sigla || '';
        $w('#networkSigla').show();
        $w('#featuredLogo').hide();
      }

      // Clique no banner leva à ficha do subclient pai (sigla em lowercase)
      const slugRede = (clientePai.sigla || '').toLowerCase();
      $w('#networkBar').onClick(() => {
        if (slugRede) wixLocation.to(`/portal/subcliente/${slugRede}`);
      });

      $w('#networkBar').show();
    }

    // ── Métricas ──────────────────────────────────────────────────────────
    $w('#contUnidades').text = String(subclientes.length);

    // Contagem de docs acessíveis (assíncrona, não bloqueia o restante)
    contarDocumentos(acesso, subclientes).then(totalDocs => {
      $w('#contDocs').text = String(totalDocs);
    });

    // Dashboards disponíveis
    const totalDash = subclientes.filter(s => s.dashUrl).length;
    $w('#contDashs').text = String(totalDash);

    // Tags únicas de todos os subclientes
    const todasTags = [...new Set(subclientes.flatMap(s => s.tags || []))];
    $w('#contTags').text = todasTags.length ? todasTags.join(', ') : '—';

    // ── Repeater de unidades ──────────────────────────────────────────────
    $w('#repeaterUnidades').data = subclientes;

    $w('#repeaterUnidades').onItemReady(($item, itemData) => {
      $item('#textSigla').text = itemData.sigla || '';
      $item('#textNome').text  = itemData.nome  || '';
      $item('#textCidade').text =
        [itemData.cidade, itemData.estado].filter(Boolean).join(', ') || '—';

      const isAtivo = itemData.status === 'ativo';
      $item('#dotStatus').style.backgroundColor = isAtivo
        ? '#04bfae'
        : '#f25252';

      const tags = itemData.tags || [];
      $item('#textTags').text = tags.join(' · ') || '';

      $item('#btnVerFicha').onClick(() => {
        const slug = (itemData.sigla || '').toLowerCase();
        wixLocation.to(`/portal/subcliente/${slug}`);
      });
    });

  } catch (err) {
    console.error('Erro na página Início:', err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Conta documentos acessíveis de forma assíncrona (não bloqueia o render)
// ─────────────────────────────────────────────────────────────────────────────
async function contarDocumentos(acesso, subclientes) {
  try {
    if (acesso.nivel === 'coevo_admin') {
      return await wixData.query('documentos').count();
    }
    const ids = subclientes.map(s => s._id);
    if (!ids.length) return 0;
    return await wixData
      .query('documentos')
      .hasSome('subclienteRef', ids)
      .count();
  } catch (_) {
    return 0;
  }
}
