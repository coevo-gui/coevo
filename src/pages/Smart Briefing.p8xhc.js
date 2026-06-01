// Página: Smart Briefing
// Bridge entre o embed HTML (#embedSmartBriefing) e os Web Methods do backend.
// Usa a API nativa do Wix HtmlComponent (.onMessage / .postMessage) —
// funciona dentro do Web Worker do Velo, sem depender de window.

import { currentMember } from 'wix-members';
import wixLocation from 'wix-location';
import { callAI, getSubclientes } from 'backend/briefing.jsw';

$w.onReady(async () => {
  // Redireciona se não logado
  const member = await currentMember.getMember();
  if (!member) {
    wixLocation.to('/login');
    return;
  }

  // Escuta mensagens vindas do embed via API nativa do HtmlComponent
  $w('#embedSmartBriefing').onMessage(async (event) => {
    const { id, type, payload } = event.data;

    const reply = (data) =>
      $w('#embedSmartBriefing').postMessage({ id, ...data });

    if (type === 'GET_SUBCLIENTES') {
      const result = await getSubclientes();
      reply(result);
    }

    if (type === 'CALL_AI') {
      const result = await callAI(payload);
      reply(result);
    }
  });
});
