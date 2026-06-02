// Página: Início — /portal
// Tipo: Página de membro personalizada (privada)

import { currentMember } from 'wix-members';
import wixData from 'wix-data';
import wixLocation from 'wix-location';

function vis(seletor, mostrar) {
  try {
    const el = $w(seletor);
    if (mostrar) {
      if (typeof el.expand === 'function') el.expand();
      if (typeof el.show  === 'function') el.show();
    } else {
      if (typeof el.collapse === 'function') el.collapse();
      if (typeof el.hide    === 'function') el.hide();
    }
  } catch (e) {
    console.warn(`[vis] ERRO em ${seletor}:`, e.message);
  }
}

function urlLogoValida(url) {
  return typeof url === 'string' &&
    (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('wix:'));
}

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

    if (!acessoResult.items.length) {
      console.warn('Membro sem registro em acessoUsuario:', member._id);
      return;
    }

    const acesso = acessoResult.items[0];
    let siglas    = [];
    let clientePai = null;

    if (acesso.clienteRef) {
      try {
        clientePai = await wixData.get('clientes', acesso.clienteRef);
      } catch (_) {}
    }

    if (acesso.nivel === 'coevo_admin') {
      siglas = null;
      vis('#networkBar', false);

    } else if (acesso.nivel === 'cliente_rede' && acesso.clienteRef) {
      const r = await wixData
        .query('subclientes')
        .eq('clienteRef', acesso.clienteRef)
        .ascending('nome')
        .find();
      siglas = r.items.map(s => s.sigla);

    } else if (acesso.nivel === 'cliente_unidade') {
      const refs = await wixData.queryReferenced(
        'acessoUsuario',
        acesso._id,
        'subclientes'
      );
      let items = refs.items;
      if (!items.length) {
        const r = await wixData
          .query('subclientes')
          .hasSome('acessoUsuario_subclientes', [acesso._id])
          .ascending('nome')
          .find();
        items = r.items;
      }
      siglas = items.map(s => s.sigla);
    }

    // ── Filtra o dataset ─────────────────────────────────────────────────────
    if (siglas !== null) {
      await $w('#dataset1').setFilter(
        siglas.length > 0
          ? wixData.filter().hasSome('sigla', siglas)
          : wixData.filter().eq('sigla', '__nenhum__')
      );
    }

    // ── Métricas (calculadas uma vez no carregamento) ───────────────────────────
    const subclientesFiltrados = siglas === null
      ? (await wixData.query('subclientes').find()).items
      : siglas.length > 0
        ? (await wixData.query('subclientes').hasSome('sigla', siglas).find()).items
        : [];

    const totalUnidades = subclientesFiltrados.length;
    const totalDash     = subclientesFiltrados.filter(s => s.dashUrl).length;
    const todasTags     = [...new Set(subclientesFiltrados.flatMap(s => s.tags || []))];

    function atualizarMetricas(totalDocs) {
      try { $w('#contUnidades').text = String(totalUnidades); } catch (_) {}
      try { $w('#contDocs').text     = String(totalDocs);     } catch (_) {}
      try { $w('#contDashs').text    = String(totalDash);     } catch (_) {}
      try { $w('#contTags').text     = todasTags.length ? todasTags.join(', ') : '—'; } catch (_) {}
    }

    let totalDocsCache = 0;
    contarDocumentos(acesso, subclientesFiltrados).then(n => {
      totalDocsCache = n;
      atualizarMetricas(n);
    });

    // ── Banner da rede ────────────────────────────────────────────────────
    if (clientePai) {
      $w('#networkName').text = clientePai.nome || '';
      $w('#networkDesc').text = [
        `${totalUnidades} unidade${totalUnidades !== 1 ? 's' : ''}`,
        clientePai.cidade && clientePai.estado
          ? `${clientePai.cidade}, ${clientePai.estado}`
          : null,
      ]
        .filter(Boolean)
        .join(' · ');

      if (urlLogoValida(clientePai.logo)) {
        try { $w('#networkLogo').src = clientePai.logo; } catch (_) {}
        vis('#networkLogo', true);
        vis('#networkSigla', false);
      } else {
        try { $w('#networkSigla').text = clientePai.sigla || ''; } catch (_) {}
        vis('#networkSigla', true);
        vis('#networkLogo', false);
      }

      const slugRede = (clientePai.sigla || '').toLowerCase();
      try {
        $w('#networkBar').onClick(() => {
          if (slugRede) wixLocation.to(`/portal/subcliente/${slugRede}`);
        });
      } catch (_) {}

      vis('#networkBar', true);
    }

    // ── Busca — filtra o dataset e reescreve as métricas após o dataset ─────
    // setFilter() retorna Promise — así as métricas são regravadas DEPOIS que
    // o dataset termina de atualizar todos os elementos conectados nativamente,
    // evitando que a contagem dinâmica do dataset sobrescreva os valores fixos.
    const siglasAcesso = siglas;

    function aplicarFiltro(termoBusca) {
      let filtro = wixData.filter();

      if (siglasAcesso !== null) {
        filtro = siglasAcesso.length > 0
          ? filtro.hasSome('sigla', siglasAcesso)
          : filtro.eq('sigla', '__nenhum__');
      }

      const termo = (termoBusca || '').trim();
      if (termo.length > 0) {
        filtro = filtro.contains('nome', termo);
      }

      // .then() garante que atualizarMetricas rode DEPOIS do dataset
      $w('#dataset1').setFilter(filtro).then(() => {
        atualizarMetricas(totalDocsCache);
      });
    }

    $w('#searchCliente').onInput(event => {
      aplicarFiltro(event.target.value);
    });

    // ── Handlers do repeater ──────────────────────────────────────────────
    $w('#repeaterUnidades').onItemReady(($item, itemData) => {
      // Oculta a logo do cliente quando o campo está vazio ou inválido
      // (evita o erro 'src cannot be set to src' da conexão nativa do CMS)
      try {
        const logo = itemData.logoSubcliente;
        if (!urlLogoValida(logo)) {
          $item('#logoCliente').hide();
        }
      } catch (_) {}

      $item('#btnVerFicha').onClick(() => {
        const slug = (itemData.sigla || '').toLowerCase();
        wixLocation.to(`/portal/subcliente/${slug}`);
      });
    });

  } catch (err) {
    console.error('Erro na página Início:', err);
  }
});

async function contarDocumentos(acesso, subclientes) {
  try {
    if (acesso.nivel === 'coevo_admin') {
      return await wixData.query('documentos').count();
    }
    const ids = subclientes.map(s => s._id);
    if (!ids.length) return 0;
    return await wixData
      .query('documentos')
      .hasSome('subclienteRef', ids)
      .count();
  } catch (_) {
    return 0;
  }
}
