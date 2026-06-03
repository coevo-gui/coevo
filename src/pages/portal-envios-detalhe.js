// Página: Detalhe do Disparo — /portal/envios/detalhe
// Tipo: Página de membro personalizada (privada, somente coevo_admin)
// Recebe parâmetro de URL: ?id=<disparoId>
//
// Elementos esperados no canvas:
//   #textTituloDisparo  — Text
//   #textPlataformaDisp — Text
//   #textMesRefDisp     — Text
//   #textVencimentoDisp — Text
//   #textTotalSC        — Text
//   #textProgPend       — Text
//   #textProgOk         — Text
//   #btnVoltar          — Button
//   #btnSalvarRascunho  — Button
//   #btnEnviar          — Button
//   #msgSucesso         — Text (hidden por padrão)
//   #msgErro            — Text (hidden por padrão)
//   #repeaterItens      — Repeater
//     #textNomeSCItem     — Text
//     #textSiglaItem      — Text
//     #inputValorItem     — TextInput
//     #btnPixItem         — Button
//     #btnBoletoItem      — Button
//     #inputDadosItem     — TextInput
//     #textStatusItem     — Text

import { currentMember } from 'wix-members';
import wixData from 'wix-data';
import wixLocation from 'wix-location';
import { enviarDisparos } from 'backend/emailDisparo.jsw';

const changes = {};
let itensGlobal = [];
const scMap = {};

function aplicarToggle($item, isPix) {
  $item('#btnPixItem').style.backgroundColor = isPix ? '#002bff' : '#ffffff';
  $item('#btnPixItem').style.color = isPix ? '#ffffff' : '#6b6b82';
  $item('#btnBoletoItem').style.backgroundColor = isPix ? '#ffffff' : '#002bff';
  $item('#btnBoletoItem').style.color = isPix ? '#6b6b82' : '#ffffff';
  $item('#inputDadosItem').placeholder = isPix
    ? 'Cole o código PIX aqui...'
    : 'https://boleto.banco.com.br/...';
}

function atualizarProgresso() {
  const total = itensGlobal.length;
  const preenchidos = itensGlobal.filter(item => {
    const c = changes[item._id] || item;
    const tipo = c.tipoPagamento || 'boleto';
    return tipo === 'pix'
      ? !!(c.pixCode || '').trim()
      : !!(c.boletoUrl || '').trim();
  }).length;
  const pendentes = total - preenchidos;

  $w('#textProgPend').text = `● ${pendentes} pendente${pendentes !== 1 ? 's' : ''}`;
  $w('#textProgOk').text = `● ${preenchidos} preenchido${preenchidos !== 1 ? 's' : ''}`;

  if (preenchidos >= total && total > 0) {
    $w('#btnEnviar').enable();
  } else {
    $w('#btnEnviar').disable();
  }
}

async function salvarAlteracoes() {
  const updates = Object.entries(changes).map(([id, data]) =>
    wixData.update('itensDisparo', {
      _id: id,
      valorInvestimento: data.valorInvestimento,
      tipoPagamento: data.tipoPagamento,
      pixCode: data.pixCode || '',
      boletoUrl: data.boletoUrl || ''
    })
  );
  await Promise.all(updates);
}

