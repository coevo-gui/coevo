// Página: Smart Briefing
// Bridge entre o embed HTML (Artifact) e os Web Methods do backend.
// O embed se comunica via postMessage; este código escuta, executa e responde.

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

  // Escuta mensagens do embed
  window.addEventListener('message', async (event) => {
    // Aceita apenas mensagens com nossa assinatura
    if (!event.data || event.data.source !== 'sb-embed') return;

    const { id, type, payload } = event.data;

    const reply = (data) =>
      event.source.postMessage({ source: 'sb-velo', id, ...data }, '*');

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
