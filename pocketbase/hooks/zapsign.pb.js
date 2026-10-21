/// <reference path="../pb_data/types.d.ts" />

/**
 * Nexo CRM - Módulo de Assinatura Digital via ZapSign
 *
 * 1. POST /propostas/enviar-assinatura (Autenticado)
 *    - Recebe { id: proposalId }
 *    - Busca dados da proposta e do cliente no PocketBase
 *    - Faz requisição para a API da ZapSign (POST https://api.zapsign.com.br/api/v1/docs/)
 *    - Armazena zapsign_doc_token, link_assinatura e atualiza status para 'enviada'
 *    - Retorna { success: true, doc_token, signature_url }
 *
 * 2. POST /webhooks/zapsign/doc_signed (Público)
 *    - Webhook chamado pela ZapSign no evento doc_signed
 *    - Identifica a proposta pelo zapsign_doc_token
 *    - Atualiza status = 'assinada' e assinado_em = ISO date
 *    - Validação opcional de query param ?secret=... configurável via ZAPSIGN_WEBHOOK_SECRET
 */

routerAdd(
  'POST',
  '/propostas/enviar-assinatura',
  (c) => {
    // Verifica se o usuário está autenticado
    const authRecord = c.auth
    if (!authRecord) {
      return c.json(401, {
        message: 'Não autorizado. Faça login para enviar propostas para assinatura.',
      })
    }

    // Lê o token da ZapSign do secret/env
    const zapsignToken = $os.getenv('ZAPSIGN_API_TOKEN') || $os.getenv('ZAPSIGN_TOKEN')
    if (!zapsignToken || zapsignToken.trim() === '') {
      return c.json(400, {
        message:
          'Chave da ZapSign não configurada. Configure o secret ZAPSIGN_API_TOKEN no painel da Skip Cloud para habilitar a assinatura.',
      })
    }

    let body = {}
    try {
      const rawBody = c.requestInfo().body
      body = rawBody || {}
    } catch (err) {
      return c.json(400, {
        message: 'Corpo da requisição inválido. Envie JSON com o id da proposta.',
      })
    }

    const proposalId = body.id || body.proposal_id || body.proposalId
    if (!proposalId) {
      return c.json(400, {
        message: 'ID da proposta não informado.',
      })
    }

    // Busca a proposta no banco
    let proposalRecord
    try {
      proposalRecord = $app.findRecordById('propostas', proposalId)
    } catch (err) {
      return c.json(404, {
        message: 'Proposta comercial não encontrada no sistema.',
      })
    }

    // Busca o cliente vinculado
    const clienteId = proposalRecord.getString('cliente_id')
    let clienteRecord = null
    if (clienteId) {
      try {
        clienteRecord = $app.findRecordById('clientes', clienteId)
      } catch (_) {
        // cliente pode não ser encontrado se deletado
      }
    }

    const clienteNome = clienteRecord ? clienteRecord.getString('nome') : 'Cliente'
    const clienteEmail = clienteRecord ? clienteRecord.getString('email') : ''
    const clienteDoc = clienteRecord ? clienteRecord.getString('documento') : ''
    const clienteTel = clienteRecord ? clienteRecord.getString('telefone') : ''

    const proposalCode = proposalRecord.getString('codigo') || `PROP-${proposalRecord.id}`
    const proposalTitle = proposalRecord.getString('titulo') || 'Proposta Comercial'
    const proposalDesc = proposalRecord.getString('descricao') || ''
    const proposalValor = proposalRecord.getFloat('valor') || 0
    const proposalValidade = proposalRecord.getString('validade') || ''

    // Lê itens da proposta
    let itens = []
    try {
      const itensStr = proposalRecord.getString('itens')
      if (itensStr && itensStr.trim() !== '') {
        itens = JSON.parse(itensStr)
      }
    } catch (_) {
      itens = []
    }

    // Funções auxiliares seguras para Goja (o engine JS do PocketBase não suporta toLocaleString com locale/opções)
    const formatMoney = (val) => {
      const num = Number(val || 0)
      const fixed = num.toFixed(2)
      const parts = fixed.split('.')
      const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.')
      return `${intPart},${parts[1]}`
    }

    const formatDateBR = (d) => {
      const date = d instanceof Date ? d : new Date()
      const day = String(date.getDate()).padStart(2, '0')
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const year = date.getFullYear()
      return `${day}/${month}/${year}`
    }

    // Validação de dados do signatário (exigência da ZapSign: nome e e-mail válidos)
    if (!clienteEmail || clienteEmail.trim() === '') {
      return c.json(400, {
        message: `O cliente "${clienteNome}" não possui e-mail cadastrado. Para enviar para assinatura via ZapSign, preencha o e-mail no cadastro do cliente na aba Clientes.`,
        code: 'MISSING_CLIENT_EMAIL',
      })
    }

    // Monta texto em Markdown profissional para o documento na ZapSign
    let itensMarkdown = ''
    if (Array.isArray(itens) && itens.length > 0) {
      itensMarkdown = itens
        .map((it, idx) => {
          const desc = it.description || `Item ${idx + 1}`
          const qtd = it.quantity || 1
          const unit = formatMoney(it.unitPrice || 0)
          const tot = formatMoney(it.total || 0)
          return `| ${idx + 1} | ${desc} | ${qtd} | R$ ${unit} | R$ ${tot} |`
        })
        .join('\n')
    } else {
      const valorStr = formatMoney(proposalValor)
      itensMarkdown = `| 1 | ${proposalTitle} | 1 | R$ ${valorStr} | R$ ${valorStr} |`
    }

    const valorFormatado = `R$ ${formatMoney(proposalValor)}`

    const markdownDocument = `# PROPOSTA COMERCIAL DE PRESTAÇÃO DE SERVIÇOS
**Referência:** ${proposalCode}  
**Data:** ${formatDateBR(new Date())}  
${proposalValidade ? `**Validade:** ${proposalValidade}\n` : ''}

---

## 1. IDENTIFICAÇÃO DAS PARTES

**CONTRATANTE:**
- **Nome/Razão Social:** ${clienteNome}
${clienteDoc ? `- **CPF/CNPJ:** ${clienteDoc}\n` : ''}${clienteEmail ? `- **E-mail:** ${clienteEmail}\n` : ''}${clienteTel ? `- **Telefone:** ${clienteTel}\n` : ''}

**CONTRATADA:**
- **Razão Social:** Nexo Soluções Digitais e Consultoria Ltda
- **CNPJ:** 45.182.903/0001-84
- **E-mail:** comercial@nexocrm.com.br

---

## 2. ESCOPO E OBJETO DA PROPOSTA
**Título:** ${proposalTitle}

${proposalDesc ? `### Detalhamento do Escopo\n${proposalDesc}\n` : ''}

### Tabela de Serviços e Entregáveis
| # | Descrição do Serviço / Entregável | Qtd | Valor Unitário | Subtotal |
|---|---|---|---|---|
${itensMarkdown}

---

## 3. VALOR TOTAL E CONDIÇÕES
- **Valor Global da Proposta:** **${valorFormatado}**
- **Prazo de Execução:** Conforme cronograma acordado na abertura da Ordem de Serviço.

---

## 4. ACEITE E ASSINATURA ELETRÔNICA
As partes declaram ciência e pleno acordo com as especificações, valores e condições dispostas neste instrumento comercial, firmando o presente por assinatura eletrônica com plena validade jurídica nos termos da MP 2.200-2/2001 e Lei 14.063/2020.
`

    // Prepara signatários
    const cleanEmail = clienteEmail.trim()
    const signer = {
      name: clienteNome || 'Signatário',
      email: cleanEmail,
      lock_email: false,
      lock_name: false,
    }

    if (clienteTel && clienteTel.trim() !== '') {
      const cleanPhone = clienteTel.replace(/\D/g, '')
      if (cleanPhone.length >= 10) {
        signer.phone_country = '55'
        signer.phone_number = cleanPhone
      }
    }

    const payloadZapSign = {
      name: `${proposalCode} - ${proposalTitle}`,
      markdown_text: markdownDocument,
      lang: 'pt-br',
      signers: [signer],
      external_id: proposalRecord.id,
    }

    // Faz a chamada à API da ZapSign
    let zapsignResponse
    try {
      zapsignResponse = $http.send({
        method: 'POST',
        url: 'https://api.zapsign.com.br/api/v1/docs/',
        headers: {
          Authorization: `Bearer ${zapsignToken.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payloadZapSign),
        timeout: 30, // segundos
      })
    } catch (err) {
      console.error('Erro de conexão ao chamar ZapSign:', err)
      return c.json(502, {
        message:
          'Não foi possível conectar aos servidores da ZapSign. Verifique a conexão e tente novamente.',
      })
    }

    if (!zapsignResponse || zapsignResponse.statusCode < 200 || zapsignResponse.statusCode >= 300) {
      let detalhe = ''
      let parsedError = null
      try {
        if (zapsignResponse && zapsignResponse.json) {
          parsedError = zapsignResponse.json
          detalhe = JSON.stringify(zapsignResponse.json)
        } else if (zapsignResponse && zapsignResponse.raw) {
          detalhe = zapsignResponse.raw
          try {
            parsedError = JSON.parse(zapsignResponse.raw)
          } catch (_) {}
        }
      } catch (_) {}

      console.error(`ZapSign API retornou erro HTTP ${zapsignResponse?.statusCode}: ${detalhe}`)

      // Mensagens de erro amigáveis e detalhadas
      if (zapsignResponse?.statusCode === 401 || zapsignResponse?.statusCode === 403) {
        return c.json(400, {
          message:
            'Token da ZapSign inválido ou não autorizado (HTTP ' +
            zapsignResponse.statusCode +
            '). Verifique a credencial ZAPSIGN_API_TOKEN cadastrada no painel da Skip Cloud.',
          details: detalhe,
        })
      }

      // Extrai mensagem específica de erro da ZapSign quando disponível
      let specificMsg = ''
      if (parsedError) {
        if (typeof parsedError === 'string') {
          specificMsg = parsedError
        } else if (parsedError.detail) {
          specificMsg = parsedError.detail
        } else if (parsedError.message) {
          specificMsg = parsedError.message
        } else if (parsedError.error) {
          specificMsg =
            typeof parsedError.error === 'string'
              ? parsedError.error
              : JSON.stringify(parsedError.error)
        } else if (parsedError.signers) {
          specificMsg = `Dados do signatário inválidos: ${JSON.stringify(parsedError.signers)}`
        } else if (parsedError.name) {
          specificMsg = `Nome do documento inválido: ${JSON.stringify(parsedError.name)}`
        }
      }

      const finalMsg = specificMsg
        ? `A ZapSign recusou o documento: ${specificMsg}`
        : `A ZapSign retornou um erro ao criar o documento (HTTP ${zapsignResponse?.statusCode || 'falha'}). Verifique os dados da proposta e do cliente.`

      return c.json(400, {
        message: finalMsg,
        details: detalhe,
      })
    }

    const zapsignData = zapsignResponse.json || {}
    const docToken = zapsignData.token || ''
    let signatureUrl = ''

    if (Array.isArray(zapsignData.signers) && zapsignData.signers.length > 0) {
      const firstSigner = zapsignData.signers[0]
      signatureUrl = firstSigner.sign_url || ''
      if (!signatureUrl && firstSigner.token) {
        signatureUrl = `https://app.zapsign.com.br/verificar/${firstSigner.token}`
      }
    }

    // Atualiza a proposta no banco com o token da ZapSign, link e status = 'enviada'
    try {
      proposalRecord.set('zapsign_doc_token', docToken)
      proposalRecord.set('link_assinatura', signatureUrl)
      proposalRecord.set('status', 'enviada')
      $app.save(proposalRecord)
    } catch (err) {
      console.error('Erro ao atualizar proposta com dados da ZapSign:', err)
      return c.json(500, {
        message: 'Documento criado na ZapSign, mas ocorreu um erro ao salvar o registro no CRM.',
      })
    }

    return c.json(200, {
      success: true,
      message: 'Proposta enviada com sucesso para assinatura via ZapSign!',
      doc_token: docToken,
      signature_url: signatureUrl,
      status: 'enviada',
    })
  },
  $apis.requireAuth(),
)

