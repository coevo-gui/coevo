// INÍCIO • CÓDIGO PARA CONTADORES

function animateCounter(elementId, endValue, duration = 4000) {
    const startValue = 0;
    let startTime = null;

    function step(timestamp) {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);

        let currentValue;
        if (elementId === '#bigNumberROAS') {
            currentValue = (progress * endValue).toFixed(2); // Para o ROAS, mantemos duas casas decimais
        } else {
            currentValue = Math.floor(progress * endValue).toLocaleString();
        }

        $w(elementId).text = currentValue;

        if (progress < 1) {
            requestAnimationFrame(step);
        }
    }

    requestAnimationFrame(step);
}

$w.onReady(function () {
    animateCounter('#bigNumberVerba', 1400000, 4000);
    animateCounter('#bigNumberReceita', 34000000, 4000);
    animateCounter('#bigNumberROAS', 10.76, 4000);
    animateCounter('#bigNumberHoteis', 60, 4000);
});

// FINAL • CÓDIGO PARA CONTADORES



// Considerando que o MultiStateBox possui o ID "#jornadaClienteBox"
// Os botões têm os IDs: "#slide01", "#slide02", "#slide03", "#slide04", "#slide05"
// E os botões adicionais têm os IDs: "#btSlide01", "#btSlide02", "#btSlide03", "#btSlide04", "#btSlide05"
// Os estados têm os IDs: "slideBox01", "slideBox02", "slideBox03", "slideBox04", "slideBox05"
// Botões de navegação têm os IDs: "#back" e "#next"

$w.onReady(function () {
    // Definindo uma função auxiliar para alternar estados
    function changeState(buttonId, stateId) {
        $w(buttonId).onClick(() => {
            $w(buttonId).disable(); // Desabilita o botão enquanto a transição está acontecendo
            $w("#jornadaClienteBox").changeState(stateId)
                .then(() => {
                    console.log(`Mudou para o estado: ${stateId}`);
                    $w(buttonId).enable(); // Reabilita o botão após a transição
                })
                .catch((err) => {
                    console.error("Erro ao mudar de estado: ", err);
                    $w(buttonId).enable(); // Garante que o botão seja reabilitado em caso de erro
                });
        });
    }

    // Associando cada botão ao respectivo estado
    changeState("#slide01", "slideBox01");
    changeState("#slide02", "slideBox02");
    changeState("#slide03", "slideBox03");
    changeState("#slide04", "slideBox04");
    changeState("#slide05", "slideBox05");
    changeState("#btSlide02", "slideBox02");
    changeState("#btSlide03", "slideBox03");
    changeState("#btSlide04", "slideBox04");
    changeState("#btSlide05", "slideBox05");

    // Funções para os botões de navegação "#back" e "#next"
    $w('#btBackStep').onClick(() => {
        const currentIndex = getCurrentStateIndex();
        if (currentIndex > 1) {
            const previousState = `slideBox0${currentIndex - 1}`;
            $w("#jornadaClienteBox").changeState(previousState)
                .then(() => {
                    console.log(`Mudou para o estado: ${previousState}`);
                })
                .catch((err) => {
                    console.error("Erro ao mudar de estado: ", err);
                });
        }
    });

    $w("#btNextStep").onClick(() => {
        const currentIndex = getCurrentStateIndex();
        if (currentIndex < 5) {
            const nextState = `slideBox0${currentIndex + 1}`;
            $w("#jornadaClienteBox").changeState(nextState)
                .then(() => {
                    console.log(`Mudou para o estado: ${nextState}`);
                })
                .catch((err) => {
                    console.error("Erro ao mudar de estado: ", err);
                });
        }
    });

    // Função para obter o índice do estado atual
    function getCurrentStateIndex() {
        const currentState = $w("#jornadaClienteBox").currentState.id;
        return parseInt(currentState.replace("slideBox", ""), 10);
    }
});