$w.onReady(async () => {
  try {
    $w('#msgSucesso').hide();
    $w('#msgErro').hide();

    const member = await currentMember.getMember();
    if (!member) { wixLocation.to('/login'); return; }

    const acessoResult = await wixData
      .query('acessoUsuario')
      .eq('memberId', member._id)
      .find();
    if (!acessoResult.items.length || acessoResult.items[0].nivel !== 'coevo_admin') {
      wixLocation.to('/portal');
      return;
    }

    const disparoId = wixLocation.query.id;
    if (!disparoId) { wixLocation.to('/portal/envios'); return; }

    const disparo = await wixData.get('disparos', disparoId);
    if (!disparo) { wixLocation.to('/portal/envios'); return; }

    $w('#textTituloDisparo').text = disparo.titulo || '—';
    const platLabels = { gads: 'Google Ads', mads: 'Meta Ads', ambas: 'Ambas' };
    $w('#textPlataformaDisp').text = platLabels[disparo.plataforma] || disparo.plataforma || '—';
    $w('#textMesRefDisp').text = disparo.mesReferencia
      ? new Date(disparo.mesReferencia).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
      : '—';
    $w('#textVencimentoDisp').text = disparo.dataVencimento
      ? new Date(disparo.dataVencimento).toLocaleDateString('pt-BR')
      : '—';

    const itensResult = await wixData
      .query('itensDisparo')
      .eq('disparoRef', disparoId)
      .find();
    itensGlobal = itensResult.items;

    $w('#textTotalSC').text = `${itensGlobal.length} subcliente${itensGlobal.length !== 1 ? 's' : ''}`;

    const scIds = [...new Set(itensGlobal.map(i => i.subclienteRef))];
    if (scIds.length) {
      const scResult = await wixData.query('subclientes').hasSome('_id', scIds).find();
      scResult.items.forEach(sc => { scMap[sc._id] = sc; });
    }

    $w('#repeaterItens').data = itensGlobal;
    $w('#repeaterItens').onItemReady(($item, itemData) => {
      const id = itemData._id;
      const sc = scMap[itemData.subclienteRef] || {};

      $item('#textNomeSCItem').text = sc.nome || '—';
      $item('#textSiglaItem').text = sc.sigla || '—';
      $item('#inputValorItem').value = itemData.valorInvestimento != null
        ? String(itemData.valorInvestimento)
        : '0';

      const isPix = (itemData.tipoPagamento || 'boleto') === 'pix';
      aplicarToggle($item, isPix);
      $item('#inputDadosItem').value = isPix
        ? (itemData.pixCode || '')
        : (itemData.boletoUrl || '');

      const temDados = isPix
        ? !!(itemData.pixCode || '').trim()
        : !!(itemData.boletoUrl || '').trim();
      $item('#textStatusItem').text = temDados ? '✓ Preenchido' : '● Pendente';

      $item('#btnPixItem').onClick(() => {
        changes[id] = { ...(changes[id] || itemData), tipoPagamento: 'pix' };
        aplicarToggle($item, true);
        $item('#inputDadosItem').value = changes[id].pixCode || '';
        atualizarProgresso();
      });

      $item('#btnBoletoItem').onClick(() => {
        changes[id] = { ...(changes[id] || itemData), tipoPagamento: 'boleto' };
        aplicarToggle($item, false);
        $item('#inputDadosItem').value = changes[id].boletoUrl || '';
        atualizarProgresso();
      });

      $item('#inputDadosItem').onInput(e => {
        changes[id] = changes[id] || { ...itemData };
        const tipo = changes[id].tipoPagamento || itemData.tipoPagamento || 'boleto';
        const val = e.target.value || '';
        if (tipo === 'pix') {
          changes[id].pixCode = val;
        } else {
          changes[id].boletoUrl = val;
        }
        $item('#textStatusItem').text = val.trim().length > 8 ? '✓ Preenchido' : '● Pendente';
        atualizarProgresso();
      });

      $item('#inputValorItem').onInput(e => {
        changes[id] = changes[id] || { ...itemData };
        changes[id].valorInvestimento = parseFloat(e.target.value) || 0;
      });
    });

    atualizarProgresso();

    $w('#btnSalvarRascunho').onClick(async () => {
      $w('#btnSalvarRascunho').disable();
      try {
        await salvarAlteracoes();
        $w('#msgSucesso').text = 'Rascunho salvo com sucesso.';
        $w('#msgSucesso').show();
        setTimeout(() => $w('#msgSucesso').hide(), 3000);
      } catch (err) {
        console.error('Erro ao salvar rascunho:', err);
      } finally {
        $w('#btnSalvarRascunho').enable();
      }
    });

    $w('#btnEnviar').onClick(async () => {
      $w('#btnEnviar').disable();
      $w('#btnSalvarRascunho').disable();
      $w('#btnEnviar').label = 'Enviando...';
      try {
        await salvarAlteracoes();
        const result = await enviarDisparos(disparoId);
        if (result.ok) {
          $w('#msgSucesso').text = `✓ ${result.enviados} email(s) enviado(s) com sucesso!`;
          $w('#msgSucesso').show();
          setTimeout(() => wixLocation.to('/portal/envios'), 2500);
        } else {
          $w('#msgErro').text = `⚠ ${result.enviados} enviados, ${result.erros} falha(s). Verifique o console.`;
          $w('#msgErro').show();
          $w('#btnEnviar').enable();
          $w('#btnSalvarRascunho').enable();
          $w('#btnEnviar').label = 'Retentar envio';
        }
      } catch (err) {
        console.error('Erro ao enviar disparos:', err);
        $w('#msgErro').text = 'Erro ao enviar. Tente novamente.';
        $w('#msgErro').show();
        $w('#btnEnviar').enable();
        $w('#btnSalvarRascunho').enable();
        $w('#btnEnviar').label = 'Enviar emails';
      }
    });

    $w('#btnVoltar').onClick(() => wixLocation.to('/portal/envios'));

  } catch (err) {
    console.error('Erro em portal-envios-detalhe:', err);
  }
});
