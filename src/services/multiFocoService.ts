/**
 * Serviço de Integração com a API do Multi Foco
 * Endpoint externo documentado:
 * GET /v1/clients/filter/search/{termo}
 * onde {termo} é o documento do cliente (somente dígitos)
 */

export interface MultiFocoSyncResult {
  success: boolean
  clientId?: string
  message: string
  rawResponse?: any
}

export const syncClientWithMultiFoco = async (
  document: string,
  baseUrl?: string,
  apiToken?: string,
): Promise<MultiFocoSyncResult> => {
  const cleanDoc = document.replace(/\D/g, '')

  if (!cleanDoc) {
    return {
      success: false,
      message: 'Documento inválido ou não informado para busca no Multi Foco.',
    }
  }

  const trimmedBaseUrl = (baseUrl || '').trim().replace(/\/+$/, '')
  const trimmedToken = (apiToken || '').trim()

  if (!trimmedBaseUrl) {
    return {
      success: false,
      message: 'Configure a URL Base do Multi Foco na aba Configurações antes de sincronizar.',
    }
  }

  // Monta a URL completa conforme a especificação: GET /v1/clients/filter/search/{termo}
  const endpoint = `${trimmedBaseUrl}/v1/clients/filter/search/${encodeURIComponent(cleanDoc)}`

  const headers: Record<string, string> = {
    Accept: 'application/json',
  }

  if (trimmedToken) {
    // Se o token já começar com Bearer, usa diretamente; senão prefixa
    headers['Authorization'] = trimmedToken.toLowerCase().startsWith('bearer ')
      ? trimmedToken
      : `Bearer ${trimmedToken}`
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 12000) // timeout de 12s para UX

    const response = await fetch(endpoint, {
      method: 'GET',
      headers,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (response.status === 404) {
      return {
        success: false,
        message: `Nenhum cadastro encontrado no Multi Foco para o documento ${cleanDoc}.`,
      }
    }

    if (response.status === 401 || response.status === 403) {
      return {
        success: false,
        message:
          'Falha de autenticação no Multi Foco. Verifique o Token configurado em Configurações.',
      }
    }

    if (!response.ok) {
      return {
        success: false,
        message: `Erro na API do Multi Foco (HTTP ${response.status}: ${response.statusText}).`,
      }
    }

    const data = await response.json().catch(() => null)

    if (!data) {
      return {
        success: false,
        message: 'A resposta da API do Multi Foco não retornou um JSON válido.',
      }
    }

    // Trata formatos plausíveis:
    // 1. Array de clientes: [{ id: '...', multifoco_client_id: '...', ... }]
    // 2. Objeto direto: { id: '...', multifoco_client_id: '...' }
    // 3. Objeto encapsulado: { data: [...] } ou { client: { ... } }
    let clientFound: any = null

    if (Array.isArray(data)) {
      clientFound = data[0]
    } else if (data && typeof data === 'object') {
      if (Array.isArray(data.data)) {
        clientFound = data.data[0]
      } else if (Array.isArray(data.clients)) {
        clientFound = data.clients[0]
      } else if (data.client && typeof data.client === 'object') {
        clientFound = data.client
      } else {
        clientFound = data
      }
    }

    if (!clientFound) {
      return {
        success: false,
        message: 'Nenhum registro retornado pelo Multi Foco para este documento.',
        rawResponse: data,
      }
    }

    // Identificador retornado: pode vir como id, client_id, multifoco_client_id, code, etc.
    const resolvedId =
      clientFound.multifoco_client_id ||
      clientFound.client_id ||
      clientFound.clientId ||
      clientFound.id ||
      clientFound.code ||
      clientFound.codigo

    if (!resolvedId) {
      return {
        success: false,
        message: 'Cliente localizado, mas nenhum campo de ID foi identificado na resposta da API.',
        rawResponse: clientFound,
      }
    }

    return {
      success: true,
      clientId: String(resolvedId),
      message: `Cliente sincronizado com sucesso! ID Multi Foco: ${resolvedId}`,
      rawResponse: clientFound,
    }
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return {
        success: false,
        message: 'Tempo limite esgotado ao contatar a API do Multi Foco (timeout de 12s).',
      }
    }
    // Erros de CORS / rede / offline
    return {
      success: false,
      message: `Não foi possível conectar ao Multi Foco: ${
        err.message || 'Verifique sua conexão ou restrições de CORS da API.'
      }`,
    }
  }
}
