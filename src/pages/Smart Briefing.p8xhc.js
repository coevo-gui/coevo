// Página: Smart Briefing
// Bridge entre o embed HTML (#embedSmartBriefing) e os Web Methods do backend.

import { currentMember } from 'wix-members';
import wixLocation from 'wix-location';
import { callAI, getSubclientes, sendBriefingEmails } from 'backend/briefing.jsw';

$w.onReady(async () => {
  const member = await currentMember.getMember({ fieldsets: ['FULL'] });
  if (!member) {
    wixLocation.to('/login');
    return;
  }

  const memberName = [member.profile?.firstName, member.profile?.lastName]
    .filter(Boolean).join(' ') || member.loginEmail || 'Solicitante';
  const memberEmail = member.loginEmail || '';

  console.log('[SB] Velo pronto. membro:', member._id, '| email:', memberEmail);

  $w('#embedSmartBriefing').onMessage(async (event) => {
    const { id, type, payload } = event.data;
    const reply = (data) => $w('#embedSmartBriefing').postMessage({ id, ...data });

    console.log('[SB] mensagem recebida do embed:', type, '| id:', id);

    if (type === 'GET_SUBCLIENTES') {
      const result = await getSubclientes(member._id);
      reply(result);
    }

    if (type === 'CALL_AI') {
      const result = await callAI(payload);
      reply(result);
    }

    if (type === 'SEND_EMAILS') {
      console.log('[SB] handler SEND_EMAILS atingido. solicitante:', memberEmail);
      const result = await sendBriefingEmails({
        ...payload,
        solicitanteNome: memberName,
        solicitanteEmail: memberEmail,
      });
      console.log('[SB] resultado sendBriefingEmails:', JSON.stringify(result));
      reply(result);
    }
  });
});
