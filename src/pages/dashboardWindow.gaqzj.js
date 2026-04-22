// Janela: dashboardWindow
// Recebe { embedUrl, normalUrl } via openLightbox.

import wixWindow from 'wix-window';
import wixLocation from 'wix-location';

$w.onReady(() => {

  const ctx = wixWindow.lightbox.getContext();

  if (!ctx || !ctx.embedUrl) {
    wixWindow.lightbox.close();
    return;
  }

  // Carrega o dashboard no embed
  $w('#embedDash').src = ctx.embedUrl;

  // Botão para abrir no Looker Studio diretamente (URL original, sem /embed/)
  if (ctx.normalUrl) {
    $w('#btnAbrirDash').onClick(() => {
      wixLocation.to(ctx.normalUrl);
    });
  }

});
