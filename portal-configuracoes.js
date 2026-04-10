// Página: Configurações — /portal/configuracoes
// Tipo: Página de membro personalizada (privada)

import { currentMember } from 'wix-members';
import wixData from 'wix-data';
import wixLocation from 'wix-location';

$w.onReady(async () => {
  try {
    const member = await currentMember.getMember({ fieldsets: ['FULL'] });
    if (!member) {
      wixLocation.to('/login');
      return;
    }

    $w('#textNomeMembro').text =
      [member.profile?.firstName, member.profile?.lastName]
        .filter(Boolean)
        .join(' ') || member.loginEmail || '—';
    $w('#textEmailMembro').text = member.loginEmail || '—';

    const acessoResult = await wixData
      .query('acessoUsuario')
      .eq('memberId', member._id)
      .find();

    if (!acessoResult.items.length) return;

    const acesso = acessoResult.items[0];

    const nivelLabels = {
      coevo_admin: 'Administrador Coevo',
      cliente_rede: 'Gerência de Rede',
      cliente_unidade: 'Gerente de Unidade',
    };
    $w('#textNivelAcesso').text = nivelLabels[acesso.nivel] || acesso.nivel;

    let totalUnidades = 0;
    let responsavel = '—';

    if (acesso.nivel === 'coevo_admin') {
      totalUnidades = await wixData.query('subclientes').count();
    } else if (acesso.nivel === 'cliente_rede' && acesso.clienteRef) {
      const r = await wixData
        .query('subclientes')
        .eq('clienteRef', acesso.clienteRef)
        .find();
      totalUnidades = r.items.length;
      if (r.items.length) responsavel = r.items[0].responsavel || '—';
    } else if (acesso.nivel === 'cliente_unidade') {
      const refs = await wixData.queryReferenced(
        'acessoUsuario',
        acesso._id,
        'subclientes'
      );
      totalUnidades = refs.items.length;
      if (refs.items.length) responsavel = refs.items[0].responsavel || '—';
    }

    $w('#textTotalUnidades').text = `${totalUnidades} unidade${totalUnidades !== 1 ? 's' : ''}`;
    $w('#textResponsavelCoevo').text = responsavel;
  } catch (err) {
    console.error('Erro na página Configurações:', err);
  }
});
