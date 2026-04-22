// Página: Ficha do Subcliente — /cliente/{sigla}
// Tipo: Página Dinâmica conectada à coleção "subclientes"
// Dados populados por conexões nativas de CMS.

import wixData from 'wix-data';
import wixLocation from 'wix-location';
import wixWindow from 'wix-window';

function aplicarVisibilidade(el, mostrar) {
  try {
    if (mostrar) {
      if (typeof el.expand === 'function') el.expand();
      if (typeof el.show  === 'function') el.show();
    } else {
      if (typeof el.collapse === 'function') el.collapse();
      if (typeof el.hide    === 'function') el.hide();
    }
  } catch (e) {
    console.warn('Erro ao aplicar visibilidade:', e.message);
  }
}

function aplicar(seletor, valor) {
  const vazio =
    valor === null ||
    valor === undefined ||
    valor === '' ||
    (typeof valor === 'string' && valor.trim() === '') ||
    (Array.isArray(valor) && valor.length === 0);
  try {
    aplicarVisibilidade($w(seletor), !vazio);
  } catch (e) {
    console.warn(`Elemento não encontrado: ${seletor}`);
  }
}

$w.onReady(() => {

  const path = wixLocation.path;
  const slugAtual = path && path.length ? path[path.length - 1] : '';
  if (!slugAtual) return;

  // ── Força o dataset a carregar o item correto pela sigla da URL ──────────
  // Necessário porque o dataset dinâmico às vezes não filtra automaticamente.
  $w('#dynamicDataset').setFilter(
    wixData.filter().eq('sigla', slugAtual.toUpperCase())
  );

  try {
    $w('#dynamicDataset').onReady(async () => {
      let item;
      try {
        item = $w('#dynamicDataset').getCurrentItem();
      } catch (e) {
        console.warn('getCurrentItem falhou:', e.message);
        return;
      }
      if (!item) return;

      // ── 1. BREADCRUMB ─────────────────────────────────────────────────────
      const breadcrumbItems = [];
      breadcrumbItems.push({
        icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>',
        link: '/painel/home',
      });
      if (item.clienteRef) {
        try {
          const pai = await wixData.get('clientes', item.clienteRef);
          if (pai && pai.nome) {
            breadcrumbItems.push({
              label: pai.nome,
              link: `/painel/${(pai.sigla || '').toLowerCase()}`,
            });
          }
        } catch (_) {}
      }
      breadcrumbItems.push({ label: item.nome || item.sigla || '' });
      try { $w('#breadcrumbs').items = breadcrumbItems; } catch (_) {}

      // ── 2. OCULTAR / COLAPSAR ─────────────────────────────────────────────
      // Nota: #boxCluster, #boxStatus, #boxTags, #boxEmailsCC são elementos
      // do tipo Grid Cell que não suportam hide/show — controlados pelo editor.
      aplicar('#boxRespMidia',      item.responsavel);
      aplicar('#boxGA4',            item.idGA4);
      aplicar('#boxGAds',           item.idGAds);
      aplicar('#boxMAds',           item.idMAds);
      aplicar('#boxGMB',            item.idGMB);
      aplicar('#boxGG',             item.emailGerenteGeral);
      aplicar('#boxFinanceiro',     item.emailFinanceiro);
      aplicar('#financeiroContato', item.contatoFinanceiro);
      aplicar('#boxMkt',            item.focalMktEmail);
      aplicar('#boxDash1',          item.dashUrl);
      aplicar('#boxDash2',          item.dash2Url);
      aplicar('#boxTasks',          item.clickupUrl);
      aplicar('#boxWiki',           item.wikiUrl);

      // ── 3. BOTÕES MAILTO ──────────────────────────────────────────────────
      if (item.emailGerenteGeral) {
        try { $w('#btnGG').link = `mailto:${item.emailGerenteGeral}`; } catch (_) {}
      }
      if (item.emailFinanceiro) {
        try { $w('#btnFinanceiro').link = `mailto:${item.emailFinanceiro}`; } catch (_) {}
      }
      if (item.focalMktEmail) {
        try { $w('#btnMkt').link = `mailto:${item.focalMktEmail}`; } catch (_) {}
      }

      // ── 4. BOTÃO DE EDIÇÃO ────────────────────────────────────────────────
      try {
        $w('#btnSubclienteEdit').onClick(() => {
          wixLocation.to(`/cliente/editar/${(item.sigla || '').toLowerCase()}`);
        });
      } catch (_) {}

      // ── 5. BOTÕES DE DASHBOARD ────────────────────────────────────────────
      function paraEmbedUrl(url) {
        if (!url) return '';
        return url.replace(/\/u\/\d+\/reporting\//, '/embed/reporting/');
      }
      if (item.dashUrl) {
        try {
          $w('#btnDash1').onClick(() => {
            wixWindow.openLightbox('dashboardWindow', {
              embedUrl:  paraEmbedUrl(item.dashUrl),
              normalUrl: item.dashUrl,
            });
          });
        } catch (_) {}
      }
      if (item.dash2Url) {
        try {
          $w('#btnDash2').onClick(() => {
            wixWindow.openLightbox('dashboardWindow', {
              embedUrl:  paraEmbedUrl(item.dash2Url),
              normalUrl: item.dash2Url,
            });
          });
        } catch (_) {}
      }

    });
  } catch (e) {
    console.warn('Dataset não disponível:', e.message);
  }

});
