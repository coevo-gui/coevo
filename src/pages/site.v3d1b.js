export function formSite_wixFormSubmitted(event) {
    console.log("Formulário enviado com sucesso para o Wix. Enviando para o RD...");
    console.log("Objeto 'event' recebido do formulário:", event);

    let formData = {};

    // Iterando sobre event.fields para extrair os dados
    event.fields.forEach(field => {
        // Ajuste aqui conforme a estrutura que você tem. Pode ser necessário usar field.fieldValue
        formData[field.id] = field.fieldValue;
    });

    console.log("Dados capturados:", formData);

    // Extraindo cada valor usando o id do campo correspondente
    // Certifique-se de que estes IDs correspondam aos usados em seu formulário
    const { nome, email, wpp, empresa, cidade, qtdeUhs, tipoNegocio } = formData;

    // Enviando dados
    enviarDadosFormulario(email, nome, empresa, cidade, qtdeUhs, tipoNegocio);
}


    function enviarDadosFormulario(userEmail, userName, companyName, city, numberOfUhs, businessType) {
        const payload = {
            "event_type": "CONVERSION",
            "event_family": "CDP",
            "payload": {
                "email": userEmail,
                "conversion_identifier": 'Form • Sites',
                "name": userName,
                "company": companyName,
                "city": city,
                "cf_uhs": numberOfUhs,
                "cf_tipo_de_negocio": businessType,
                "tags": ['Form LP Sites']
            }
        };

        console.log("Preparando para enviar dados do formulário", payload);

        const xhr = new XMLHttpRequest();
        xhr.open("POST", "https://api.rd.services/platform/conversions?api_key=zjohCRINTlivDaJXEqsKxhrIFMAQrDOkkCXs", true);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.setRequestHeader("Accept", "application/json");
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4 && xhr.status === 200) {
                console.log("Dados enviados com sucesso");
                // Aqui, você pode adicionar alguma lógica pós-envio.
            } else if (xhr.readyState === 4) {
                console.log("Erro ao enviar dados:", xhr.status);
                // Aqui, você pode adicionar tratamento de erro.
            }
        };
        xhr.send(JSON.stringify(payload));
    }
