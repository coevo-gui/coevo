// Página: Disparos de Cobrança — /portal/envios (Envios - Home)
// Elemento: #htmlDisparos (HtmlComponent)
//
// FIX TIMING: onMessage é registrado ANTES de qualquer await
// O HtmlComponent carrega em background mesmo quando hidden no editor.
// Se onMessage só fosse registrado após await getMember() + query(),
// as mensagens iniciais do iframe seriam perdidas.
// Solução: queue de mensagens pré-auth processada após auth completar.

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
  // ── 1. Registra onMessage IMEDIATAMENTE — antes de qualquer await ────────
  // Mensagens que chegam antes da auth completar ficam na fila
  let authOk = false;
  let authMember = null;
  const preAuthQueue = [];

  $w('#htmlDisparos').onMessage(async (event) => {
    console.log('[Envios Velo] onMessage recebido:', JSON.stringify(event.data).substring(0, 150));
    if (!authOk) {
      console.log('[Envios Velo] Auth ainda pendente — enfileirando mensagem:', event.data?.type);
      preAuthQueue.push(event);
      return;
    }
    await handleMessage(event, authMember);
  });

  // ── 2. Agora faz auth ────────────────────────────────────────────────────
  try {
    const member = await currentMember.getMember();
    if (!member) { wixLocation.to('/login'); return; }

    const acesso = await wixData
      .query('acessoUsuario')
      .eq('memberId', member._id)
      .find();

    if (!acesso.items.length || acesso.items[0].nivel !== 'coevo_admin') {
      wixLocation.to('/portal');
      return;
    }

    authMember = member;
    authOk = true;
    $w('#htmlDisparos').show();

    console.log('[Envios Velo] Auth OK. Fila pré-auth:', preAuthQueue.length, 'msgs');

    // ── 3. Processa fila de mensagens que chegaram antes da auth ────────────
    for (const queuedEvent of preAuthQueue) {
      await handleMessage(queuedEvent, authMember);
    }

  } catch (err) {
    console.error('[Envios Velo] Erro na auth:', err);
    authOk = false;
  }

  // ── Handler de mensagens ─────────────────────────────────────────────────
  async function handleMessage(event, member) {
    const { id, type, payload } = event.data;
    if (!type) return;

    const reply = (data) => {
      console.log('[Envios Velo] reply para id=' + id + ' type=' + type);
      $w('#htmlDisparos').postMessage({ id, ...data });
    };

    try {
      switch (type) {

        case 'FETCH_DISPAROS': {
          const result = await wixData
            .query('disparos')
            .descending('_createdDate')
            .find();
          reply({ data: result.items });
          break;
        }

        case 'FETCH_SUBCLIENTES': {
          const result = await wixData
            .query('subclientes')
            .eq('status', 'ativo')
            .ascending('nome')
            .find();
          reply({ data: result.items });
          break;
        }

        case 'CREATE_DISPARO': {
          const { titulo, plataforma, mesReferencia, dataVencimento, textoCorpo, subclienteIds } = payload;

          const novoDisparo = await wixData.insert('disparos', {
            titulo,
            plataforma,
            mesReferencia: mesReferencia || null,
            dataVencimento: dataVencimento || null,
            textoCorpo: textoCorpo || '',
            status: 'rascunho',
            criadoPor: member.loginEmail || member._id,
            totalEnviados: 0
          });

          const scResult = await wixData
            .query('subclientes')
            .hasSome('_id', subclienteIds)
            .find();
          const scMap = {};
          scResult.items.forEach(sc => { scMap[sc._id] = sc; });

          const itens = await Promise.all(subclienteIds.map(scId => {
            const sc = scMap[scId] || {};
            const valor = plataforma === 'mads'
              ? parseBRL(sc.valorMidiaMeta)
              : parseBRL(sc.valorMidiaGoogle);
            return wixData.insert('itensDisparo', {
              disparoRef: novoDisparo._id,
              subclienteRef: scId,
              valorInvestimento: valor || 0,
              tipoPagamento: 'boleto',
              pixCode: '',
              boletoUrl: '',
              statusEnvio: 'pendente'
            });
          }));

          reply({
            disparoId: novoDisparo._id,
            disparo: novoDisparo,
            itens: itens.map(item => ({ ...item, _sc: scMap[item.subclienteRef] || {} }))
          });
          break;
        }

        case 'FETCH_ITENS': {
          const { disparoId } = payload;
          const [disparo, itensResult] = await Promise.all([
            wixData.get('disparos', disparoId),
            wixData.query('itensDisparo').eq('disparoRef', disparoId).find()
          ]);
          const itens = itensResult.items;
          const scIds = [...new Set(itens.map(i => i.subclienteRef))];
          const scResult = scIds.length
            ? await wixData.query('subclientes').hasSome('_id', scIds).find()
            : { items: [] };
          const scMap = {};
          scResult.items.forEach(sc => { scMap[sc._id] = sc; });
          reply({
            disparo,
            itens: itens.map(item => ({ ...item, _sc: scMap[item.subclienteRef] || {} }))
          });
          break;
        }

        case 'SALVAR_RASCUNHO': {
          const { itens } = payload;
          await Promise.all(itens.map(item =>
            wixData.update('itensDisparo', {
              _id: item._id,
              valorInvestimento: item.valorInvestimento,
              tipoPagamento: item.tipoPagamento,
              pixCode: item.pixCode || '',
              boletoUrl: item.boletoUrl || ''
            })
          ));
          reply({ ok: true });
          break;
        }

        case 'ENVIAR_DISPAROS': {
          const { disparoId, itens } = payload;
          await Promise.all(itens.map(item =>
            wixData.update('itensDisparo', {
              _id: item._id,
              valorInvestimento: item.valorInvestimento,
              tipoPagamento: item.tipoPagamento,
              pixCode: item.pixCode || '',
              boletoUrl: item.boletoUrl || ''
            })
          ));
          const result = await enviarDisparos(disparoId);
          reply({
            ok: result.ok,
            enviados: result.enviados,
            erros: result.erros,
            total: result.total
          });
          break;
        }

        default:
          console.warn('[Envios Velo] Tipo desconhecido:', type);
          reply({ error: 'Tipo desconhecido: ' + type });
      }

    } catch (err) {
      console.error('[Envios Velo] Erro em handler', type, ':', err);
      reply({ error: err.message || 'Erro interno.' });
    }
  }
});
