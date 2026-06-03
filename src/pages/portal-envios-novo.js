// Página: Novo Disparo — /portal/envios/novo
// Tipo: Página de membro personalizada (privada, somente coevo_admin)
//
// Elementos esperados no canvas:
//   #btnGAds            — Button (platform toggle)
//   #btnMAds            — Button (platform toggle)
//   #btnAmbas           — Button (platform toggle)
//   #inputMesRef        — TextInput  (formato: AAAA-MM, ex: 2026-06)
//   #inputVencimento    — TextInput  (formato: AAAA-MM-DD)
//   #inputTitulo        — TextInput
//   #inputCorpo         — TextBox    (multiline)
//   #inputBuscaSC       — TextInput  (filtro de busca)
//   #textContadorSC     — Text
//   #textErroSC         — Text (hidden por padrão)
//   #repeaterSCSel      — Repeater
//     #textNomeSCItem     — Text
//     #textSiglaItem      — Text
//     #btnToggleSC        — Button
//   #btnContinuar       — Button
//   #btnCancelar        — Button

import { currentMember } from 'wix-members';
import wixData from 'wix-data';
import wixLocation from 'wix-location';

let plataforma = 'gads';
const selecionados = new Set();
let todosSubclientes = [];

function parseBRL(str) {
  if (!str) return 0;
  return parseFloat(
    str.replace('R$', '').replace(/\./g, '').replace(',', '.').trim()
  ) || 0;
}

function atualizarTitulo() {
  const m = $w('#inputMesRef').value;
  if (!m || !m.includes('-')) return;
  const [year, month] = m.split('-');
  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const nomeMes = meses[parseInt(month) - 1];
  if (!nomeMes) return;
  const labels = { gads: 'GAds', mads: 'MAds', ambas: 'Ambas' };
  $w('#inputTitulo').value = `Cobrança ${labels[plataforma]} – ${nomeMes}/${year}`;
}

function definirPlataforma(p) {
  plataforma = p;
  const btnMap = { gads: '#btnGAds', mads: '#btnMAds', ambas: '#btnAmbas' };
  Object.keys(btnMap).forEach(key => {
    $w(btnMap[key]).style.backgroundColor = key === p ? '#002bff' : '#ffffff';
    $w(btnMap[key]).style.color = key === p ? '#ffffff' : '#6b6b82';
  });
  atualizarTitulo();
}

function renderizarSubclientes(lista) {
  $w('#repeaterSCSel').data = lista;
  $w('#repeaterSCSel').onItemReady(($item, sc) => {
    $item('#textNomeSCItem').text = sc.nome || '';
    $item('#textSiglaItem').text = sc.sigla || '';

    const isSelected = selecionados.has(sc._id);
    $item('#btnToggleSC').label = isSelected ? '✓ Selecionado' : 'Selecionar';
    $item('#btnToggleSC').style.backgroundColor = isSelected ? '#002bff' : '#ffffff';
    $item('#btnToggleSC').style.color = isSelected ? '#ffffff' : '#6b6b82';

    $item('#btnToggleSC').onClick(() => {
      if (selecionados.has(sc._id)) {
        selecionados.delete(sc._id);
        $item('#btnToggleSC').label = 'Selecionar';
        $item('#btnToggleSC').style.backgroundColor = '#ffffff';
        $item('#btnToggleSC').style.color = '#6b6b82';
      } else {
        selecionados.add(sc._id);
        $item('#btnToggleSC').label = '✓ Selecionado';
        $item('#btnToggleSC').style.backgroundColor = '#002bff';
        $item('#btnToggleSC').style.color = '#ffffff';
      }
      const n = selecionados.size;
      $w('#textContadorSC').text = `${n} selecionado${n !== 1 ? 's' : ''}`;
      if (n > 0) $w('#textErroSC').hide();
    });
  });
}

$w.onReady(async () => {
  try {
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

    $w('#btnGAds').onClick(() => definirPlataforma('gads'));
    $w('#btnMAds').onClick(() => definirPlataforma('mads'));
    $w('#btnAmbas').onClick(() => definirPlataforma('ambas'));
    definirPlataforma('gads');

    $w('#inputMesRef').onInput(() => atualizarTitulo());
    $w('#textErroSC').hide();

    const scResult = await wixData.query('subclientes').ascending('nome').find();
    todosSubclientes = scResult.items;
    renderizarSubclientes(todosSubclientes);

    $w('#inputBuscaSC').onInput(e => {
      const v = (e.target.value || '').toLowerCase();
      const filtrado = v
        ? todosSubclientes.filter(sc =>
            (sc.nome || '').toLowerCase().includes(v) ||
            (sc.sigla || '').toLowerCase().includes(v)
          )
        : todosSubclientes;
      renderizarSubclientes(filtrado);
    });

    $w('#btnCancelar').onClick(() => wixLocation.to('/portal/envios'));

    $w('#btnContinuar').onClick(async () => {
      if (!selecionados.size) {
        $w('#textErroSC').show();
        return;
      }
      $w('#textErroSC').hide();
      $w('#btnContinuar').disable();
      $w('#btnContinuar').label = 'Aguarde...';

      try {
        const novoDisparo = await wixData.insert('disparos', {
          titulo: $w('#inputTitulo').value || `Cobrança ${plataforma.toUpperCase()}`,
          plataforma,
          mesReferencia: $w('#inputMesRef').value || null,
          dataVencimento: $w('#inputVencimento').value || null,
          textoCorpo: $w('#inputCorpo').value || '',
          status: 'rascunho',
          criadoPor: member.loginEmail || member._id,
          totalEnviados: 0
        });

        const scMap = {};
        todosSubclientes.forEach(sc => { scMap[sc._id] = sc; });

        const inserts = Array.from(selecionados).map(scId => {
          const sc = scMap[scId] || {};
          const valorPadrao = plataforma === 'mads'
            ? parseBRL(sc.valorMidiaMeta)
            : parseBRL(sc.valorMidiaGoogle);
          return wixData.insert('itensDisparo', {
            disparoRef: novoDisparo._id,
            subclienteRef: scId,
            valorInvestimento: valorPadrao || 0,
            tipoPagamento: 'boleto',
            pixCode: '',
            boletoUrl: '',
            statusEnvio: 'pendente'
          });
        });

        await Promise.all(inserts);
        wixLocation.to('/portal/envios/detalhe?id=' + novoDisparo._id);

      } catch (err) {
        console.error('Erro ao criar disparo:', err);
        $w('#btnContinuar').enable();
        $w('#btnContinuar').label = 'Continuar para Cobranças';
      }
    });

  } catch (err) {
    console.error('Erro em portal-envios-novo:', err);
  }
});
