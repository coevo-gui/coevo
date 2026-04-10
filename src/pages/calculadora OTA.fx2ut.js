$w.onReady(function () {
    // Garantindo que o box #resultado esteja oculto ao carregar a página
    $w('#resultado').collapse();

    $w('#btCalcular').onClick(() => {
        let valorFaturado = parseFloat($w('#valorFaturado').value);
        let porcentagemOTA = parseFloat($w('#porcentagemOTA').value) / 100;

        if (!isNaN(valorFaturado) && !isNaN(porcentagemOTA)) {
            let mediaPrejuizo = calcularPrejuizo(valorFaturado, porcentagemOTA);
            let resultadoTexto = `${mediaPrejuizo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
            $w('#economizado').text = resultadoTexto;

            expandFormElements();
        } else {
            console.log("Por favor, preencha todos os campos corretamente.");
        }
    });

    // Adicionando observador a #formSuccess
    $w('#formSuccess').onViewportEnter(() => {
        $w('#resultado').expand();
        $w('#resultado').show();
    });
});

function expandFormElements() {
    return Promise.all([
        $w('#formNome').expand(),
        $w('#formEmail').expand(),
        $w('#formWpp').expand(),
        $w('#formNegocio').expand(),
        $w('#formHotel').expand()
    ]);
}



function calcularPrejuizo(valorFaturado, porcentagemOTA) {
    const taxaMediaOTA = 0.25;
    const taxaRetornoDiretoMin = 0.10;
    const taxaRetornoDiretoMax = 0.15;

    const perdaPorOTA = valorFaturado * porcentagemOTA;
    const ganhoPotencialMin = valorFaturado * taxaRetornoDiretoMin;
    const ganhoPotencialMax = valorFaturado * taxaRetornoDiretoMax;

    const prejuizoMin = perdaPorOTA - ganhoPotencialMin;
    const prejuizoMax = perdaPorOTA - ganhoPotencialMax;

    return (prejuizoMin + prejuizoMax) / 2;
}


