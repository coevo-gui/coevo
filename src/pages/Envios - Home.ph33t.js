// Página: Disparos de Cobrança — /portal/envios (Envios - Home)
// Elemento: #htmlDisparos (HtmlComponent) — deve ser VISÍVEL por padrão no editor
//
// HANDSHAKE HTML_READY → VELO_READY:
//   1. HTML carrega → envia HTML_READY (avisa que listener está ativo)
//   2. Velo recebe HTML_READY → se auth OK → responde com VELO_READY
//      Velo completa auth → se HTML já avisou → envia VELO_READY
//   3. HTML recebe VELO_READY → inicia fetches
//
// IMPORTANTE: o #htmlDisparos deve estar VISÍVEL no Wix Editor (não "hidden on load")
// $w().postMessage() não funciona para iframes ocultos — o bridge Wix não está ativo

import { currentMember } from 'wix-members';
import wixData from 'wix-data';
import wixLocation from 'wix-location';
import { enviarDisparos } from 'backend/emailDisparo.jsw';

function parseBRL(str) {
  if (!str) return 0;
  return parseFloat(
    String(str).replace('R$', '').replace(/\./g, '').replace(',', '.').trim()
  ) || 0;
}

$w.onReady(async () => {
  let authDone = false;
  let htmlReady = false;

  function sendVeloReady() {
    console.log('[Envios Velo] enviando VELO_READY');
    $w('#htmlDisparos').postMessage({ type: 'VELO_READY' });
  }

  // onMessage registrado ANTES de qualquer await
  $w('#htmlDisparos').onMessage(async (event) => {
    const { id, type, payload } = event.data;
    if (!type) return;

    console.log('[Envios Velo] onMessage:', type, id !== undefined ? 'id=' + id : '');

    // Handshake: HTML avisa que está pronto para receber
    if (type === 'HTML_READY') {
      htmlReady = true;
      console.log('[Envios Velo] HTML_READY recebido. authDone:', authDone);
      if (authDone) sendVeloReady();
      return;
    }

    const reply = (data) => {
      console.log('[Envios Velo] reply →', type, 'id=' + id);
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
          const { titulo, plataforma, mesReferencia, dataVencimento, textoCorpo, subclienteIds } = payload;
          const novoDisparo = await wixData.insert('disparos', {
            titulo, plataforma,
            mesReferencia: mesReferencia || null,
            dataVencimento: dataVencimento || null,
            textoCorpo: textoCorpo || '',
            status: 'rascunho',
            criadoPor: '',
            totalEnviados: 0
          });
          const scResult = await wixData.query('subclientes').hasSome('_id', subclienteIds).find();
          const scMap = {};
          scResult.items.forEach(sc => { scMap[sc._id] = sc; });
          const itens = await Promise.all(subclienteIds.map(scId => {
            const sc = scMap[scId] || {};
            const valor = plataforma === 'mads' ? parseBRL(sc.valorMidiaMeta) : parseBRL(sc.valorMidiaGoogle);
            return wixData.insert('itensDisparo', {
              disparoRef: novoDisparo._id, subclienteRef: scId,
              valorInvestimento: valor || 0, tipoPagamento: 'boleto',
              pixCode: '', boletoUrl: '', statusEnvio: 'pendente'
            });
          }));
          reply({ disparoId: novoDisparo._id, disparo: novoDisparo,
            itens: itens.map(item => ({ ...item, _sc: scMap[item.subclienteRef] || {} })) });
          break;
        }

        case 'FETCH_ITENS': {
          const { disparoId } = payload;
          const [disparo, itensResult] = await Promise.all([
            wixData.get('disparos', disparoId),
            wixData.query('itensDisparo').eq('disparoRef', disparoId).find()
          ]);
          const scIds = [...new Set(itensResult.items.map(i => i.subclienteRef))];
          const scResult = scIds.length ? await wixData.query('subclientes').hasSome('_id', scIds).find() : { items: [] };
          const scMap = {};
          scResult.items.forEach(sc => { scMap[sc._id] = sc; });
          reply({ disparo, itens: itensResult.items.map(item => ({ ...item, _sc: scMap[item.subclienteRef] || {} })) });
          break;
        }

        case 'SALVAR_RASCUNHO': {
          await Promise.all(payload.itens.map(item =>
            wixData.update('itensDisparo', {
              _id: item._id, valorInvestimento: item.valorInvestimento,
              tipoPagamento: item.tipoPagamento, pixCode: item.pixCode || '', boletoUrl: item.boletoUrl || ''
            })
          ));
          reply({ ok: true });
          break;
        }

        case 'ENVIAR_DISPAROS': {
          const { disparoId, itens } = payload;
          await Promise.all(itens.map(item =>
            wixData.update('itensDisparo', {
              _id: item._id, valorInvestimento: item.valorInvestimento,
              tipoPagamento: item.tipoPagamento, pixCode: item.pixCode || '', boletoUrl: item.boletoUrl || ''
            })
          ));
          const result = await enviarDisparos(disparoId);
          reply({ ok: result.ok, enviados: result.enviados, erros: result.erros, total: result.total });
          break;
        }

        default:
          reply({ error: 'Tipo desconhecido: ' + type });
      }
    } catch (err) {
      console.error('[Envios Velo] Erro em', type, ':', err);
      reply({ error: err.message || 'Erro interno.' });
    }
  });

  // Auth
  try {
    const member = await currentMember.getMember();
    if (!member) { wixLocation.to('/login'); return; }

    const acesso = await wixData.query('acessoUsuario').eq('memberId', member._id).find();
    if (!acesso.items.length || acesso.items[0].nivel !== 'coevo_admin') {
      wixLocation.to('/portal'); return;
    }

    authDone = true;
    console.log('[Envios Velo] Auth OK. htmlReady:', htmlReady);

    if (htmlReady) {
      sendVeloReady();
    }
    // Se htmlReady = false, VELO_READY será enviado quando HTML_READY chegar

  } catch (err) {
    console.error('[Envios Velo] Erro na auth:', err);
  }
});
