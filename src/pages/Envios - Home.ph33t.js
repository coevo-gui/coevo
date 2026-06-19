// Página: Disparos de Cobrança — /portal/envios (Envios - Home)
// Elemento: #htmlDisparos (HtmlComponent) — visível por padrão no editor

import { currentMember } from 'wix-members';
import wixData from 'wix-data';
import wixLocation from 'wix-location';
import {
  criarDisparoComItens,
  fetchItensDisparo,
  salvarRascunhoItens,
  enviarDisparos,
  deletarDisparo
} from 'backend/emailDisparo.jsw';

$w.onReady(async () => {
  let authDone = false;
  let htmlReady = false;
  let memberEmail = '';

  function sendVeloReady() {
    $w('#htmlDisparos').postMessage({ type: 'VELO_READY' });
  }

  $w('#htmlDisparos').onMessage(async (event) => {
    const { id, type, payload } = event.data;
    if (!type) return;

    if (type === 'HTML_READY') {
      htmlReady = true;
      if (authDone) sendVeloReady();
      return;
    }

    const reply = (data) => {
      $w('#htmlDisparos').postMessage({ id, ...data });
    };

    try {
      switch (type) {

        case 'FETCH_DISPAROS': {
          const result = await wixData.query('disparos').descending('_createdDate').find();
          reply({ data: result.items });
          break;
        }

        case 'FETCH_SUBCLIENTES': {
          const result = await wixData.query('subclientes').eq('status', 'ativo').ascending('nome').find();
          reply({ data: result.items });
          break;
        }

        case 'CREATE_DISPARO': {
          const result = await criarDisparoComItens({ ...payload, criadoPor: memberEmail });
          if (result.ok) {
            reply({ disparoId: result.disparoId, disparo: result.disparo, itens: result.itens });
          } else {
            reply({ error: result.error });
          }
          break;
        }

        case 'FETCH_ITENS': {
          const result = await fetchItensDisparo(payload.disparoId);
          if (result.ok) {
            reply({ disparo: result.disparo, itens: result.itens });
          } else {
            reply({ error: result.error });
          }
          break;
        }

        case 'SALVAR_RASCUNHO': {
          const result = await salvarRascunhoItens(payload.itens);
          reply({ ok: result.ok, error: result.error || null });
          break;
        }

        case 'ENVIAR_DISPAROS': {
          const { disparoId, itens, destinatarios } = payload;
          await salvarRascunhoItens(itens);
          // Monta mapa itemId → scId a partir do _sc local
          // (contorna: wixData.query pode não retornar campos REFERENCE)
          const itemScMap = {};
          itens.forEach(item => {
            const scId = item._sc && item._sc._id;
            if (item._id && scId) itemScMap[item._id] = scId;
          });
          const result = await enviarDisparos(disparoId, itemScMap, destinatarios || {});
          reply({
            ok: result.ok,
            enviados: result.enviados || 0,
            erros: result.erros || 0,
            total: result.total || 0,
            error: result.error || null
          });
          break;
        }

        case 'DELETE_DISPARO': {
          const result = await deletarDisparo(payload.disparoId);
          reply({ ok: result.ok, error: result.error || null });
          break;
        }

        default:
          reply({ error: 'Tipo desconhecido: ' + type });
      }
    } catch (err) {
      console.error('[Envios Velo] Erro em', type, ':', err.message || err);
      reply({ error: err.message || 'Erro interno.' });
    }
  });

  // AUTH
  try {
    const member = await currentMember.getMember({ fieldsets: ['FULL'] });
    if (!member) { wixLocation.to('/login'); return; }
    memberEmail = member.loginEmail || '';

    const acesso = await wixData.query('acessoUsuario').eq('memberId', member._id).find();
    if (!acesso.items.length) { wixLocation.to('/portal'); return; }
    if (acesso.items[0].nivel !== 'coevo_admin') { wixLocation.to('/portal'); return; }

    authDone = true;
    if (htmlReady) sendVeloReady();
  } catch (err) {
    console.error('[Envios Velo] ERRO na auth:', err.message || JSON.stringify(err));
  }
});
