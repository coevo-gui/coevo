// Página: Pauta — /portal/pauta
// Tipo: Página de membro personalizada (privada)
// 3 repeaters separados por seção: atrasadas, próximas, concluídas

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

    // null = coevo_admin: sem filtro de cliente
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
      $w('#containerAtrasadas').hide();
      $w('#containerProximas').hide();
      $w('#containerConcluidas').hide();
      return;
    }

    const tarefas = await getTarefasCliente(siglas);

    $w('#textPautaTotal').text =
      `${tarefas.length} tarefa${tarefas.length !== 1 ? 's' : ''}`;

    const atrasadas  = tarefas.filter(t => t.atrasada);
    const proximas   = tarefas.filter(t => !t.atrasada && !t.concluida);
    const concluidas = tarefas.filter(t => t.concluida);

    // ---------- SEÇÃO: ATRASADAS ----------
    if (atrasadas.length) {
      $w('#containerAtrasadas').show();

      $w('#repeaterAtrasadas').onItemReady(($item, t) => {
        $item('#tagSigla').text = t.sigla || '—';
        $item('#tagSigla').style.color = t.siglaColor;

        $item('#textNomeTarefa').text = t.nome;

        $item('#tagAtraso').text = t.diasAtraso === 1
          ? '1 dia em atraso'
          : `${t.diasAtraso} dias em atraso`;

        $item('#tagStatus').text = `● ${t.status}`;
        $item('#tagStatus').style.color = t.statusColor;

        $item('#textPrazo').text       = t.prazoFormatado;
        $item('#textLista').text       = t.lista;
        $item('#textResponsavel').text = t.responsavel;

        if (t.descricao) {
          $item('#textDescricao').text = t.descricao;
          $item('#textDescricao').show();
        } else {
          $item('#textDescricao').hide();
        }

        $item('#btnAbrirTarefa').link   = t.url;
        $item('#btnAbrirTarefa').target = '_blank';
      });

      $w('#repeaterAtrasadas').data = atrasadas;
    } else {
      $w('#containerAtrasadas').hide();
    }

    // ---------- SEÇÃO: PRÓXIMAS ----------
    if (proximas.length) {
      $w('#containerProximas').show();

      $w('#repeaterProximas').onItemReady(($item, t) => {
        $item('#tagSigla2').text = t.sigla || '—';
        $item('#tagSigla2').style.color = t.siglaColor;

        $item('#textNomeTarefa2').text = t.nome;

        $item('#textDiasFaltam').text = t.diasFaltam === 0 ? 'vence hoje'
          : t.diasFaltam === 1 ? 'em 1 dia'
          : `em ${t.diasFaltam} dias`;

        $item('#tagStatus2').text = `● ${t.status}`;
        $item('#tagStatus2').style.color = t.statusColor;

        $item('#textPrazo2').text       = t.prazoFormatado;
        $item('#textLista2').text       = t.lista;
        $item('#textResponsavel2').text = t.responsavel;

        if (t.descricao) {
          $item('#textDescricao2').text = t.descricao;
          $item('#textDescricao2').show();
        } else {
          $item('#textDescricao2').hide();
        }

        $item('#btnAbrirTarefa2').link   = t.url;
        $item('#btnAbrirTarefa2').target = '_blank';
      });

      $w('#repeaterProximas').data = proximas;
    } else {
      $w('#containerProximas').hide();
    }

    // ---------- SEÇÃO: CONCLUÍDAS ----------
    if (concluidas.length) {
      $w('#containerConcluidas').show();

      $w('#repeaterConcluidas').onItemReady(($item, t) => {
        $item('#tagSigla3').text = t.sigla || '—';
        $item('#tagSigla3').style.color = t.siglaColor;

        $item('#textNomeTarefa3').text = t.nome;

        $item('#tagStatus3').text = `● ${t.status}`;
        $item('#tagStatus3').style.color = t.statusColor;

        $item('#textPrazo3').text       = t.prazoFormatado;
        $item('#textLista3').text       = t.lista;
        $item('#textResponsavel3').text = t.responsavel;

        if (t.descricao) {
          $item('#textDescricao3').text = t.descricao;
          $item('#textDescricao3').show();
        } else {
          $item('#textDescricao3').hide();
        }

        $item('#btnAbrirTarefa3').link   = t.url;
        $item('#btnAbrirTarefa3').target = '_blank';
      });

      $w('#repeaterConcluidas').data = concluidas;
    } else {
      $w('#containerConcluidas').hide();
    }

  } catch (err) {
    console.error('Erro na página Pauta:', err);
  }
});
