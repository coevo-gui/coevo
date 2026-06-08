// Página: Smart Briefing
// Bridge entre o embed HTML (#embedSmartBriefing) e os Web Methods do backend.

import { currentMember } from 'wix-members';
import wixLocation from 'wix-location';
import {
  callAI,
  getSubclientes,
  sendBriefingEmails,
  createBriefingLog,
  updateBriefingLog,
} from 'backend/briefing.jsw';

$w.onReady(async () => {
  const member = await currentMember.getMember({ fieldsets: ['FULL'] });
  if (!member) {
    wixLocation.to('/login');
    return;
  }

  const memberName = [member.profile?.firstName, member.profile?.lastName]
    .filter(Boolean).join(' ') || member.loginEmail || 'Solicitante';
  const memberEmail = member.loginEmail || '';

  $w('#embedSmartBriefing').onMessage(async (event) => {
    const { id, type, payload } = event.data;
    const reply = (data) => $w('#embedSmartBriefing').postMessage({ id, ...data });

    if (type === 'GET_SUBCLIENTES') {
      const result = await getSubclientes(member._id);
      reply(result);
    }

    if (type === 'CALL_AI') {
      const result = await callAI(payload);
      reply(result);
    }

    if (type === 'CREATE_LOG') {
      const result = await createBriefingLog({
        ...payload,
        memberId: member._id,
        solicitanteNome: memberName,
      });
      reply(result);
    }

    if (type === 'UPDATE_LOG') {
      const result = await updateBriefingLog(payload);
      reply(result);
    }

    if (type === 'SEND_EMAILS') {
      const result = await sendBriefingEmails({
        ...payload,
        solicitanteNome: memberName,
        solicitanteEmail: memberEmail,
      });
      reply(result);
    }
  });
});
