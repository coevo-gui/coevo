// Página: Pauta — /portal/pauta
// 1 repeater + filtros client-side (tab, texto, cliente, responsável)

import { currentMember } from 'wix-members';
import wixData from 'wix-data';
import wixLocation from 'wix-location';
import { getTarefasCliente } from 'backend/clickup.jsw';

let todasTarefas  = [];
let filtroTab     = 'todas';
let buscaTexto    = '';
let filtroSigla   = '';
let filtroResp    = '';

const FILTROS = {
  todas:      ()  => true,
  atrasadas:  t   => t.atrasada,
  aprovacao:  t   => t.statusNorm.includes('aprova'),
  semana:     t   => !t.atrasada && !t.concluida && t.diasFaltam <= 7,
  concluidas: t   => t.concluida,
};

const BTNS = {
  todas:      '#btnFiltroTodas',
  atrasadas:  '#btnFiltroAtrasadas',
  aprovacao:  '#btnFiltroAprovacao',
  semana:     '#btnFiltroSemana',
  concluidas: '#btnFiltroConcluidas',
};

function aplicarFiltros() {
  // Indica tab ativa via cor
  Object.keys(BTNS).forEach(k => {
    try { $w(BTNS[k]).style.color = k === filtroTab ? '#002bff' : '#6b7280'; } catch (_) {}
  });

  let r = todasTarefas.filter(FILTROS[filtroTab]);

  if (buscaTexto) {
    const b = buscaTexto.toLowerCase();
    r = r.filter(t => t.nome.toLowerCase().includes(b));
  }
  if (filtroSigla)  r = r.filter(t => t.sigla === filtroSigla);
  if (filtroResp)   r = r.filter(t => t.responsavel === filtroResp);

  $w('#textPautaTotal').text = `${r.length} tarefa${r.length !== 1 ? 's' : ''}`;
  $w('#repeaterPauta').data = r;
}

function setTab(tipo) {
  filtroTab = tipo;
  aplicarFiltros();
}

