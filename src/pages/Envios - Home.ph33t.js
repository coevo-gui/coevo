// Página: Disparos de Cobrança — /portal/envios
// Tipo: Página de membro (privada, somente coevo_admin)
//
// Elemento necessário na página: UMA HtmlComponent
//   ID: #htmlDisparos
//   Src: URL do disparos.html (hospedado no Wix Media Manager)
//   Tamanho: largura 100%, altura mínima 800px, Scrolling: habilitado
//
// Nenhum outro elemento Wix é necessário nesta página.

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
  try {
    // ── Verificação de acesso ──────────────────────────────
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

    $w('#htmlDisparos').show();

    // ── Roteador de mensagens do HTML ──────────────────────
    $w('#htmlDisparos').onMessage(async (e) => {
      const msg = e.data;
      if (!msg?.type) return;

      try {
        switch (msg.type) {

          // ── Lista de disparos ────────────────────────────
          case 'FETCH_DISPAROS': {
            const result = await wixData
              .query('disparos')
              .descending('_createdDate')
              .find();
            $w('#htmlDisparos').postMessage({
              type: 'DISPAROS_DATA',
              data: result.items
            });
            break;
          }

          // ── Lista de subclientes ─────────────────────────
          case 'FETCH_SUBCLIENTES': {
            const result = await wixData
              .query('subclientes')
              .eq('status', 'ativo')
              .ascending('nome')
              .find();
            $w('#htmlDisparos').postMessage({
              type: 'SUBCLIENTES_DATA',
              data: result.items
            });
            break;
          }

          // ── Criar novo disparo + itens ───────────────────
          case 'CREATE_DISPARO': {
            const { titulo, plataforma, mesReferencia, dataVencimento, textoCorpo, subclienteIds } = msg.payload;

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

            const inserts = subclienteIds.map(scId => {
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
            });
            const itens = await Promise.all(inserts);

            const itensComSC = itens.map(item => ({
              ...item,
              _sc: scMap[item.subclienteRef] || {}
            }));

            $w('#htmlDisparos').postMessage({
              type: 'DISPARO_CREATED',
              disparoId: novoDisparo._id,
              disparo: novoDisparo,
              itens: itensComSC
            });
            break;
          }

          // ── Carregar itens de disparo existente ──────────
          case 'FETCH_ITENS': {
            const { disparoId } = msg.payload;

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

            $w('#htmlDisparos').postMessage({
              type: 'ITENS_DATA',
              disparo,
              itens: itens.map(item => ({ ...item, _sc: scMap[item.subclienteRef] || {} }))
            });
            break;
          }

          // ── Salvar rascunho ──────────────────────────────
          case 'SALVAR_RASCUNHO': {
            const { itens } = msg.payload;
            await Promise.all(itens.map(item =>
              wixData.update('itensDisparo', {
                _id: item._id,
                valorInvestimento: item.valorInvestimento,
                tipoPagamento: item.tipoPagamento,
                pixCode: item.pixCode || '',
                boletoUrl: item.boletoUrl || ''
              })
            ));
            $w('#htmlDisparos').postMessage({ type: 'RASCUNHO_SAVED' });
            break;
          }

          // ── Salvar + enviar emails ───────────────────────
          case 'ENVIAR_DISPAROS': {
            const { disparoId, itens } = msg.payload;

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

            $w('#htmlDisparos').postMessage({
              type: 'ENVIO_RESULT',
              ok: result.ok,
              enviados: result.enviados,
              erros: result.erros,
              total: result.total
            });
            break;
          }
        }
      } catch (err) {
        console.error('[Envios] Erro no handler', msg.type, ':', err);
        $w('#htmlDisparos').postMessage({
          type: 'ERROR',
          message: 'Erro interno: ' + (err.message || 'tente novamente.')
        });
      }
    });

  } catch (err) {
    console.error('[Envios] Erro geral:', err);
  }
});
