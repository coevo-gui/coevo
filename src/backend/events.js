//
//  events.js
//
//  Created by Gui Mendes on 25/05/26.
//  Updated: auto-inscreve novos membros na lista Brevo «Painel em Dia»
//

import wixData                 from 'wix-data';
import { adicionarMembroBrevo } from 'backend/painelEmDia';

export function wixMembers_onMemberCreated(event) {
  const member = event.entity;

  const primeiroNome = member.profile?.firstName || '';
  const ultimoNome   = member.profile?.lastName  || '';
  const nomeCompleto = [primeiroNome, ultimoNome].filter(Boolean).join(' ');
  const email        = member.loginEmail || '';

  const tarefas = [
    // 1. Cria registro de acesso (comportamento original)
    wixData.insert('acessoUsuario', {
      memberId:    member._id,
      nomeUsuario: nomeCompleto,
    }),
  ];

  // 2. Inscreve na lista «Painel em Dia» no Brevo
  if (email) {
    tarefas.push(adicionarMembroBrevo(email, nomeCompleto || email));
  }

  return Promise.all(tarefas);
}