/**
 * Webhook público da ZapSign: notificação de documento assinado
 * POST /webhooks/zapsign/doc_signed
 *
 * Configuração na ZapSign:
 * URL: https://crm-web-de-gestao-4fd3e.shrd01.internal.goskip.dev/webhooks/zapsign/doc_signed
 * (Se configurado secret na ZapSign via query param: ?secret=SEU_SECRET)
 */
routerAdd('POST', '/webhooks/zapsign/doc_signed', (c) => {
  // Validação opcional de segredo compartilhado na query string
  const webhookSecret = $os.getenv('ZAPSIGN_WEBHOOK_SECRET')
  if (webhookSecret && webhookSecret.trim() !== '') {
    const querySecret = c.requestInfo().query?.secret || ''
    if (querySecret !== webhookSecret.trim()) {
      return c.json(403, { message: 'Token de webhook não autorizado.' })
    }
  }

  let body = {}
  try {
    body = c.requestInfo().body || {}
  } catch (err) {
    return c.json(400, { message: 'Corpo da requisição inválido.' })
  }

  const docToken = body.token || body.doc_token
  const eventType = body.event_type || body.eventType || ''
  const externalId = body.external_id || body.externalId || ''
  const docStatus = body.status || ''

  console.log(
    `Webhook ZapSign recebido: evento=${eventType}, status=${docStatus}, token=${docToken}`,
  )

  if (!docToken && !externalId) {
    return c.json(400, {
      message: 'Token do documento ou external_id não informado no payload do webhook.',
    })
  }

  // Tenta localizar a proposta correspondente
  let proposalRecord = null

  // 1. Pelo token do documento ZapSign
  if (docToken) {
    try {
      proposalRecord = $app.findFirstRecordByFilter('propostas', `zapsign_doc_token = {:token}`, {
        token: docToken,
      })
    } catch (_) {
      proposalRecord = null
    }
  }

  // 2. Fallback: pelo external_id (que guarda o id da proposta)
  if (!proposalRecord && externalId) {
    try {
      proposalRecord = $app.findRecordById('propostas', externalId)
    } catch (_) {
      proposalRecord = null
    }
  }

  if (!proposalRecord) {
    console.warn(
      `Webhook ZapSign: nenhuma proposta encontrada para token=${docToken} externalId=${externalId}`,
    )
    return c.json(200, {
      received: true,
      matched: false,
      message: 'Documento recebido, mas proposta não localizada no banco.',
    })
  }

  // Atualiza a proposta para 'assinada' e grava a data
  const signedAt = new Date().toISOString()
  try {
    proposalRecord.set('status', 'assinada')
    proposalRecord.set('assinado_em', signedAt)
    $app.save(proposalRecord)
    console.log(`Proposta ${proposalRecord.getString('codigo')} atualizada para status 'assinada'!`)
  } catch (err) {
    console.error('Erro ao salvar proposta via webhook ZapSign:', err)
    return c.json(500, { message: 'Erro ao atualizar proposta no banco de dados.' })
  }

  return c.json(200, {
    success: true,
    message: 'Proposta atualizada para assinada com sucesso!',
    proposta_id: proposalRecord.id,
    codigo: proposalRecord.getString('codigo'),
  })
})
