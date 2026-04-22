// Janela: dashboardWindow
// Recebe { embedUrl, titulo } via openLightbox e carrega o dashboard no #embedDash.

import wixWindow from 'wix-window';

$w.onReady(() => {

  const ctx = wixWindow.lightbox.getContext();

  if (!ctx || !ctx.embedUrl) {
    // Sem URL: fecha a janela
    wixWindow.lightbox.close();
    return;
  }

  // Aplica o título (se houver elemento de texto #dashTitulo na janela)
  try {
    if (ctx.titulo) {
      $w('#dashTitulo').text = ctx.titulo;
    }
  } catch (_) {}

  // Seta a URL no elemento HtmlComponent/Embed
  $w('#embedDash').src = ctx.embedUrl;

  // Botão de fechar a janela (se houver #btnFecharDash)
  try {
    $w('#btnFecharDash').onClick(() => {
      wixWindow.lightbox.close();
    });
  } catch (_) {}

});
