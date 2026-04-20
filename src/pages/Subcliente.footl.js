// Página: Ficha do Subcliente — /cliente/{sigla}
// Tipo: Página Dinâmica conectada à coleção "subclientes"
// Dados populados por conexões nativas de CMS.
// Este código: oculta/colapsa containers vazios, breadcrumb e botões mailto.

import wixData from 'wix-data';

$w.onReady(() => {

  $w('#dynamicDataset').onReady(async () => {
    const item = $w('#dynamicDataset').getCurrentItem();
    if (!item) return;

    // ── 1. BREADCRUMB ───────────────────────────────────────────────────────
    const breadcrumbItems = [];

    breadcrumbItems.push({
      icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>',
      link: '/painel/home',
    });

    if (item.clienteRef) {
      try {
        const pai = await wixData.get('clientes', item.clienteRef);
        if (pai && pai.nome) {
          const slugPai = (pai.sigla || '').toLowerCase();
          breadcrumbItems.push({
            label: pai.nome,
            link: `/painel/${slugPai}`,
          });
        }
      } catch (_) {}
    }

    breadcrumbItems.push({
      label: item.nome || item.sigla || '',
    });

    $w('#breadcrumbs').items = breadcrumbItems;

    // ── 2. OCULTAR E COLAPSAR CONTAINERS COM CAMPOS VAZIOS ──────────────────
    // collapse() remove o espaço ocupado; hide() só torna invisível.
    // Usamos ambos para garantir compatibilidade com todos os tipos de elemento.
    function aplicar(seletor, valor) {
      const vazio =
        valor === null ||
        valor === undefined ||
        valor === '' ||
        (Array.isArray(valor) && valor.length === 0);

      try {
        const el = $w(seletor);
        if (vazio) {
          if (typeof el.collapse === 'function') el.collapse();
          if (typeof el.hide    === 'function') el.hide();
        } else {
          if (typeof el.expand  === 'function') el.expand();
          if (typeof el.show    === 'function') el.show();
        }
      } catch (e) {
        console.warn(`Não foi possível colapsar/exibir ${seletor}:`, e.message);
      }
    }

    aplicar('#boxRespMidia',      item.responsavel);
    aplicar('#boxCluster',        item.cluster);
    aplicar('#boxStatus',         item.status);
    aplicar('#boxTags',           item.tags);
    aplicar('#boxGA4',            item.idGA4);
    aplicar('#boxGAds',           item.idGAds);
    aplicar('#boxMAds',           item.idMAds);
    aplicar('#boxGMB',            item.idGMB);
    aplicar('#boxGG',             item.emailGerenteGeral);
    aplicar('#boxFinanceiro',     item.emailFinanceiro);
    aplicar('#financeiroContato', item.contatoFinanceiro);
    aplicar('#boxMkt',            item.focalMktEmail);
    aplicar('#boxEmailsCC',       item.copiaEmails);
    aplicar('#boxDash1',          item.dashUrl);
    aplicar('#boxDash2',          item.dash2Url);
    aplicar('#boxTasks',          item.clickupUrl);
    aplicar('#boxWiki',           item.wikiUrl);

    // ── 3. BOTÕES MAILTO ────────────────────────────────────────────────────
    if (item.emailGerenteGeral) {
      $w('#btnGG').link = `mailto:${item.emailGerenteGeral}`;
    }
    if (item.emailFinanceiro) {
      $w('#btnFinanceiro').link = `mailto:${item.emailFinanceiro}`;
    }
    if (item.emailFocalMkt) {
      $w('#btnMkt').link = `mailto:${item.emailFocalMkt}`;
    }

  });

});
