// Página: Pauta — /portal/pauta
// 1 repeater + 5 filtros client-side

import { currentMember } from 'wix-members';
import wixData from 'wix-data';
import wixLocation from 'wix-location';
import { getTarefasCliente } from 'backend/clickup.jsw';

let todasTarefas = [];

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

function aplicarFiltro(tipo) {
  // Indica filtro ativo via cor do texto (único recurso disponível em Velo)
  Object.keys(BTNS).forEach(key => {
    try { $w(BTNS[key]).style.color = key === tipo ? '#002bff' : '#6b7280'; } catch (_) {}
  });

  const filtradas = todasTarefas.filter(FILTROS[tipo]);
  $w('#textPautaTotal').text = `${filtradas.length} tarefa${filtradas.length !== 1 ? 's' : ''}`;
  $w('#repeaterPauta').data = filtradas;
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

    // Labels dos chips com contagem (calculados uma vez, não mudam ao filtrar)
    $w('#btnFiltroTodas').label      = `Todas (${todasTarefas.length})`;
    $w('#btnFiltroAtrasadas').label  = `Atrasadas (${todasTarefas.filter(FILTROS.atrasadas).length})`;
    $w('#btnFiltroAprovacao').label  = `Em aprovação (${todasTarefas.filter(FILTROS.aprovacao).length})`;
    $w('#btnFiltroSemana').label     = `Esta semana (${todasTarefas.filter(FILTROS.semana).length})`;
    $w('#btnFiltroConcluidas').label = `Concluídas (${todasTarefas.filter(FILTROS.concluidas).length})`;

    // Click handlers dos chips
    $w('#btnFiltroTodas').onClick(()      => aplicarFiltro('todas'));
    $w('#btnFiltroAtrasadas').onClick(()  => aplicarFiltro('atrasadas'));
    $w('#btnFiltroAprovacao').onClick(()  => aplicarFiltro('aprovacao'));
    $w('#btnFiltroSemana').onClick(()     => aplicarFiltro('semana'));
    $w('#btnFiltroConcluidas').onClick(() => aplicarFiltro('concluidas'));

    // Repeater — onItemReady registrado uma vez
    $w('#repeaterPauta').onItemReady(($item, t) => {

      // Sigla
      $item('#tagSigla').text = t.sigla || '—';
      $item('#tagSigla').style.color = t.siglaColor;

      // Nome
      $item('#textNomeTarefa').text = t.nome;

      // Badge temporal unificado (#tagTemporal)
      if (t.atrasada) {
        $item('#tagTemporal').text = t.diasAtraso === 1 ? '1 dia em atraso' : `${t.diasAtraso} dias em atraso`;
        $item('#tagTemporal').style.color = '#f25252';
      } else if (t.concluida) {
        $item('#tagTemporal').text = 'concluído';
        $item('#tagTemporal').style.color = '#10b981';
      } else if (t.statusNorm.includes('aprova')) {
        $item('#tagTemporal').text = 'aguardando aprovação';
        $item('#tagTemporal').style.color = '#c9a400';
      } else {
        $item('#tagTemporal').text =
          t.diasFaltam === 0 ? 'vence hoje' :
          t.diasFaltam === 1 ? 'em 1 dia'   :
          `em ${t.diasFaltam} dias`;
        $item('#tagTemporal').style.color = '#04bfae';
      }

      // Status
      $item('#tagStatus').text = `● ${t.status}`;
      $item('#tagStatus').style.color = t.statusColor;

      // Meta
      $item('#textPrazo').text       = t.prazoFormatado;
      $item('#textLista').text       = t.lista;
      $item('#textResponsavel').text = t.responsavel;

      // Ponto de atividade recente
      try {
        t.recenteAtividade
          ? $item('#dotAtividade').expand()
          : $item('#dotAtividade').collapse();
      } catch (_) {}

      // Descrição + toggle
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

      // Link
      $item('#btnAbrirTarefa').link   = t.url;
      $item('#btnAbrirTarefa').target = '_blank';
    });

    // Exibe todas as tarefas por padrão
    aplicarFiltro('todas');

  } catch (err) {
    console.error('Erro na página Pauta:', err);
  }
});
