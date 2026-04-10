// Página: Dashboards — /portal/dashboards
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

    if (!acessoResult.items.length) return;

    const acesso     = acessoResult.items[0];
    let subclientes  = [];
    let clientePai   = null;

    // ── Busca subclientes e cliente-pai ───────────────────────────────────
    if (acesso.nivel === 'coevo_admin') {
      subclientes = (
        await wixData.query('subclientes').ascending('nome').find()
      ).items;
      // Admin não tem cliente-pai único — oculta o card destaque
      $w('#featuredCard').hide();

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

      // Unidade não vê o card destaque da rede
      $w('#featuredCard').hide();
    }

    // ── Card destaque (apenas para cliente_rede) ──────────────────────────
    if (clientePai) {
      // Nome e descrição
      $w('#featuredNome').text = clientePai.nome || '';
      $w('#featuredDesc').text = [
        'Dashboard consolidado',
        `${subclientes.length} unidade${subclientes.length !== 1 ? 's' : ''}`,
      ].join(' · ');
      $w('#featuredCidade').text = [clientePai.cidade, clientePai.estado]
        .filter(Boolean)
        .join(', ');

      // Logo vs sigla no box #featuredLogoBox
      if (clientePai.logo) {
        $w('#featuredLogo').src = clientePai.logo;
        $w('#featuredLogo').show();
        $w('#featuredIcon').hide();
      } else {
        $w('#featuredIcon').text = clientePai.sigla || '';
        $w('#featuredIcon').show();
        $w('#featuredLogo').hide();
      }

      // Botão dashboard principal
      if (clientePai.dashUrl) {
        $w('#btnFeaturedDash').link   = clientePai.dashUrl;
        $w('#btnFeaturedDash').target = '_blank';
        $w('#btnFeaturedDash').show();
      } else {
        $w('#btnFeaturedDash').hide();
      }

      // Botão dashboard 2
      if (clientePai.dash2Url) {
        $w('#btnFeaturedDash2').link   = clientePai.dash2Url;
        $w('#btnFeaturedDash2').target = '_blank';
        $w('#btnFeaturedDash2').show();
      } else {
        $w('#btnFeaturedDash2').hide();
      }

      $w('#featuredCard').show();
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
        $item('#btnAbrirDash2').show();
      } else {
        $item('#btnAbrirDash2').hide();
      }
    });

  } catch (err) {
    console.error('Erro na página Dashboards:', err);
  }
});
