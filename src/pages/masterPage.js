// masterPage.js
// Filtra itens do #horizontalMenu (definidos no Editor) com base no nível de acesso.
// "Cobranças" / "Envios" (link contém /portal/envios) → somente coevo_admin.

import { currentMember } from 'wix-members';
import wixData from 'wix-data';

const ADMIN_ONLY_PATHS = ['/portal/envios'];

function isAdminOnly(item) {
  const link = (item.link || '').toLowerCase();
  return ADMIN_ONLY_PATHS.some(p => link.includes(p));
}

function filterMenuItems(items, isAdmin) {
  if (isAdmin) return items;
  return items
    .filter(item => !isAdminOnly(item))
    .map(item => item.menuItems
      ? { ...item, menuItems: filterMenuItems(item.menuItems, isAdmin) }
      : item
    );
}

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
    const isAdmin = acesso.nivel === 'coevo_admin';

    // ── Filtra o menu visível (#horizontalMenu) ──────────────────────────
    try {
      const items = $w('#horizontalMenu').menuItems;
      $w('#horizontalMenu').menuItems = filterMenuItems(items, isAdmin);
    } catch (e) {
      console.warn('Não foi possível filtrar #horizontalMenu:', e.message);
    }

    // ── Tenta também no #membersMenu (fallback) ─────────────────────────
    try {
      const items = $w('#membersMenu').menuItems;
      $w('#membersMenu').menuItems = filterMenuItems(items, isAdmin);
    } catch (_) {}

  } catch (err) {
    console.error('Erro no masterPage.js:', err);
  }
});
