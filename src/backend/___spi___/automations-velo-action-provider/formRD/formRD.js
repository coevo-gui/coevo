// Arquivo: public/formsRD.js

/**
 * Função para enviar dados de formulário para uma API externa via XMLHttpRequest.
 * 
 * @param {string} userEmail O e-mail do usuário.
 * @param {string} userName O nome do usuário.
 * @param {string} companyName O nome da empresa.
 * @param {string} city A cidade.
 * @param {number} numberOfUhs A quantidade de UHs.
 * @param {string} businessType O tipo de negócio.
 */

export function enviarDadosFormulario(userEmail, userName, companyName, city, numberOfUhs, businessType) {
    const formData = {
        "event_type": "CONVERSION",
        "event_family": "CDP",
        "conversion_payload": {
            "email": userEmail,
            "conversion_identifier": 'Form • Mkt para Hotéis',
            "name": userName,
            "company": companyName,
            "city": city,
            "cf_uhs": numberOfUhs,
            "cf_tipo_de_negocio": businessType,
            "tags": ['marketing para hotéis']
        }
    };

    console.log("Preparando para enviar dados do formulário", formData);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "https://api.rd.services/platform/conversions?api_key=WKVBglWQAbgnGLSkphGSqqyLXOAGsWzLiJLI", true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.setRequestHeader("Accept", "application/json");
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4 && xhr.status === 200) {
            // Sucesso no envio dos dados
            console.log("Dados enviados com sucesso");
        } else if (xhr.readyState === 4) {
            // Tratamento de erro no envio dos dados
            console.error("Erro ao enviar dados:", xhr.status);
        }
    };
    xhr.send(JSON.stringify(formData));
}

