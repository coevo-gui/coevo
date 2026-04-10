// Página: Documentos — /portal/documentos
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

    if (!acessoResult.items.length) return;

    const acesso = acessoResult.items[0];
    let docs = [];

    if (acesso.nivel === 'coevo_admin') {
      docs = (
        await wixData.query('documentos').descending('_createdDate').find()
      ).items;
    } else if (acesso.nivel === 'cliente_rede' && acesso.clienteRef) {
      const scs = await wixData
        .query('subclientes')
        .eq('clienteRef', acesso.clienteRef)
        .find();
      const ids = scs.items.map(s => s._id);
      if (ids.length) {
        docs = (
          await wixData
            .query('documentos')
            .hasSome('subclienteRef', ids)
            .descending('_createdDate')
            .find()
        ).items;
      }
    } else if (acesso.nivel === 'cliente_unidade') {
      const refs = await wixData.queryReferenced(
        'acessoUsuario',
        acesso._id,
        'subclientes'
      );
      const ids = refs.items.map(s => s._id);
      if (ids.length) {
        docs = (
          await wixData
            .query('documentos')
            .hasSome('subclienteRef', ids)
            .descending('_createdDate')
            .find()
        ).items;
      }
    }

    $w('#textTotalDocs').text = `${docs.length} documento${docs.length !== 1 ? 's' : ''}`;

    $w('#repeaterDocs').data = docs;
    $w('#repeaterDocs').onItemReady(($item, doc) => {
      $item('#textTitulo').text = doc.titulo || '';
      $item('#textCategoria').text = doc.descricao || '—';
      $item('#textDocData').text = doc._createdDate
        ? new Date(doc._createdDate).toLocaleDateString('pt-BR')
        : '';
      $item('#linkAbrir').link = doc.url || '#';
      $item('#linkAbrir').target = '_blank';
    });
  } catch (err) {
    console.error('Erro na página Documentos:', err);
  }
});