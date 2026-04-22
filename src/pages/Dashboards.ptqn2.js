// Página: Dashboards — /portal/dashboards
// Tipo: Página de membro personalizada (privada)

import { currentMember } from 'wix-members';
import wixData from 'wix-data';
import wixLocation from 'wix-location';

// Helper: oculta/colapsa ou exibe/expande com segurança
function aplicarVisibilidade(el, mostrar) {
  try {
    if (mostrar) {
      if (typeof el.expand === 'function') el.expand();
      if (typeof el.show  === 'function') el.show();
    } else {
      if (typeof el.collapse === 'function') el.collapse();
      if (typeof el.hide    === 'function') el.hide();
    }
  } catch (e) {
    console.warn('Erro ao aplicar visibilidade:', e.message);
  }
}

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

    if (!acessoResult.items.length) return;

    const acesso    = acessoResult.items[0];
    let subclientes = [];
    let clientePai  = null;

    // ── Busca subclientes e cliente-pai ───────────────────────────────────
    if (acesso.nivel === 'coevo_admin') {
      subclientes = (
        await wixData.query('subclientes').ascending('nome').find()
      ).items;
      aplicarVisibilidade($w('#featuredCard'), false);

    } else if (acesso.nivel === 'cliente_rede' && acesso.clienteRef) {
      subclientes = (
        await wixData
          .query('subclientes')
          .eq('clienteRef', acesso.clienteRef)
          .ascending('nome')
          .find()
      ).items;
      clientePai = await wixData.get('clientes', acesso.clienteRef);

    } else if (acesso.nivel === 'cliente_unidade') {
      const refs = await wixData.queryReferenced(
        'acessoUsuario',
        acesso._id,
        'subclientes'
      );
      subclientes = refs.items;
      aplicarVisibilidade($w('#featuredCard'), false);
    }

    // ── Card destaque (apenas para cliente_rede) ──────────────────────────
    if (clientePai) {
      $w('#featuredNome').text = clientePai.nome || '';
      $w('#featuredDesc').text = [
        'Dashboard consolidado',
        `${subclientes.length} unidade${subclientes.length !== 1 ? 's' : ''}`,
      ].join(' · ');
      $w('#featuredCidade').text = [clientePai.cidade, clientePai.estado]
        .filter(Boolean)
        .join(', ');

      if (clientePai.logo) {
        $w('#featuredLogo').src = clientePai.logo;
        aplicarVisibilidade($w('#featuredLogo'), true);
        aplicarVisibilidade($w('#featuredIcon'), false);
      } else {
        $w('#featuredIcon').text = clientePai.sigla || '';
        aplicarVisibilidade($w('#featuredIcon'), true);
        aplicarVisibilidade($w('#featuredLogo'), false);
      }

      if (clientePai.dashUrl) {
        $w('#btnFeaturedDash').link   = clientePai.dashUrl;
        $w('#btnFeaturedDash').target = '_blank';
        aplicarVisibilidade($w('#btnFeaturedDash'), true);
      } else {
        aplicarVisibilidade($w('#btnFeaturedDash'), false);
      }

      if (clientePai.dash2Url) {
        $w('#btnFeaturedDash2').link   = clientePai.dash2Url;
        $w('#btnFeaturedDash2').target = '_blank';
        aplicarVisibilidade($w('#btnFeaturedDash2'), true);
      } else {
        aplicarVisibilidade($w('#btnFeaturedDash2'), false);
      }

      aplicarVisibilidade($w('#featuredCard'), true);
    }

    // ── Contagem no header ────────────────────────────────────────────────
    const comDash = subclientes.filter(s => s.dashUrl);
    $w('#countDash').text = String(comDash.length);

    // ── Repeater de unidades com dashboard ───────────────────────────────
    $w('#repeaterDashboards').data = comDash;

    $w('#repeaterDashboards').onItemReady(($item, sc) => {
      $item('#textNomeDash').text  = sc.nome  || '';
      $item('#textSiglaDash').text = sc.sigla || '';
      $item('#textCidadeDash').text =
        [sc.cidade, sc.estado].filter(Boolean).join(', ') || '';

      $item('#btnAbrirDash').link   = sc.dashUrl;
      $item('#btnAbrirDash').target = '_blank';

      if (sc.dash2Url) {
        $item('#btnAbrirDash2').link   = sc.dash2Url;
        $item('#btnAbrirDash2').target = '_blank';
        aplicarVisibilidade($item('#btnAbrirDash2'), true);
      } else {
        aplicarVisibilidade($item('#btnAbrirDash2'), false);
      }
    });

  } catch (err) {
    console.error('Erro na página Dashboards:', err);
  }
});
