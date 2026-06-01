// Página: Smart Briefing
// Bridge entre o embed HTML (#embedSmartBriefing) e os Web Methods do backend.

import { currentMember } from 'wix-members';
import wixLocation from 'wix-location';
import { callAI, getSubclientes } from 'backend/briefing.jsw';

$w.onReady(async () => {
  const member = await currentMember.getMember();
  if (!member) {
    wixLocation.to('/login');
    return;
  }

  $w('#embedSmartBriefing').onMessage(async (event) => {
    const { id, type, payload } = event.data;
    const reply = (data) => $w('#embedSmartBriefing').postMessage({ id, ...data });

    if (type === 'GET_SUBCLIENTES') {
      // Passa o memberId para filtrar por permissão
      const result = await getSubclientes(member._id);
      reply(result);
    }

    if (type === 'CALL_AI') {
      const result = await callAI(payload);
      reply(result);
    }
  });
});
