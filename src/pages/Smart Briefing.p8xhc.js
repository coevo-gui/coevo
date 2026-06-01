// Página: Smart Briefing
// O HTML/CSS/JS do formulário vive num embed HTML (HtmlComponent) na página do Wix.
// Este arquivo de página é mantido mínimo — toda a lógica está no embed.
// Caso precise adicionar lógica Velo futura (ex: autenticação de membro), inclua aqui.

import { currentMember } from 'wix-members';
import wixLocation from 'wix-location';

$w.onReady(async () => {
  // Garante que apenas membros logados acessam a página
  const member = await currentMember.getMember();
  if (!member) {
    wixLocation.to('/login');
  }
});
