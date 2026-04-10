$w.onReady(() => {
    $w("#case").onReady(() => {
        let itemObj = $w("#case").getCurrentItem();

        if (itemObj && itemObj.exibirDepoimento) {
            $w('#depoimentoSection').show();
            $w('#depoimentoSection').expand();
        } else {
            $w('#depoimentoSection').hide();
            $w('#depoimentoSection').collapse();
        }
    });
});
