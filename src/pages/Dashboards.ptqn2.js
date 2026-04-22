// Página: Dashboards — /portal/dashboards
// Tipo: Página de membro personalizada (privada)

import { currentMember } from 'wix-members';
import wixData from 'wix-data';
import wixLocation from 'wix-location';
import wixWindow from 'wix-window';

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

function paraEmbedUrl(url) {
  if (!url) return '';
  if (url.includes('/embed/reporting/')) return url;
  let result = url.replace(/\/u\/\d+\/reporting\//, '/reporting/');
  result = result.replace('/reporting/', '/embed/reporting/');
  return result;
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

    // ── Busca cliente-pai para qualquer nível que tenha clienteRef ─────────
    if (acesso.clienteRef) {
      try {
        clientePai = await wixData.get('clientes', acesso.clienteRef);
      } catch (_) {}
    }

    // ── Busca subclientes ──────────────────────────────────────────────────
    if (acesso.nivel === 'coevo_admin') {
      subclientes = (
        await wixData.query('subclientes').ascending('nome').find()
      ).items;
      // Admin não tem rede específica — oculta card destaque
      aplicarVisibilidade($w('#featuredCard'), false);

    } else if (acesso.nivel === 'cliente_rede' && acesso.clienteRef) {
      subclientes = (
        await wixData
          .query('subclientes')
          .eq('clienteRef', acesso.clienteRef)
          .ascending('nome')
          .find()
      ).items;

    } else if (acesso.nivel === 'cliente_unidade') {
      const refs = await wixData.queryReferenced(
        'acessoUsuario',
        acesso._id,
        'subclientes'
      );
      subclientes = refs.items;
      if (!subclientes.length) {
        const r = await wixData
          .query('subclientes')
          .hasSome('acessoUsuario_subclientes', [acesso._id])
          .ascending('nome')
          .find();
        subclientes = r.items;
      }
    }

    // ── Card destaque (qualquer nível com clienteRef) ─────────────────────
    if (clientePai && acesso.nivel !== 'coevo_admin') {
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

    // ── Contagem e repeater ────────────────────────────────────────────────
    const comDash = subclientes.filter(s => s.dashUrl);
    try { $w('#countDash').text = String(comDash.length); } catch (_) {}

    $w('#repeaterDashboards').data = comDash;

    $w('#repeaterDashboards').onItemReady(($item, sc) => {
      $item('#textNomeDash').text  = sc.nome  || '';
      $item('#textSiglaDash').text = sc.sigla || '';
      $item('#textCidadeDash').text =
        [sc.cidade, sc.estado].filter(Boolean).join(', ') || '';

      // ── Botões de dashboard: abrem a janela dashboardWindow ────────────
      if (sc.dashUrl) {
        try {
          $item('#btnDash1').onClick(() => {
            wixWindow.openLightbox('dashboardWindow', {
              embedUrl:  paraEmbedUrl(sc.dashUrl),
              normalUrl: sc.dashUrl,
            });
          });
        } catch (_) {}
      }

      if (sc.dash2Url) {
        try {
          $item('#btnDash2').onClick(() => {
            wixWindow.openLightbox('dashboardWindow', {
              embedUrl:  paraEmbedUrl(sc.dash2Url),
              normalUrl: sc.dash2Url,
            });
          });
          aplicarVisibilidade($item('#btnDash2'), true);
        } catch (_) {}
      } else {
        try { aplicarVisibilidade($item('#btnDash2'), false); } catch (_) {}
      }
    });

  } catch (err) {
    console.error('Erro na página Dashboards:', err);
  }
});
