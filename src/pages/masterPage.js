// masterPage.js
// Controla o menu de navegação #membersMenu com base no nível de acesso do membro.
//
// Itens fixos (sempre visíveis):
//   Portal, Documentos, Dashboards, meu perfil
//
// Itens dinâmicos:
//   Hotel       → aparece apenas 1 vez (link direto) se o usuário tem 1 subclient,
//                 ou como submenu se tem vários. Nunca aparece se não tem acesso.
//   Editar Hotel → aparece apenas se o usuário tem acesso a pelo menos 1 subclient.

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
    let subclientes = [];

    if (acesso.nivel === 'coevo_admin') {
      subclientes = (
        await wixData.query('subclientes').ascending('nome').limit(100).find()
      ).items;
    } else if (acesso.nivel === 'cliente_rede' && acesso.clienteRef) {
      subclientes = (
        await wixData
          .query('subclientes')
          .eq('clienteRef', acesso.clienteRef)
          .ascending('nome')
          .find()
      ).items;
    } else if (acesso.nivel === 'cliente_unidade') {
      const refs = await wixData.queryReferenced(
        'acessoUsuario',
        acesso._id,
        'subclientes'
      );
      subclientes = refs.items.sort((a, b) =>
        (a.nome || '').localeCompare(b.nome || '', 'pt-BR')
      );
    }

    // ── Monta os itens do menu ────────────────────────────────────────────
    const itensFixos = [
      { label: 'Portal',       link: '/painel/home' },
      { label: 'Documentos',   link: '/painel/documentos' },
      { label: 'Dashboards',   link: '/painel/dashboards' },
    ];

    // Item "Hotel": só aparece se o membro tem acesso a pelo menos 1 subclient
    if (subclientes.length === 1) {
      // Acesso a 1 subclient → link direto
      const slug = (subclientes[0].sigla || '').toLowerCase();
      itensFixos.push({
        label: subclientes[0].nome || 'Hotel',
        link:  `/cliente/${slug}`,
      });
    } else if (subclientes.length > 1) {
      // Acesso a vários → submenu com cada subclient
      itensFixos.push({
        label: 'Hotel',
        link:  '#',
        subItems: subclientes.map(sc => ({
          label: `${sc.sigla} — ${sc.nome}`,
          link:  `/cliente/${(sc.sigla || '').toLowerCase()}`,
        })),
      });
    }

    // Item "Editar Hotel": só aparece se tem pelo menos 1 subclient acessível
    if (subclientes.length > 0) {
      const primeiroSlug = (subclientes[0].sigla || '').toLowerCase();
      itensFixos.push({
        label: 'Editar Hotel',
        link:  `/cliente/editar/${primeiroSlug}`,
      });
    }

    itensFixos.push({ label: 'meu perfil', link: '/painel/perfil' });

    // ── Aplica ao elemento de menu ────────────────────────────────────────
    try {
      $w('#membersMenu').menuItems = itensFixos;
    } catch (e) {
      console.warn('Não foi possível atualizar #membersMenu:', e.message);
    }

  } catch (err) {
    console.error('Erro no masterPage.js:', err);
  }
});
