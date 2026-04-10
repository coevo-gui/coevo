import wixData from 'wix-data';
import { contacts } from 'wix-crm';
import wixWindowFrontend from 'wix-window-frontend';

$w.onReady(function () {
    console.log("Página carregada e pronta");

    $w('#vagasEnviar').onClick(async () => {
        console.log("Botão enviar clicado");
        $w('#vagasEnviar').disable();
        $w('#vagasMensagem').text = "Processando, aguarde...";
        $w('#vagasMensagem').show();

        const vagaId = $w("#vagasItem").getCurrentItem()._id;
        console.log("ID da vaga:", vagaId);

        // --- INÍCIO DO UPLOAD DE ARQUIVOS ---
        let cvUrl = "";
        let portfolioFileUrl = "";

        try {
            console.log("Iniciando upload do currículo");
            // Upload do Currículo (Obrigatório)
            const cvUpload = await $w("#vagasDocto").uploadFiles();
            if (cvUpload.length > 0) {
                cvUrl = cvUpload[0].fileUrl;
            } else {
                throw new Error("O anexo do currículo é obrigatório.");
            }

            // Upload do Portfólio em Arquivo (Opcional)
            // Lembre-se de criar o botão de upload no Wix com o ID #vagasPortfolioArquivo
            if ($w("#vagasPortfolioArquivo").value.length > 0) {
                console.log("Iniciando upload do portfólio");
                const portUpload = await $w("#vagasPortfolioArquivo").uploadFiles();
                if (portUpload.length > 0) {
                    portfolioFileUrl = portUpload[0].fileUrl;
                }
            }
        } catch (uploadError) {
            console.error("Erro no upload:", uploadError);
            $w('#vagasMensagem').text = `Erro no upload: ${uploadError.message}`;
            $w('#vagasEnviar').enable();
            return;
        }
        // --- FIM DO UPLOAD DE ARQUIVOS ---

        // Construção do objeto com os campos
        const toInsert = {
            nome:               $w('#vagasNome').value,
            sobrenome:          $w('#vagasSobrenome').value,
            email:              $w('#vagasEmail').value,
            telefone:           $w('#vagasWpp').value,
            descricao:          $w('#vagasDescricao').value, // Aqui o candidato pode colocar o link do Behance/LinkedIn
            cidadeResidencia:   $w('#vagasResidencia').value,
            anexos:             cvUrl,
            portfolio:          portfolioFileUrl,            // Arquivo de portfólio (se enviado)
            areasDeInteresse:   $w('#vagasSetores').value,
            pretensaoSalarial:  $w('#vagasPretensao').value,
            formatoTrabalho:    $w('#vagasFormatoTrabalho').value,
            vagaInscrita:       vagaId
        };

        console.log("Dados a inserir/atualizar:", toInsert);

        // Inserir ou atualizar na coleção
        try {
            console.log("Verificando existência de email na coleção");
            const existing = await wixData.query('VagasInscritos')
                .eq("email", toInsert.email)
                .find();

            if (existing.items.length > 0) {
                console.log("Registro existente encontrado, atualizando...");
                const item = existing.items[0];
                await wixData.update('VagasInscritos', { ...item, ...toInsert });
                console.log("Atualização concluída");
            } else {
                console.log("Nenhum registro encontrado, inserindo novo...");
                await wixData.insert('VagasInscritos', toInsert);
                console.log("Inserção concluída");
            }

            $w('#vagasMensagem').text = "Dados enviados com sucesso!";
        } catch (dbError) {
            console.error("Erro ao processar dados:", dbError);
            $w('#vagasMensagem').text = `Erro ao processar dados: ${dbError.message}`;
            $w('#vagasEnviar').enable();
            return;
        }

        // Criação/atualização de contato no CRM
        try {
            await criarContato();
            console.log("Contato CRM criado/atualizado com sucesso");
            $w('#vagasMensagem').text = "Cadastro concluído com sucesso!";
        } catch (contactError) {
            console.error("Erro no CRM:", contactError);
            $w('#vagasMensagem').text = `Erro na criação do contato: ${contactError.message}`;
            $w('#vagasEnviar').enable();
            return;
        }

        // Evento de tracking
        wixWindowFrontend.trackEvent('Lead', { origin: "Vagas" });
        $w('#vagasEnviar').enable();
    });

    // Formatação do telefone
    $w('#vagasWpp').onInput(() => {
        const raw = $w('#vagasWpp').value;
        $w('#vagasWpp').value = formatPhoneNumber(raw);
    });
});

// Função de formatação de telefone
function formatPhoneNumber(value) {
    value = value.replace(/\D/g, "");
    if (value.length > 2 && value.length <= 7) {
        return `(${value.slice(0, 2)}) ${value.slice(2)}`;
    } else if (value.length > 7) {
        return `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7, 11)}`;
    }
    return value;
}

// Função para criar ou anexar contato no CRM
async function criarContato() {
    const contato = {
        name: {
            first: $w('#vagasNome').value,
            last:  $w('#vagasSobrenome').value
        },
        emails:    [{ email: $w('#vagasEmail').value,     tag: 'HOME' }],
        phones:    [{ phone: $w('#vagasWpp').value,       tag: 'MOBILE' }],
        addresses: [{ address: { city: $w('#vagasResidencia').value }, tag: 'HOME' }],
        labelKeys: ["custom.vagas"]
    };

    try {
        const result = await contacts.appendOrCreateContact(contato);
        return result.contactId;
    } catch (err) {
        console.error("Erro ao criar/anexar contato:", err);
        throw err;
    }
}