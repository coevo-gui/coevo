/**
 * DRAFT — Velo Data Hooks (coevo/src/backend/data.js)
 *
 * Este arquivo deve ser copiado para o repo coevo-gui/coevo em
 * src/backend/data.js para que os hooks disparem automaticamente
 * quando clientes ou subclientes forem alterados no CMS.
 *
 * Pré-requisito: criar o secret SYNC_TOKEN no Wix Secrets Manager
 * (Painel > Dev Mode > Secrets Manager) com o mesmo valor da env var
 * WIX_SYNC_TOKEN do Vercel.
 *
 * ⚠️  Hooks NÃO disparam em: import CSV, bulk delete pelo Content Manager,
 *     edições via Wix Data REST API. A reconciliação diária (/api/wix-sync/full)
 *     cobre esses casos.
 */

import { getSecret } from 'wix-secrets-backend';
import { fetch } from 'wix-fetch';

const PAINEL_URL = 'https://painel.coevo.co/api/wix-sync';

async function enviarSync(collection, action, item) {
  let token;
  try {
    token = await getSecret('SYNC_TOKEN');
  } catch (e) {
    console.error('[sync] Falha ao ler SYNC_TOKEN:', e);
    return;
  }

  console.log(`[sync] ${action} ${collection}/${item._id}`);

  try {
    const res = await fetch(PAINEL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sync-Token': token,
      },
      body: JSON.stringify({ collection, action, item }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`[sync] ${collection}/${action} ${item._id}: ${res.status} ${text}`);
    } else {
      console.log(`[sync] ${collection}/${action} ${item._id}: OK`);
    }
  } catch (e) {
    console.error(`[sync] ${collection}/${action} fetch error:`, e);
  }
}

// ─── Clientes ───

export function clientes_afterInsert(item) {
  enviarSync('clientes', 'afterInsert', item);
  return item;
}

export function clientes_afterUpdate(item) {
  enviarSync('clientes', 'afterUpdate', item);
  return item;
}

export function clientes_afterRemove(item) {
  enviarSync('clientes', 'afterRemove', item);
  return item;
}

// ─── Subclientes ───

export function subclientes_afterInsert(item) {
  enviarSync('subclientes', 'afterInsert', item);
  return item;
}

export function subclientes_afterUpdate(item) {
  enviarSync('subclientes', 'afterUpdate', item);
  return item;
}

export function subclientes_afterRemove(item) {
  enviarSync('subclientes', 'afterRemove', item);
  return item;
}
