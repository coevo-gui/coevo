// Página: Disparos de Cobrança — /portal/envios (Envios - Home)
// Elemento: #htmlDisparos (HtmlComponent) — visível por padrão no editor
//
// IMPORTANTE: campos REFERENCE (disparoRef, subclienteRef) só são escritos
// corretamente no backend com suppressAuth: true. Por isso CREATE_DISPARO,
// FETCH_ITENS e SALVAR_RASCUNHO chamam funções do backend.
//
// ATENÇÃO: wixData.query no backend pode não retornar campos REFERENCE nos itens.
// Por isso, ENVIAR_DISPAROS constrói itemScMap (itemId → scId) a partir do
// estado local do HTML (item._sc._id) e passa para enviarDisparos().

import { currentMember } from 'wix-members';
import wixData from 'wix-data';
import wixLocation from 'wix-location';
import {
  criarDisparoComItens,
  fetchItensDisparo,
  salvarRascunhoItens,
  enviarDisparos
} from 'backend/emailDisparo.jsw';

$w.onReady(async () => {
  let authDone = false;
  let htmlReady = false;
  let memberEmail = '';

  function sendVeloReady() {
    console.log('[Envios Velo] postMessage VELO_READY →');
    $w('#htmlDisparos').postMessage({ type: 'VELO_READY' });
  }

  $w('#htmlDisparos').onMessage(async (event) => {
    const { id, type, payload } = event.data;
    if (!type) return;
    console.log('[Envios Velo] onMessage:', type, id !== undefined ? 'id=' + id : '');

    if (type === 'HTML_READY') {
      htmlReady = true;
      console.log('[Envios Velo] HTML_READY. authDone:', authDone);
      if (authDone) sendVeloReady();
      return;
    }

    const reply = (data) => {
      console.log('[Envios Velo] reply →', type);
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
          // Chama backend para salvar referências corretamente
          const result = await criarDisparoComItens({ ...payload, criadoPor: memberEmail });
          if (result.ok) {
            reply({ disparoId: result.disparoId, disparo: result.disparo, itens: result.itens });
          } else {
            reply({ error: result.error });
          }
          break;
        }

        case 'FETCH_ITENS': {
          // Chama backend para ler com suppressAuth (garante leitura das referências)
          const result = await fetchItensDisparo(payload.disparoId);
          if (result.ok) {
            reply({ disparo: result.disparo, itens: result.itens });
          } else {
            reply({ error: result.error });
          }
          break;
        }

        case 'SALVAR_RASCUNHO': {
          // Chama backend para preservar disparoRef e subclienteRef no update
          const result = await salvarRascunhoItens(payload.itens);
          reply({ ok: result.ok, error: result.error || null });
          break;
        }

        case 'ENVIAR_DISPAROS': {
          const { disparoId, itens } = payload;
          // Salva rascunho primeiro via backend (preserva referências)
          await salvarRascunhoItens(itens);
          // Monta mapa itemId → scId a partir do _sc local
          // (contorna limitação: wixData.query pode não retornar campos REFERENCE)
          const itemScMap = {};
          itens.forEach(item => {
            const scId = item._sc && item._sc._id;
            if (item._id && scId) itemScMap[item._id] = scId;
          });
          // Envia os emails
          const result = await enviarDisparos(disparoId, itemScMap);
          reply({
            ok: result.ok,
            enviados: result.enviados || 0,
            erros: result.erros || 0,
            total: result.total || 0,
            error: result.error || null,
            _debug: result._debug || null
          });
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
    console.log('[Envios Velo] [1] chamando getMember()...');
    const member = await currentMember.getMember({ fieldsets: ['FULL'] });
    console.log('[Envios Velo] [2] getMember OK. member:', member ? member._id : 'null');

    if (!member) { wixLocation.to('/login'); return; }
    memberEmail = member.loginEmail || '';

    console.log('[Envios Velo] [3] consultando acessoUsuario...');
    const acesso = await wixData.query('acessoUsuario').eq('memberId', member._id).find();
    console.log('[Envios Velo] [4] acesso.items.length:', acesso.items.length);

    if (!acesso.items.length) { wixLocation.to('/portal'); return; }

    console.log('[Envios Velo] [5] nivel:', acesso.items[0].nivel);
    if (acesso.items[0].nivel !== 'coevo_admin') { wixLocation.to('/portal'); return; }

    authDone = true;
    console.log('[Envios Velo] [6] AUTH OK. htmlReady:', htmlReady);
    if (htmlReady) sendVeloReady();

  } catch (err) {
    console.error('[Envios Velo] ERRO na auth:', err.message || JSON.stringify(err));
  }
});
