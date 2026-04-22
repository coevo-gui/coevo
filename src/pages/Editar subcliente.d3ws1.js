// Página: Editar Subcliente — /cliente/editar/{sigla}
// Tipo: Página Dinâmica conectada à coleção "subclientes"
// O dataset popula os campos de edição nativamente.
// Este código: popula e pré-seleciona o #itemSelector filtrado por acesso do membro.

import { currentMember } from 'wix-members';
import wixData from 'wix-data';
import wixLocation from 'wix-location';

$w.onReady(() => {

  $w('#dynamicDataset').onReady(async () => {

    // ── Sigla atual vinda da URL (/cliente/editar/rdre → "RDRE") ─────────────
    const path = wixLocation.path;
    const siglaAtual = (path[path.length - 1] || '').toUpperCase();

    // ── Membro logado e seu nível de acesso ──────────────────────────────────
    let subclientes = [];

    try {
      const member = await currentMember.getMember();
      if (!member) return;

      const acessoResult = await wixData
        .query('acessoUsuario')
        .eq('memberId', member._id)
        .find();

      if (!acessoResult.items.length) return;

      const acesso = acessoResult.items[0];

      // Busca subclientes conforme nível de acesso
      if (acesso.nivel === 'coevo_admin') {
        subclientes = (
          await wixData
            .query('subclientes')
            .ascending('nome')
            .limit(100)
            .find()
        ).items;

      } else if (acesso.nivel === 'cliente_rede' && acesso.clienteRef) {
        subclientes = (
          await wixData
            .query('subclientes')
            .eq('clienteRef', acesso.clienteRef)
            .ascending('nome')
            .find()
        ).items;

      } else if (acesso.nivel === 'cliente_unidade') {
        const refs = await wixData.queryReferenced(
          'acessoUsuario',
          acesso._id,
          'subclientes'
        );
        // Ordena alfabeticamente (queryReferenced não suporta .ascending)
        subclientes = refs.items.sort((a, b) =>
          (a.nome || '').localeCompare(b.nome || '', 'pt-BR')
        );
      }

    } catch (err) {
      console.error('Erro ao buscar subclientes para o seletor:', err);
      return;
    }

    if (!subclientes.length) return;

    // ── Monta as opções do dropdown ──────────────────────────────────────────
    // label: "SIGLA — Nome do Hotel"
    // value: sigla em minúsculas (coincide com o slug da URL)
    const opcoes = subclientes.map(sc => ({
      label: `${sc.sigla} — ${sc.nome}`,
      value: (sc.sigla || '').toLowerCase(),
    }));

    $w('#itemSelector').options = opcoes;

    // ── Pré-seleciona o item atual ────────────────────────────────────────────
    const valorAtual = siglaAtual.toLowerCase();
    const existeNaLista = opcoes.some(op => op.value === valorAtual);

    if (existeNaLista) {
      $w('#itemSelector').value = valorAtual;
    }

    // ── Navega para o subcliente selecionado ──────────────────────────────────
    $w('#itemSelector').onChange(() => {
      const selecionado = $w('#itemSelector').value;
      if (selecionado && selecionado !== valorAtual) {
        wixLocation.to(`/cliente/editar/${selecionado}`);
      }
    });

  });

});
