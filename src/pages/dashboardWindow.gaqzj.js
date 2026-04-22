// Janela: dashboardWindow
// Recebe { embedUrl, normalUrl } via openLightbox.

import wixWindow from 'wix-window';

$w.onReady(() => {

  const ctx = wixWindow.lightbox.getContext();

  if (!ctx || !ctx.embedUrl) {
    wixWindow.lightbox.close();
    return;
  }

  console.log('[dashboardWindow] embedUrl recebida:', ctx.embedUrl);
  console.log('[dashboardWindow] normalUrl recebida:', ctx.normalUrl);

  $w('#embedDash').src = ctx.embedUrl;

  console.log('[dashboardWindow] src aplicado ao #embedDash:', $w('#embedDash').src);

  if (ctx.normalUrl) {
    $w('#btnAbrirDash').link   = ctx.normalUrl;
    $w('#btnAbrirDash').target = '_blank';
  }

});
