# Roadmap — Painel Coevo

Itens planejados, ainda não implementados. Cada entrada tem contexto suficiente para detalhar e executar numa sessão futura.

---

## Em andamento / próximos

### Etapa 2 — Painel em Dia (frontend)

Atualmente o Painel em Dia é operado via prompt (Claude compõe e dispara os emails, registra no CMS `versoes`). A Etapa 2 é criar a página de changelog no portal para os clientes verem o histórico de versões.

- **Backend:** popular `painelEmDia.jsw` (hoje stub vazio) com Web Methods de leitura da coleção `versoes`.
- **Frontend:** nova página no portal lendo `versoes` e exibindo o histórico de atualizações.
- **Opcional:** hook de auto-inscrição na lista Brevo `Painel em Dia` (ID `6`) ao registrar novo membro (hoje `events.js` só cria o registro em `acessoUsuario`).

---

## Disparos de Cobrança

### Resumo de IA nos resultados do disparo

Após o envio, o dashboard mostra métricas brutas (entregues, aberturas, cliques, bounces por hotel). A ideia é adicionar um **parágrafo de leitura em linguagem natural gerado pela IA**, com:

- Resumo executivo do envio (ex: "66 hotéis atingidos, taxa de entrega de 94%, 3 aberturas confirmadas em menos de 1 hora").
- **Destaques de atenção:** hotéis com bounce, bloqueados, sem entrega, taxa de abertura fora do padrão.
- Diferenciação de aberturas automáticas (scanners de segurança, Apple MPP) vs. aberturas humanas — atualmente o Brevo não distingue nativamente, mas horário e padrão de IP podem ser indicativos.
- Sugestão de ação quando aplicável (ex: "CYAN teve bounce — verificar email cadastrado").

**Implementação sugerida:**
- Botão "✨ Gerar análise" no dashboard, que chama um Web Method no backend.
- Backend passa o objeto `{ resumo, porHotel }` do `obterMetricasDisparo` para a Anthropic API.
- Resposta exibida num card colapsável acima ou abaixo do funil de engajamento.
- Custo baixo: o payload é pequeno (JSON com ~66 linhas) e a análise é pontual (não conversa).

---

## Portal do Cliente

### Revisão das 16 entradas `a confirmar` na coleção `clientes`

Existem 16 registros na coleção `clientes` com `status = 'a confirmar'`. Precisam ser revisados manualmente: confirmar dados, atualizar status ou remover.

---

## Infraestrutura / qualidade

### Melhorar fallback de subject matching no dashboard de disparos

Atual: quando a tag `cobranca-{disparoId}` não retorna eventos no Brevo (ex: disparo com falha total), o fallback busca eventos por assunto (plataforma + mês de referência). Isso pode trazer eventos de outros disparos do mesmo mês, gerando falsos positivos no dashboard.

**Melhoria:** quando `cmsEnviados === 0`, suprimir o fallback e exibir mensagem clara "Nenhum email foi enviado neste disparo" em vez de tentar buscar métricas. O fallback só faz sentido quando há emails enviados mas a tag falhou por ser um disparo antigo.

### Normalização contínua de emails no cadastro

Foram normalizados 47 subclientes com múltiplos emails separados por espaço (bug que causou falha no CYAN). Considerar uma rotina de validação periódica nos campos `emailFinanceiro`, `emailGerenteGeral`, `focalMktEmail` e `emailsCopia` para detectar novos cadastros fora do padrão (separador vírgula).
