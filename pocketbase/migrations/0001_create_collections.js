/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // 1. clientes
    const clientes = new Collection({
      name: 'clientes',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'nome', type: 'text', required: true },
        { name: 'tipo', type: 'select', values: ['PF', 'PJ'], maxSelect: 1, required: true },
        { name: 'documento', type: 'text', required: true },
        { name: 'email', type: 'email', required: false },
        { name: 'telefone', type: 'text', required: false },
        { name: 'endereco', type: 'text', required: false },
        { name: 'valor_mensal', type: 'number', min: 0, required: false },
        { name: 'dia_vencimento', type: 'number', min: 1, max: 31, required: false },
        {
          name: 'status',
          type: 'select',
          values: ['ativo', 'inativo'],
          maxSelect: 1,
          required: true,
        },
        { name: 'observacoes', type: 'text', required: false },
        { name: 'multifoco_client_id', type: 'text', required: false },
        // Campos detalhados de endereço e meta
        { name: 'rua', type: 'text', required: false },
        { name: 'numero', type: 'text', required: false },
        { name: 'bairro', type: 'text', required: false },
        { name: 'cidade', type: 'text', required: false },
        { name: 'estado', type: 'text', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_clientes_documento ON clientes (documento)',
        'CREATE INDEX idx_clientes_status ON clientes (status)',
      ],
    })
    app.save(clientes)

    const clientesCol = app.findCollectionByNameOrId('clientes')

    // 2. propostas
    const propostas = new Collection({
      name: 'propostas',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'cliente_id',
          type: 'relation',
          collectionId: clientesCol.id,
          maxSelect: 1,
          required: true,
        },
        { name: 'codigo', type: 'text', required: false },
        { name: 'titulo', type: 'text', required: false },
        { name: 'valor', type: 'number', min: 0, required: false },
        { name: 'descricao', type: 'text', required: false },
        {
          name: 'status',
          type: 'select',
          values: ['rascunho', 'enviada', 'assinada', 'recusada', 'aceita'],
          maxSelect: 1,
          required: true,
        },
        { name: 'itens', type: 'json', required: false },
        { name: 'validade', type: 'text', required: false },
        { name: 'zapsign_doc_token', type: 'text', required: false },
        { name: 'link_assinatura', type: 'text', required: false },
        { name: 'assinado_em', type: 'text', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_propostas_cliente ON propostas (cliente_id)',
        'CREATE INDEX idx_propostas_status ON propostas (status)',
      ],
    })
    app.save(propostas)

    const propostasCol = app.findCollectionByNameOrId('propostas')

    // 3. ordens_servico
    const ordensServico = new Collection({
      name: 'ordens_servico',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'proposta_id',
          type: 'relation',
          collectionId: propostasCol.id,
          maxSelect: 1,
          required: false,
        },
        {
          name: 'cliente_id',
          type: 'relation',
          collectionId: clientesCol.id,
          maxSelect: 1,
          required: true,
        },
        { name: 'titulo', type: 'text', required: false },
        { name: 'descricao', type: 'text', required: false },
        {
          name: 'status',
          type: 'select',
          values: ['pendente_envio', 'enviada', 'concluida', 'cancelada', 'aberta', 'em_andamento'],
          maxSelect: 1,
          required: true,
        },
        { name: 'multifoco_os_id', type: 'text', required: false },
        { name: 'code', type: 'text', required: false },
        { name: 'numero_os', type: 'text', required: false },
        { name: 'tecnico', type: 'text', required: false },
        { name: 'data_inicio', type: 'text', required: false },
        { name: 'data_fim', type: 'text', required: false },
        { name: 'valor', type: 'number', min: 0, required: false },
        { name: 'ultima_sync_em', type: 'text', required: false },
        { name: 'enviada_em', type: 'text', required: false },
        { name: 'concluida_em', type: 'text', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_os_cliente ON ordens_servico (cliente_id)',
        'CREATE INDEX idx_os_proposta ON ordens_servico (proposta_id)',
        'CREATE INDEX idx_os_status ON ordens_servico (status)',
      ],
    })
    app.save(ordensServico)

    const ordensCol = app.findCollectionByNameOrId('ordens_servico')

    // 4. notas_fiscais
    const notasFiscais = new Collection({
      name: 'notas_fiscais',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'ordem_servico_id',
          type: 'relation',
          collectionId: ordensCol.id,
          maxSelect: 1,
          required: false,
        },
        {
          name: 'cliente_id',
          type: 'relation',
          collectionId: clientesCol.id,
          maxSelect: 1,
          required: true,
        },
        { name: 'valor', type: 'number', min: 0, required: false },
        {
          name: 'status',
          type: 'select',
          values: ['pendente', 'emitida', 'cancelada', 'erro', 'enviada'],
          maxSelect: 1,
          required: true,
        },
        { name: 'numero_nfse', type: 'text', required: false },
        { name: 'codigo_verificacao', type: 'text', required: false },
        { name: 'link_danfse', type: 'text', required: false },
        { name: 'motivo_erro', type: 'text', required: false },
        { name: 'emitida_em', type: 'text', required: false },
        { name: 'observacoes', type: 'text', required: false },
        { name: 'os_ids', type: 'json', required: false },
        { name: 'os_codigos', type: 'json', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_nf_cliente ON notas_fiscais (cliente_id)',
        'CREATE INDEX idx_nf_status ON notas_fiscais (status)',
      ],
    })
    app.save(notasFiscais)

    // 5. cobrancas
    const cobrancas = new Collection({
      name: 'cobrancas',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'cliente_id',
          type: 'relation',
          collectionId: clientesCol.id,
          maxSelect: 1,
          required: true,
        },
        { name: 'codigo', type: 'text', required: false },
        { name: 'descricao', type: 'text', required: false },
        { name: 'competencia', type: 'text', required: false },
        { name: 'valor', type: 'number', min: 0, required: false },
        { name: 'vencimento', type: 'text', required: true },
        {
          name: 'status',
          type: 'select',
          values: [
            'Emitido',
            'Pago',
            'Vencido',
            'Cancelado',
            'em_aberto',
            'pago',
            'em_atraso',
            'cancelado',
          ],
          maxSelect: 1,
          required: true,
        },
        { name: 'id_inter', type: 'text', required: false },
        { name: 'linha_digitavel', type: 'text', required: false },
        { name: 'qr_code_pix', type: 'text', required: false },
        { name: 'pago_em', type: 'text', required: false },
        { name: 'multa', type: 'number', min: 0, required: false },
        { name: 'juros', type: 'number', min: 0, required: false },
        { name: 'metodo', type: 'text', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_cobrancas_cliente ON cobrancas (cliente_id)',
        'CREATE INDEX idx_cobrancas_status ON cobrancas (status)',
        'CREATE INDEX idx_cobrancas_vencimento ON cobrancas (vencimento)',
      ],
    })
    app.save(cobrancas)
  },
  (app) => {
    const toDelete = ['cobrancas', 'notas_fiscais', 'ordens_servico', 'propostas', 'clientes']
    for (const name of toDelete) {
      try {
        const col = app.findCollectionByNameOrId(name)
        app.delete(col)
      } catch (_) {}
    }
  },
)
