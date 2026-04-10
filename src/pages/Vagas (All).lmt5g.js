$w.onReady(() => {
    // Adiciona um evento ao alterar o estado do switch
    $w("#switch").onChange(() => {
        // Verifica o estado do switch
        if ($w("#switch").checked) {
            // Se o switch está marcado, muda para o estado "list"
            $w("#multiStateBox").changeState("list");
        } else {
            // Se o switch não está marcado, muda para o estado "grid"
            $w("#multiStateBox").changeState("grid");
        }
    });
});