$w.onReady(async () => {
  try {
    const member = await currentMember.getMember();
    if (!member) { wixLocation.to('/login'); return; }

    const acessoResult = await wixData
      .query('acessoUsuario').eq('memberId', member._id).find();
    if (!acessoResult.items.length) return;

    const acesso = acessoResult.items[0];
    let siglas = null;

    if (acesso.nivel === 'cliente_rede' && acesso.clienteRef) {
      const r = await wixData.query('subclientes').eq('clienteRef', acesso.clienteRef).find();
      siglas = r.items.map(s => s.sigla).filter(Boolean);
    } else if (acesso.nivel === 'cliente_unidade') {
      const refs = await wixData.queryReferenced('acessoUsuario', acesso._id, 'subclientes');
      siglas = refs.items.map(s => s.sigla).filter(Boolean);
    }

    if (siglas !== null && siglas.length === 0) {
      $w('#textPautaTotal').text = '0 tarefas';
      $w('#repeaterPauta').data = [];
      return;
    }

    todasTarefas = await getTarefasCliente(siglas);

    // ---------- Labels dos chips ----------
    $w('#btnFiltroTodas').label      = `Todas (${todasTarefas.length})`;
    $w('#btnFiltroAtrasadas').label  = `Atrasadas (${todasTarefas.filter(FILTROS.atrasadas).length})`;
    $w('#btnFiltroAprovacao').label  = `Em aprovação (${todasTarefas.filter(FILTROS.aprovacao).length})`;
    $w('#btnFiltroSemana').label     = `Esta semana (${todasTarefas.filter(FILTROS.semana).length})`;
    $w('#btnFiltroConcluidas').label = `Concluídas (${todasTarefas.filter(FILTROS.concluidas).length})`;

    // ---------- Clicks dos chips ----------
    $w('#btnFiltroTodas').onClick(()      => setTab('todas'));
    $w('#btnFiltroAtrasadas').onClick(()  => setTab('atrasadas'));
    $w('#btnFiltroAprovacao').onClick(()  => setTab('aprovacao'));
    $w('#btnFiltroSemana').onClick(()     => setTab('semana'));
    $w('#btnFiltroConcluidas').onClick(() => setTab('concluidas'));

    // ---------- Busca por texto ----------
    $w('#inputBusca').onInput(e => {
      buscaTexto = (e.target.value || '').trim();
      aplicarFiltros();
    });

    // ---------- Dropdown de cliente ----------
    const siglasList = [...new Set(todasTarefas.map(t => t.sigla).filter(Boolean))].sort();
    if (siglasList.length > 1) {
      $w('#dropdownCliente').options = [
        { label: 'Todos os clientes', value: '' },
        ...siglasList.map(s => ({ label: s, value: s })),
      ];
      try { $w('#dropdownCliente').expand(); } catch (_) {}
      $w('#dropdownCliente').onChange(e => {
        filtroSigla = e.target.value || '';
        aplicarFiltros();
      });
    } else {
      try { $w('#dropdownCliente').collapse(); } catch (_) {}
    }

    // ---------- Dropdown de responsável ----------
    const respList = [...new Set(
      todasTarefas.map(t => t.responsavel).filter(r => r && r !== '—')
    )].sort();
    if (respList.length > 1) {
      $w('#dropdownResponsavel').options = [
        { label: 'Todos os responsáveis', value: '' },
        ...respList.map(r => ({ label: r, value: r })),
      ];
      $w('#dropdownResponsavel').onChange(e => {
        filtroResp = e.target.value || '';
        aplicarFiltros();
      });
    }

    // ---------- Repeater ----------
    $w('#repeaterPauta').onItemReady(($item, t) => {
      const isOk   = !t.atrasada && !t.concluida && !t.statusNorm.includes('aprova');
      const isCon  = t.concluida;
      const isApr  = !isCon && t.statusNorm.includes('aprova');
      const isLate = t.atrasada;
      const gray   = '#9ca3af';

      // --- Estado do card: fundo + borda ---
      const bg = isLate ? '#fffbfb' : isApr ? '#fffdf5' : isCon ? '#f9fafb' : '#ffffff';
      try { $item('#boxCard').style.backgroundColor = bg; } catch (_) {}
      try { $item('#boxCard').opacity = isCon ? 0.6 : 1; } catch (_) {}

      const borderColor = isLate ? '#f25252' : isApr ? '#f2b705' : isCon ? '#d1fae5' : '#e5e7eb';
      const borderWidth = (isLate || isApr) ? '2px' : '1.5px';
      try { $item('#boxCard').style.borderColor = borderColor; } catch (_) {}
      try { $item('#boxCard').style.borderWidth = borderWidth; } catch (_) {}

      // --- Sigla: fundo colorido + texto branco ---
      $item('#tagSigla').text = t.sigla || '—';
      $item('#tagSigla').style.color = isCon ? gray : '#ffffff';
      try { $item('#tagSiglaBox').style.backgroundColor = isCon ? '#e5e7eb' : t.siglaColor; } catch (_) {}

      // --- Nome ---
      $item('#textNomeTarefa').text = t.nome;
      $item('#textNomeTarefa').style.color = isCon ? gray : '#111827';

      // --- Badge temporal ---
      if (isLate) {
        $item('#tagTemporal').text = t.diasAtraso === 1 ? '1 dia em atraso' : `${t.diasAtraso} dias em atraso`;
        $item('#tagTemporal').style.color = '#f25252';
      } else if (isCon) {
        $item('#tagTemporal').text = 'concluído';
        $item('#tagTemporal').style.color = gray;
      } else if (isApr) {
        $item('#tagTemporal').text = 'aguardando aprovação';
        $item('#tagTemporal').style.color = '#c9a400';
      } else {
        $item('#tagTemporal').text =
          t.diasFaltam === 0 ? 'vence hoje'  :
          t.diasFaltam === 1 ? 'em 1 dia'    :
          `em ${t.diasFaltam} dias`;
        $item('#tagTemporal').style.color = '#04bfae';
      }

      // --- Status ---
      $item('#tagStatus').text = `● ${t.status}`;
      $item('#tagStatus').style.color = isCon ? gray : t.statusColor;

      // --- Prazo ---
      $item('#textPrazo').text = t.prazoFormatado;

      // --- Lista: cor da pill = cor do cliente (ou azul para coevo.pauta) ---
      const listaColor = isCon ? gray
        : t.lista === 'coevo.pauta' ? '#002bff'
        : t.siglaColor;
      $item('#textLista').text = t.lista;
      $item('#textLista').style.color = listaColor;
      try { $item('#textListaBox').style.backgroundColor = listaColor + '22'; } catch (_) {}

      // --- Responsável ---
      $item('#textResponsavel').text = t.responsavel;

      // --- Ponto de atividade recente ---
      try {
        t.recenteAtividade ? $item('#dotAtividade').expand() : $item('#dotAtividade').collapse();
      } catch (_) {}

      // --- Descrição + toggle ---
      if (t.descricao) {
        $item('#textDescricao').text = t.descricao;
        try { $item('#btnVerDescricao').expand(); } catch (_) {}
        $item('#btnVerDescricao').label = 'ver mais ↓';
        $item('#btnVerDescricao').onClick(() => {
          if ($item('#textDescricao').collapsed) {
            $item('#textDescricao').expand();
            $item('#btnVerDescricao').label = 'ocultar ↑';
          } else {
            $item('#textDescricao').collapse();
            $item('#btnVerDescricao').label = 'ver mais ↓';
          }
        });
      } else {
        try { $item('#btnVerDescricao').collapse(); } catch (_) {}
      }

      // --- Link ---
      $item('#btnAbrirTarefa').link   = t.url;
      $item('#btnAbrirTarefa').target = '_blank';
    });

    aplicarFiltros();

  } catch (err) {
    console.error('Erro na página Pauta:', err);
  }
});
