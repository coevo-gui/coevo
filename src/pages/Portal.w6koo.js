// Página: Início — /portal
// Tipo: Página de membro personalizada (privada)

import { currentMember } from 'wix-members';
import wixData from 'wix-data';
import wixLocation from 'wix-location';

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
    let siglas    = []; // siglas acessíveis — usadas para filtrar #dataset1
    let clientePai = null;

    // ── Busca cliente-pai para qualquer nível que tenha clienteRef ────────
    if (acesso.clienteRef) {
      try {
        clientePai = await wixData.get('clientes', acesso.clienteRef);
      } catch (_) {}
    }

    // ── Determina as siglas acessíveis conforme nível ─────────────────────
    if (acesso.nivel === 'coevo_admin') {
      // Admin vê tudo — sem filtro no dataset
      siglas = null;
      try { $w('#networkBar').hide(); } catch (_) {}

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

      // Fallback via campo inverso se queryReferenced retornar vazio
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

    // ── Filtra o dataset conectado ao repeater ────────────────────────────
    // Para admin (siglas === null), não aplica filtro — mostra tudo.
    // Para os demais, restringe às siglas permitidas.
    if (siglas !== null) {
      if (siglas.length > 0) {
        await $w('#dataset1').setFilter(
          wixData.filter().hasSome('sigla', siglas)
        );
      } else {
        // Sem acesso a nenhum subclient — filtra para resultado vazio
        await $w('#dataset1').setFilter(
          wixData.filter().eq('sigla', '__nenhum__')
        );
      }
    }

    // ── Métricas ──────────────────────────────────────────────────────────
    // Busca os itens filtrados para calcular as métricas
    const subclientesFiltrados = siglas === null
      ? (await wixData.query('subclientes').find()).items
      : siglas.length > 0
        ? (await wixData.query('subclientes').hasSome('sigla', siglas).find()).items
        : [];

    try { $w('#contUnidades').text = String(subclientesFiltrados.length); } catch (_) {}

    contarDocumentos(acesso, subclientesFiltrados).then(totalDocs => {
      try { $w('#contDocs').text = String(totalDocs); } catch (_) {}
    });

    const totalDash = subclientesFiltrados.filter(s => s.dashUrl).length;
    try { $w('#contDashs').text = String(totalDash); } catch (_) {}

    const todasTags = [...new Set(subclientesFiltrados.flatMap(s => s.tags || []))];
    try { $w('#contTags').text = todasTags.length ? todasTags.join(', ') : '—'; } catch (_) {}

    // ── Banner da rede ────────────────────────────────────────────────────
    if (clientePai) {
      $w('#networkName').text = clientePai.nome || '';
      $w('#networkDesc').text = [
        `${subclientesFiltrados.length} unidade${subclientesFiltrados.length !== 1 ? 's' : ''}`,
        clientePai.cidade && clientePai.estado
          ? `${clientePai.cidade}, ${clientePai.estado}`
          : null,
      ]
        .filter(Boolean)
        .join(' · ');

      if (clientePai.logo) {
        $w('#networkLogo').src = clientePai.logo;
        $w('#networkLogo').show();
        $w('#networkSigla').hide();
      } else {
        $w('#networkSigla').text = clientePai.sigla || '';
        $w('#networkSigla').show();
        $w('#networkLogo').hide();
      }

      const slugRede = (clientePai.sigla || '').toLowerCase();
      $w('#networkBar').onClick(() => {
        if (slugRede) wixLocation.to(`/portal/subcliente/${slugRede}`);
      });

      try { $w('#networkBar').show(); } catch (_) {}
    }

    // ── Handlers do repeater (onClick do botão ver ficha) ─────────────────
    // O dataset popula os campos — só precisamos do onClick
    $w('#repeaterUnidades').onItemReady(($item, itemData) => {
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
