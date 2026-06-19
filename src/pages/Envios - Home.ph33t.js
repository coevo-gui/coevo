// Página: Disparos de Cobrança — /portal/envios (Envios - Home)
// Elemento: #htmlDisparos (HtmlComponent) — visível por padrão no editor

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
          // Salva os dados do formulário antes de enviar
          await Promise.all(itens.map(item =>
            wixData.update('itensDisparo', {
              _id: item._id, valorInvestimento: item.valorInvestimento,
              tipoPagamento: item.tipoPagamento, pixCode: item.pixCode || '', boletoUrl: item.boletoUrl || ''
            })
          ));
          const result = await enviarDisparos(disparoId);
          // Propaga result.error se presente (backend retorna em vez de throw)
          reply({
            ok: result.ok,
            enviados: result.enviados || 0,
            erros: result.erros || 0,
            total: result.total || 0,
            error: result.error || null
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

  // AUTH com logs granulares
  try {
    console.log('[Envios Velo] [1] chamando getMember()...');
    const member = await currentMember.getMember({ fieldsets: ['FULL'] });
    console.log('[Envios Velo] [2] getMember OK. member:', member ? member._id : 'null');

    if (!member) { wixLocation.to('/login'); return; }

    console.log('[Envios Velo] [3] consultando acessoUsuario para memberId:', member._id);
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
