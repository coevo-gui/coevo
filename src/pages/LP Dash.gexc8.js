/*
 * Este é um script Velo by Wix.
 *
 * Objetivo: Alternar os estados da Caixa Multiestado (#multiBoxRespostas)
 * ao clicar nos botões #btMultiBox-01, #btMultiBox-02 e #btMultiBox-03.
 */

// A função $w.onReady() garante que o código só
// execute depois que a página estiver totalmente carregada e
// todos os elementos estiverem prontos.
$w.onReady(() => {

    /**
     * Botão 1: Muda para o estado "state1"
     * Adiciona um evento de clique (onClick) ao botão com ID "btMultiBox-01".
     */
    $w("#btMultiBox-01").onClick(() => {
        // Quando clicado, seleciona a caixa multiestado "multiBoxRespostas"
        // e usa a função changeState() para exibir o "state1".
        $w("#multiBoxRespostas").changeState("stAnuncio");
    });

    /**
     * Botão 2: Muda para o estado "state2"
     * Adiciona um evento de clique (onClick) ao botão com ID "btMultiBox-02".
     */
    $w("#btMultiBox-02").onClick(() => {
        // Quando clicado, muda a caixa "multiBoxRespostas" para "state2".
        $w("#multiBoxRespostas").changeState("stKeyword");
    });

    /**
     * Botão 3: Muda para o estado "state3"
     * Adiciona um evento de clique (onClick) ao botão com ID "btMultiBox-03".
     */
    $w("#btMultiBox-03").onClick(() => {
        // Quando clicado, muda a caixa "multiBoxRespostas" para "state3".
        $w("#multiBoxRespostas").changeState("stPagina");
    });

});




$w.onReady(function () {
    // Evento para o botão #btFunil
    $w('#btFunil').onMouseIn(() => {
        $w('#StBxFuncionalidades').changeState('funil');
    });

    // Evento para o botão #btKPI
    $w('#btKPI').onMouseIn(() => {
        $w('#StBxFuncionalidades').changeState('kpihotel');
    });

    // Evento para o botão #btOrigem
    $w('#btOrigem').onMouseIn(() => {
        $w('#StBxFuncionalidades').changeState('origem');
    });
});