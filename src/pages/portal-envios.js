// Página: Disparos de Cobrança — /portal/envios
// Tipo: Página de membro personalizada (privada, somente coevo_admin)
//
// Elementos esperados no canvas:
//   #btnNovoDisparo     — Button
//   #textEmptyState     — Text (hidden por padrão)
//   #repeaterDisparos   — Repeater
//     #textTituloDisparo  — Text
//     #textPlataforma     — Text
//     #textMesRef         — Text
//     #textVencimento     — Text
//     #textTotalHoteis    — Text
//     #textStatusDisparo  — Text
//     #btnAcaoDisparo     — Button

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

    if (!acessoResult.items.length || acessoResult.items[0].nivel !== 'coevo_admin') {
      wixLocation.to('/portal');
      return;
    }

    $w('#btnNovoDisparo').onClick(() => wixLocation.to('/portal/envios/novo'));

    const disparosResult = await wixData
      .query('disparos')
      .descending('_createdDate')
      .find();

    const disparos = disparosResult.items;

    if (!disparos.length) {
      $w('#textEmptyState').show();
      $w('#repeaterDisparos').hide();
      return;
    }

    $w('#textEmptyState').hide();
    $w('#repeaterDisparos').data = disparos;

    $w('#repeaterDisparos').onItemReady(($item, disparo) => {
      $item('#textTituloDisparo').text = disparo.titulo || '—';

      const platLabel = {
        gads: 'Google Ads',
        mads: 'Meta Ads',
        ambas: 'Ambas'
      }[disparo.plataforma] || (disparo.plataforma || '').toUpperCase();
      $item('#textPlataforma').text = platLabel;

      $item('#textMesRef').text = disparo.mesReferencia
        ? new Date(disparo.mesReferencia).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
        : '—';

      $item('#textVencimento').text = disparo.dataVencimento
        ? new Date(disparo.dataVencimento).toLocaleDateString('pt-BR')
        : '—';

      $item('#textTotalHoteis').text = disparo.totalEnviados != null
        ? String(disparo.totalEnviados)
        : '—';

      const statusLabel = {
        rascunho: 'Rascunho',
        enviado: '✓ Enviado',
        parcial: '⚠ Parcial',
        erro: '✗ Erro'
      }[disparo.status] || disparo.status || '—';
      $item('#textStatusDisparo').text = statusLabel;

      $item('#btnAcaoDisparo').label = disparo.status === 'rascunho' ? 'Continuar' : 'Ver detalhes';
      $item('#btnAcaoDisparo').onClick(() =>
        wixLocation.to('/portal/envios/detalhe?id=' + disparo._id)
      );
    });

  } catch (err) {
    console.error('Erro em portal-envios:', err);
  }
});
