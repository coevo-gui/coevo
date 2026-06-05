// Página: Pauta — /portal/pauta
// Tipo: Página de membro personalizada (privada)
// Exibe tarefas do ClickUp (pasta coevo.tudo) filtradas por acesso e visibilidade

import { currentMember } from 'wix-members';
import wixData from 'wix-data';
import wixLocation from 'wix-location';
import { getTarefasCliente } from 'backend/clickup.jsw';

$w.onReady(async () => {
  try {
    const member = await currentMember.getMember();
    if (!member) {
      wixLocation.to('/login');
      return;
    }

    const acessoResult = await wixData
      .query('acessoUsuario')
      .eq('memberId', member._id)
      .find();

    if (!acessoResult.items.length) return;

    const acesso = acessoResult.items[0];

    // null = coevo_admin: sem filtro de cliente (vê tudo)
    let siglas = null;

    if (acesso.nivel === 'cliente_rede' && acesso.clienteRef) {
      const r = await wixData
        .query('subclientes')
        .eq('clienteRef', acesso.clienteRef)
        .find();
      siglas = r.items.map(s => s.sigla).filter(Boolean);
    } else if (acesso.nivel === 'cliente_unidade') {
      const refs = await wixData.queryReferenced(
        'acessoUsuario',
        acesso._id,
        'subclientes'
      );
      siglas = refs.items.map(s => s.sigla).filter(Boolean);
    }

    if (siglas !== null && siglas.length === 0) {
      $w('#textPautaTotal').text = '0 tarefas';
      $w('#repeaterPauta').data = [];
      return;
    }

    const tarefas = await getTarefasCliente(siglas);

    $w('#textPautaTotal').text =
      `${tarefas.length} tarefa${tarefas.length !== 1 ? 's' : ''}`;

    $w('#repeaterPauta').onItemReady(($item, t) => {
      // Sigla (background fixo no editor; cor do texto via style.color)
      $item('#tagSigla').text = t.sigla || '—';
      $item('#tagSigla').style.color = t.siglaColor;

      $item('#textNomeTarefa').text = t.nome;

      // Status com cor dinâmica
      $item('#tagStatus').text = `● ${t.status}`;
      $item('#tagStatus').style.color = t.statusColor;

      $item('#textPrazo').text       = t.prazoFormatado;
      $item('#textLista').text       = t.lista;
      $item('#textResponsavel').text = t.responsavel;

      // Badges temporais (mutuamente exclusivos)
      if (t.atrasada) {
        $item('#tagAtraso').text =
          t.diasAtraso === 1
            ? '1 dia em atraso'
            : `${t.diasAtraso} dias em atraso`;
        $item('#tagAtraso').show();
        $item('#textDiasFaltam').hide();
      } else if (!t.concluida) {
        $item('#textDiasFaltam').text =
          t.diasFaltam === 0 ? 'vence hoje'       :
          t.diasFaltam === 1 ? 'em 1 dia'          :
          `em ${t.diasFaltam} dias`;
        $item('#textDiasFaltam').show();
        $item('#tagAtraso').hide();
      } else {
        $item('#tagAtraso').hide();
        $item('#textDiasFaltam').hide();
      }

      // Descrição: oculta quando vazia
      if (t.descricao) {
        $item('#textDescricao').text = t.descricao;
        $item('#textDescricao').show();
      } else {
        $item('#textDescricao').hide();
      }

      $item('#btnAbrirTarefa').link   = t.url;
      $item('#btnAbrirTarefa').target = '_blank';
    });

    $w('#repeaterPauta').data = tarefas;

  } catch (err) {
    console.error('Erro na página Pauta:', err);
  }
});
