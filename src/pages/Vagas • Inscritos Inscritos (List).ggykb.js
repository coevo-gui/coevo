import wixData from 'wix-data';

$w.onReady(function () {
    const etapas = [
        { titulo: '#etapaFunil1', repetidor: '#repEtapa1', pilha: '#funil1', id: '9a6055fa-0d3a-4ff8-a906-c00875ea02d4' },
        { titulo: '#etapaFunil2', repetidor: '#repEtapa2', pilha: '#funil2', id: '682f0c27-9105-4a89-adfd-1978767296cf' },
        { titulo: '#etapaFunil3', repetidor: '#repEtapa3', pilha: '#funil3', id: '4c030f3e-afb6-48aa-ba93-aa2af039da42' },
        { titulo: '#etapaFunil4', repetidor: '#repEtapa4', pilha: '#funil4', id: '75c57d2a-89de-499c-a62e-84528f51da93' },
        { titulo: '#etapaFunil5', repetidor: '#repEtapa5', pilha: '#funil5', id: 'a93910e6-b155-4dcc-b680-9c82b4a979dc' },
        { titulo: '#etapaFunil6', repetidor: '#repEtapa6', pilha: '#funil6', id: '3fc52d31-7a99-44ed-b3e8-4e2d10629174' },
        { titulo: '#etapaFunil7', repetidor: '#repEtapa7', pilha: '#funil7', id: '00090061-7d2d-4e65-8b46-b16ab01b5379' },
        { titulo: '#etapaFunil8', repetidor: '#repEtapa8', pilha: '#funil8', id: '3101af61-6e31-472e-b65a-72dea4255170' },
        { titulo: '#etapaFunil9', repetidor: '#repEtapa9', pilha: '#funil9', id: '09d7be82-1f7c-4937-9e35-366b8de58a5d' },
        { titulo: '#etapaFunil10', repetidor: '#repEtapa10', pilha: '#funil10', id: '505c75fe-cdc2-41df-8ffa-1d2afca32f4f' }
    ];

    etapas.forEach(etapa => {
        let titulo = $w(etapa.titulo).text;
        $w(etapa.repetidor).data = []; // Inicializa o repetidor com uma lista vazia

        wixData.query('VagasInscritos')
            .eq('etapaNoFunil', etapa.id)
            .find()
            .then((results) => {
                if (results.items.length > 0) {
                    $w(etapa.repetidor).data = results.items; // Atribui os itens ao repetidor
                    $w(etapa.pilha).expand(); // Expande a pilha caso esteja colapsada
                } else {
                    $w(etapa.pilha).collapse(); // Colapsa a pilha se não houver itens
                }
            })
            .catch((err) => {
                console.log(err);
            });
    });
});
