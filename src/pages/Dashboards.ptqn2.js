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

    const acesso = acessoResult.items[0];
    let subclientes = [];

    if (acesso.nivel === 'coevo_admin') {
      subclientes = (
        await wixData.query('subclientes').ascending('nome').find()
      ).items;
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
    }

    // Filtra apenas os que têm dashUrl
    const comDash = subclientes.filter(s => s.dashUrl);

    $w('#repeaterDashboards').data = comDash;
    $w('#repeaterDashboards').onItemReady(($item, sc) => {
      $item('#textNomeDash').text = sc.nome || '';
      $item('#textSiglaDash').text = sc.sigla || '';
      $item('#textCidadeDash').text =
        [sc.cidade, sc.estado].filter(Boolean).join(', ') || '';

      $item('#btnAbrirDash').link = sc.dashUrl;
      $item('#btnAbrirDash').target = '_blank';

      if (sc.dash2Url) {
        $item('#btnAbrirDash2').link = sc.dash2Url;
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
