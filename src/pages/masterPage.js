// masterPage.js
// Alterna o Multi State Box #menuMultibox entre #menuAdmin e #menuGeral
// conforme o nível de acesso do membro logado.

import { currentMember } from 'wix-members';
import wixData from 'wix-data';

$w.onReady(async () => {
  try {
    const member = await currentMember.getMember();
    if (!member) return;

    const acessoResult = await wixData
      .query('acessoUsuario')
      .eq('memberId', member._id)
      .find();

    if (!acessoResult.items.length) return;

    const acesso = acessoResult.items[0];
    const estado = acesso.nivel === 'coevo_admin' ? 'menuAdmin' : 'menuGeral';

    $w('#menuMultibox').changeState(estado);
  } catch (err) {
    console.error('Erro no masterPage.js:', err);
  }
});
