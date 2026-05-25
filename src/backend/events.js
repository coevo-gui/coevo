//
//  events.js
//  
//
//  Created by Gui Mendes on 25/05/26.
//


import wixData from 'wix-data';

export function wixMembers_onMemberCreated(event) {
  const member = event.entity;

  const primeiroNome = member.profile?.firstName || '';
  const ultimoNome  = member.profile?.lastName  || '';
  const nomeCompleto = [primeiroNome, ultimoNome].filter(Boolean).join(' ');

  return wixData.insert('acessoUsuario', {
    memberId:     member._id,
    nomeUsuario:  nomeCompleto,
  });
}