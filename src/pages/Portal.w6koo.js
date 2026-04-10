// Página: Início — /portal
// Tipo: Página de membro personalizada (privada)
// Mostra a lista de subclientes acessíveis pelo membro logado

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

    if (acesso.nivel === 'coevo_admin') {
      const r = await wixData.query('subclientes').ascending('nome').find();
      subclientes = r.items;
    } else if (acesso.nivel === 'cliente_rede' && acesso.clienteRef) {
      const r = await wixData
        .query('subclientes')
        .eq('clienteRef', acesso.clienteRef)
        .ascending('nome')
        .find();
      subclientes = r.items;
    } else if (acesso.nivel === 'cliente_unidade') {
      const r = await wixData.queryReferenced(
        'acessoUsuario',
        acesso._id,
        'subclientes'
      );
      subclientes = r.items;
    }

    $w('#repeaterUnidades').data = subclientes;

    $w('#repeaterUnidades').onItemReady(($item, itemData) => {
      $item('#textSigla').text = itemData.sigla || '';
      $item('#textNome').text = itemData.nome || '';
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