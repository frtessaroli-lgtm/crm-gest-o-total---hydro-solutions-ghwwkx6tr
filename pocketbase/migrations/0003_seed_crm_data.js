/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const clientesCol = app.findCollectionByNameOrId('clientes')
    const propostasCol = app.findCollectionByNameOrId('propostas')
    const ordensCol = app.findCollectionByNameOrId('ordens_servico')
    const notasCol = app.findCollectionByNameOrId('notas_fiscais')
    const cobrancasCol = app.findCollectionByNameOrId('cobrancas')

    // Idempotente: se já houver clientes, aborta
    if (app.countRecords('clientes') > 0) {
      return
    }

    const now = new Date()
    const daysAgo = (days) => new Date(now.getTime() - days * 86400000).toISOString()
    const dateStr = (daysDelta) =>
      new Date(now.getTime() + daysDelta * 86400000).toISOString().split('T')[0]

    // 1. Clientes
    const rawClients = [
      {
        key: 'cli-1',
        nome: 'Alpha Logística Integrada',
        tipo: 'PJ',
        email: 'contato@alphalog.com.br',
        telefone: '(11) 98765-4321',
        documento: '18.234.567/0001-90',
        rua: 'Rua das Indústrias',
        numero: '450',
        bairro: 'Distrito Industrial',
        cidade: 'São Bernardo do Campo',
        estado: 'SP',
        endereco: 'Rua das Indústrias, 450 - Distrito Industrial, São Bernardo do Campo/SP',
        valor_mensal: 2200,
        dia_vencimento: 10,
        multifoco_client_id: 'MF-882194',
        observacoes: 'Cliente premium com contrato anual de suporte e SLAs críticos de 2h.',
        status: 'ativo',
      },
      {
        key: 'cli-2',
        nome: 'Beta Varejo Multicanal S.A.',
        tipo: 'PJ',
        email: 'operacoes@betavarejo.com.br',
        telefone: '(21) 97654-3210',
        documento: '29.876.543/0001-12',
        rua: 'Av. das Américas',
        numero: '3200',
        bairro: 'Barra da Tijuca',
        cidade: 'Rio de Janeiro',
        estado: 'RJ',
        endereco: 'Av. das Américas, 3200 - Barra da Tijuca, Rio de Janeiro/RJ',
        valor_mensal: 3500,
        dia_vencimento: 15,
        multifoco_client_id: 'MF-671203',
        observacoes: 'Implantação de ERP e integração de marketplace em andamento.',
        status: 'ativo',
      },
      {
        key: 'cli-3',
        nome: 'Gamma Saúde & Diagnósticos',
        tipo: 'PJ',
        email: 'ti@gammasaude.med.br',
        telefone: '(31) 96543-2109',
        documento: '03.456.789/0001-33',
        rua: 'Rua dos Médicos',
        numero: '88',
        bairro: 'Funcionários',
        cidade: 'Belo Horizonte',
        estado: 'MG',
        endereco: 'Rua dos Médicos, 88 - Funcionários, Belo Horizonte/MG',
        valor_mensal: 4800,
        dia_vencimento: 20,
        multifoco_client_id: '',
        observacoes: 'Proposta de automação de laudos aprovada. Manutenção periódica mensal.',
        status: 'ativo',
      },
      {
        key: 'cli-4',
        nome: 'Delta Engenharia e Automação',
        tipo: 'PJ',
        email: 'engenharia@deltaautomacao.com.br',
        telefone: '(41) 95432-1098',
        documento: '76.543.210/0001-55',
        rua: 'Rua XV de Novembro',
        numero: '1250',
        bairro: 'Centro',
        cidade: 'Curitiba',
        estado: 'PR',
        endereco: 'Rua XV de Novembro, 1250 - Centro, Curitiba/PR',
        valor_mensal: 1950,
        dia_vencimento: 5,
        multifoco_client_id: '',
        observacoes: 'Necessita faturamento com boleto de vencimento todo dia 5.',
        status: 'ativo',
      },
      {
        key: 'cli-5',
        nome: 'Omni Foods Distribuidora',
        tipo: 'PJ',
        email: 'compras@omnifoods.com.br',
        telefone: '(19) 94321-0987',
        documento: '54.321.098/0001-77',
        rua: 'Rodovia Anhanguera',
        numero: 'Km 104',
        bairro: 'Campinas Tech',
        cidade: 'Campinas',
        estado: 'SP',
        endereco: 'Rodovia Anhanguera, Km 104 - Campinas/SP',
        valor_mensal: 2700,
        dia_vencimento: 25,
        multifoco_client_id: '',
        observacoes: 'Cobrança do mês anterior pendente de conciliação bancária.',
        status: 'ativo',
      },
      {
        key: 'cli-6',
        nome: 'Studio Neo Arquitetura',
        tipo: 'PJ',
        email: 'contato@studioneo.arq.br',
        telefone: '(11) 93210-9876',
        documento: '41.123.987/0001-05',
        rua: 'Alameda Gabriel Monteiro da Silva',
        numero: '620',
        bairro: 'Jardins',
        cidade: 'São Paulo',
        estado: 'SP',
        endereco: 'Alameda Gabriel Monteiro da Silva, 620 - Jardins, São Paulo/SP',
        valor_mensal: 1200,
        dia_vencimento: 10,
        multifoco_client_id: '',
        observacoes: 'Pausa contratual temporária para reestruturação societária.',
        status: 'inativo',
      },
      {
        key: 'cli-7',
        nome: 'Mariana Duarte Consultoria',
        tipo: 'PF',
        email: 'mariana.duarte@consultoria.com.br',
        telefone: '(11) 98112-3456',
        documento: '123.456.789-09',
        rua: 'Rua Oscar Freire',
        numero: '910',
        bairro: 'Cerqueira César',
        cidade: 'São Paulo',
        estado: 'SP',
        endereco: 'Rua Oscar Freire, 910 - Cerqueira César, São Paulo/SP',
        valor_mensal: 1500,
        dia_vencimento: 12,
        multifoco_client_id: '',
        observacoes: 'Consultora de processos em contrato recorrente mensal.',
        status: 'ativo',
      },
    ]

    const clientMap = {} // key -> real record
    for (const c of rawClients) {
      const rec = new Record(clientesCol)
      rec.set('nome', c.nome)
      rec.set('tipo', c.tipo)
      rec.set('email', c.email)
      rec.set('telefone', c.telefone)
      rec.set('documento', c.documento)
      rec.set('rua', c.rua)
      rec.set('numero', c.numero)
      rec.set('bairro', c.bairro)
      rec.set('cidade', c.cidade)
      rec.set('estado', c.estado)
      rec.set('endereco', c.endereco)
      rec.set('valor_mensal', c.valor_mensal)
      rec.set('dia_vencimento', c.dia_vencimento)
      rec.set('multifoco_client_id', c.multifoco_client_id)
      rec.set('observacoes', c.observacoes)
      rec.set('status', c.status)
      app.save(rec)
      clientMap[c.key] = rec
    }

    // 2. Propostas
    const rawProposals = [
      {
        key: 'prop-1',
        clientKey: 'cli-1',
        codigo: 'PROP-2025-001',
        titulo: 'Auditoria de Infraestrutura em Nuvem e Otimização FinOps',
        descricao:
          'Revisão completa da arquitetura AWS/Kubernetes para redução de custos e resiliência operacional.',
        valor: 12800,
        status: 'aceita',
        validade: dateStr(15),
        itens: [
          {
            id: 'i1',
            description: 'Levantamento e auditoria de recursos em nuvem',
            quantity: 1,
            unitPrice: 4200,
            total: 4200,
          },
          {
            id: 'i2',
            description: 'Implementação de esteiras de autoscale e FinOps',
            quantity: 1,
            unitPrice: 5600,
            total: 5600,
          },
          {
            id: 'i3',
            description: 'Treinamento e documentação operacional',
            quantity: 12,
            unitPrice: 250,
            total: 3000,
          },
        ],
      },
      {
        key: 'prop-2',
        clientKey: 'cli-2',
        codigo: 'PROP-2025-002',
        titulo: 'Integração de Gateway de Pagamentos e Checkout Transparente',
        descricao: 'Implementação de split de pagamentos e conciliação automática para e-commerce.',
        valor: 12700,
        status: 'enviada',
        validade: dateStr(12),
        itens: [
          {
            id: 'i1',
            description: 'Desenvolvimento de microsserviço de checkout',
            quantity: 1,
            unitPrice: 8500,
            total: 8500,
          },
          {
            id: 'i2',
            description: 'Módulo de prevenção a fraude e webhooks',
            quantity: 1,
            unitPrice: 4200,
            total: 4200,
          },
        ],
      },
      {
        key: 'prop-3',
        clientKey: 'cli-3',
        codigo: 'PROP-2025-003',
        titulo: 'Portal Seguro do Paciente com Criptografia E2E',
        descricao:
          'Desenvolvimento web responsivo para consulta e download seguro de laudos médicos.',
        valor: 18400,
        status: 'aceita',
        validade: dateStr(-10),
        itens: [
          {
            id: 'i1',
            description: 'Design UI/UX e prototipação de alta fidelidade',
            quantity: 1,
            unitPrice: 3800,
            total: 3800,
          },
          {
            id: 'i2',
            description: 'Frontend em React e Backend seguro em Go',
            quantity: 1,
            unitPrice: 11400,
            total: 11400,
          },
          {
            id: 'i3',
            description: 'Certificação de conformidade LGPD / HIPAA',
            quantity: 1,
            unitPrice: 3200,
            total: 3200,
          },
        ],
      },
      {
        key: 'prop-4',
        clientKey: 'cli-4',
        codigo: 'PROP-2025-004',
        titulo: 'Dashboard de Telemetria Industrial IoT',
        descricao: 'Centralização de dados de sensores modbus em tempo real com alertas críticos.',
        valor: 13000,
        status: 'enviada',
        validade: dateStr(20),
        itens: [
          {
            id: 'i1',
            description: 'Gateway de telemetria MQTT e ingestão de dados',
            quantity: 1,
            unitPrice: 7200,
            total: 7200,
          },
          {
            id: 'i2',
            description: 'Dashboard analítico com alertas preditivos',
            quantity: 1,
            unitPrice: 5800,
            total: 5800,
          },
        ],
      },
      {
        key: 'prop-5',
        clientKey: 'cli-5',
        codigo: 'PROP-2025-005',
        titulo: 'App de Roteirização e Coleta de Assinatura Digital',
        descricao:
          'Aplicativo móvel para motoristas com confirmação de entrega via geolocalização.',
        valor: 14400,
        status: 'rascunho',
        validade: dateStr(25),
        itens: [
          {
            id: 'i1',
            description: 'Desenvolvimento do aplicativo motorista offline-first',
            quantity: 1,
            unitPrice: 9800,
            total: 9800,
          },
          {
            id: 'i2',
            description: 'Painel operacional da torre de controle',
            quantity: 1,
            unitPrice: 4600,
            total: 4600,
          },
        ],
      },
      {
        key: 'prop-6',
        clientKey: 'cli-6',
        codigo: 'PROP-2025-006',
        titulo: 'Migração de Render Farm para Cluster Dedicado',
        descricao: 'Configuração de nós de renderização remota de projetos 3D volumosos.',
        valor: 6400,
        status: 'recusada',
        validade: dateStr(-30),
        itens: [
          {
            id: 'i1',
            description: 'Consultoria técnica de hardware e rede local',
            quantity: 1,
            unitPrice: 3500,
            total: 3500,
          },
          {
            id: 'i2',
            description: 'Setup e testes de stress de renderização',
            quantity: 1,
            unitPrice: 2900,
            total: 2900,
          },
        ],
      },
      {
        key: 'prop-7',
        clientKey: 'cli-1',
        codigo: 'PROP-2025-007',
        titulo: 'Contrato Anual de Suporte e Monitoramento 24x7 (2025)',
        descricao: 'Pacote de 30 horas mensais de suporte preventivo e garantia de SLA.',
        valor: 26400,
        status: 'aceita',
        validade: dateStr(-10),
        itens: [
          {
            id: 'i1',
            description: 'Plano mensal de governança de TI e NOC',
            quantity: 12,
            unitPrice: 2200,
            total: 26400,
          },
        ],
      },
    ]

    const proposalMap = {}
    for (const p of rawProposals) {
      const rec = new Record(propostasCol)
      rec.set('cliente_id', clientMap[p.clientKey].id)
      rec.set('codigo', p.codigo)
      rec.set('titulo', p.titulo)
      rec.set('descricao', p.descricao)
      rec.set('valor', p.valor)
      rec.set('status', p.status)
      rec.set('validade', p.validade)
      rec.set('itens', JSON.stringify(p.itens))
      app.save(rec)
      proposalMap[p.key] = rec
    }

    // 3. Ordens de Serviço
    const rawOS = [
      {
        key: 'os-1',
        clientKey: 'cli-1',
        proposalKey: 'prop-1',
        code: 'OS-2025-001',
        numero_os: 'OS-2025-001',
        titulo: 'Execução de Auditoria Cloud AWS e Configuração FinOps',
        descricao:
          'Migração de instâncias EC2 legadas para Graviton e implantação de alarmes no CloudWatch.',
        tecnico: 'Rafael Souza (DevOps Lead)',
        data_inicio: dateStr(-20),
        data_fim: dateStr(10),
        valor: 12800,
        status: 'em_andamento',
      },
      {
        key: 'os-2',
        clientKey: 'cli-3',
        proposalKey: 'prop-3',
        code: 'OS-2025-002',
        numero_os: 'OS-2025-002',
        titulo: 'Entrega e Homologação do Portal de Laudos Digitais',
        descricao: 'Fase final de testes de carga e liberação em produção com SSL EV.',
        tecnico: 'Mariana Lima (Senior Fullstack)',
        data_inicio: dateStr(-35),
        data_fim: dateStr(-5),
        valor: 18400,
        status: 'concluida',
        concluida_em: daysAgo(5),
      },
      {
        key: 'os-3',
        clientKey: 'cli-1',
        proposalKey: 'prop-7',
        code: 'OS-2025-003',
        numero_os: 'OS-2025-003',
        titulo: 'Plantão Preventivo e Atualizações de Segurança - Mês Corrente',
        descricao: 'Aplicação de patches de SO e revisão de logs de auditoria de acessos.',
        tecnico: 'Lucas Ferreira (Security Ops)',
        data_inicio: dateStr(-12),
        data_fim: dateStr(18),
        valor: 2200,
        status: 'em_andamento',
      },
      {
        key: 'os-4',
        clientKey: 'cli-4',
        code: 'OS-2025-004',
        numero_os: 'OS-2025-004',
        titulo: 'Diagnóstico de Comunicação dos Sensores na Planta Curitiba',
        descricao: 'Verificação in loco de cabeamento industrial e ruído em interfaces RS-485.',
        tecnico: 'Bruno Ribeiro (Automação)',
        data_inicio: dateStr(-1),
        data_fim: dateStr(8),
        valor: 3900,
        status: 'aberta',
      },
      {
        key: 'os-5',
        clientKey: 'cli-2',
        code: 'OS-2025-005',
        numero_os: 'OS-2025-005',
        titulo: 'Configuração de Sandbox de Pagamentos e Testes de Carga',
        descricao: 'Simulação de 5.000 requisições simultâneas para o evento da Cyber Week.',
        tecnico: 'Mariana Lima (Senior Fullstack)',
        data_inicio: dateStr(-4),
        data_fim: dateStr(14),
        valor: 4500,
        status: 'em_andamento',
      },
      {
        key: 'os-6',
        clientKey: 'cli-6',
        proposalKey: 'prop-6',
        code: 'OS-2025-006',
        numero_os: 'OS-2025-006',
        titulo: 'Instalação de Servidor NAS de Armazenamento Local',
        descricao: 'Cancelada após reavaliação de prioridades orçamentárias pelo cliente.',
        tecnico: 'Lucas Ferreira (Security Ops)',
        data_inicio: dateStr(-40),
        data_fim: dateStr(-30),
        valor: 3500,
        status: 'cancelada',
      },
      {
        key: 'os-7',
        clientKey: 'cli-5',
        code: 'OS-2025-007',
        numero_os: 'OS-2025-007',
        titulo: 'Mapeamento de Processos de Expedição e Regras de Negócio',
        descricao: 'Levantamento de requisitos detalhados com equipe de logística.',
        tecnico: 'Carlos Tessaroli (Consultoria)',
        data_inicio: dateStr(2),
        data_fim: dateStr(16),
        valor: 5200,
        status: 'aberta',
      },
    ]

    const osMap = {}
    for (const o of rawOS) {
      const rec = new Record(ordensCol)
      rec.set('cliente_id', clientMap[o.clientKey].id)
      if (o.proposalKey && proposalMap[o.proposalKey]) {
        rec.set('proposta_id', proposalMap[o.proposalKey].id)
      }
      rec.set('code', o.code)
      rec.set('numero_os', o.numero_os)
      rec.set('titulo', o.titulo)
      rec.set('descricao', o.descricao)
      rec.set('tecnico', o.tecnico)
      rec.set('data_inicio', o.data_inicio)
      rec.set('data_fim', o.data_fim)
      rec.set('valor', o.valor)
      rec.set('status', o.status)
      if (o.concluida_em) {
        rec.set('concluida_em', o.concluida_em)
      }
      app.save(rec)
      osMap[o.key] = rec
    }

    // 4. Notas Fiscais
    const rawNFs = [
      {
        numero_nfse: '20250089',
        clientKey: 'cli-3',
        osKeys: ['os-2'],
        emitida_em: dateStr(-5),
        valor: 18400,
        status: 'enviada',
        observacoes: 'Nota emitida referente à entrega completa do Portal do Paciente.',
      },
      {
        numero_nfse: '20250090',
        clientKey: 'cli-1',
        osKeys: ['os-3'],
        emitida_em: dateStr(-10),
        valor: 2200,
        status: 'emitida',
        observacoes: 'Serviços continuados de suporte de infraestrutura e NOC.',
      },
      {
        numero_nfse: '20250091',
        clientKey: 'cli-1',
        osKeys: ['os-1'],
        emitida_em: dateStr(-2),
        valor: 12800,
        status: 'pendente',
        observacoes: 'Primeira parcela dos serviços de consultoria FinOps em nuvem.',
      },
      {
        numero_nfse: '20250092',
        clientKey: 'cli-2',
        osKeys: ['os-5'],
        emitida_em: dateStr(-18),
        valor: 4500,
        status: 'enviada',
        observacoes: 'Ambiente de testes e homologação de gateway.',
      },
      {
        numero_nfse: '20250093',
        clientKey: 'cli-4',
        osKeys: ['os-4'],
        emitida_em: dateStr(-1),
        valor: 3900,
        status: 'pendente',
        observacoes: 'Aguardando validação do relatório técnico de diagnóstico.',
      },
      {
        numero_nfse: '20250085',
        clientKey: 'cli-6',
        osKeys: ['os-6'],
        emitida_em: dateStr(-45),
        valor: 3500,
        status: 'cancelada',
        observacoes: 'Nota cancelada a pedido da contabilidade antes do vencimento.',
      },
    ]

    for (const nf of rawNFs) {
      const rec = new Record(notasCol)
      rec.set('cliente_id', clientMap[nf.clientKey].id)
      rec.set('numero_nfse', nf.numero_nfse)
      rec.set('emitida_em', nf.emitida_em)
      rec.set('valor', nf.valor)
      rec.set('status', nf.status)
      rec.set('observacoes', nf.observacoes)
      if (nf.osKeys && nf.osKeys.length > 0) {
        const primaryOs = osMap[nf.osKeys[0]]
        if (primaryOs) {
          rec.set('ordem_servico_id', primaryOs.id)
        }
        const osIds = nf.osKeys.map((k) => osMap[k]?.id).filter(Boolean)
        const osCodes = nf.osKeys.map((k) => osMap[k]?.getString('code') || k)
        rec.set('os_ids', JSON.stringify(osIds))
        rec.set('os_codigos', JSON.stringify(osCodes))
      }
      app.save(rec)
    }

    // 5. Cobranças (nos 4 status: Emitido, Pago, Vencido, Cancelado)
    const rawCharges = [
      // Pago
      {
        codigo: 'COB-1088',
        clientKey: 'cli-3',
        descricao: 'Mensalidade Suporte e Licenciamento - Portal de Laudos',
        competencia: '03/2025',
        valor: 18400,
        vencimento: dateStr(-5),
        pago_em: dateStr(-4),
        status: 'Pago',
        linha_digitavel: '34191.79001 01043.510047 91020.150008 1 99990001840000',
      },
      {
        codigo: 'COB-1089',
        clientKey: 'cli-1',
        descricao: 'Fatura Mensal Suporte e Monitoramento 24x7',
        competencia: '03/2025',
        valor: 2200,
        vencimento: dateStr(-2),
        pago_em: dateStr(-1),
        status: 'Pago',
        linha_digitavel: '03399.07202 54321.890012 34567.890001 8 99990000220000',
      },
      // Vencido
      {
        codigo: 'COB-1090',
        clientKey: 'cli-5',
        descricao: 'Mensalidade Manutenção Sistema de Roteirização',
        competencia: '02/2025',
        valor: 3600,
        vencimento: dateStr(-14),
        status: 'Vencido',
        linha_digitavel: '23793.38128 60000.123456 78901.234567 4 99990000360000',
      },
      {
        codigo: 'COB-1091',
        clientKey: 'cli-4',
        descricao: 'Boleto Parcela 1/2 - Diagnóstico e Telemetria',
        competencia: '02/2025',
        valor: 3900,
        vencimento: dateStr(-6),
        status: 'Vencido',
        linha_digitavel: '10491.80004 00001.234567 89012.345678 3 99990000390000',
      },
      // Emitido
      {
        codigo: 'COB-1092',
        clientKey: 'cli-1',
        descricao: 'Boleto Parcela 1/2 - Consultoria FinOps Cloud',
        competencia: '03/2025',
        valor: 6400,
        vencimento: dateStr(2),
        status: 'Emitido',
        linha_digitavel: '74891.12345 56789.012345 67890.123456 9 99990000640000',
      },
      {
        codigo: 'COB-1093',
        clientKey: 'cli-2',
        descricao: 'Fatura Integração Checkout e Gateway',
        competencia: '03/2025',
        valor: 4500,
        vencimento: dateStr(5),
        status: 'Emitido',
        linha_digitavel: '34191.23456 78901.234567 89012.345678 2 99990000450000',
      },
      {
        codigo: 'COB-1094',
        clientKey: 'cli-7',
        descricao: 'Consultoria Recorrente de Processos',
        competencia: '03/2025',
        valor: 1500,
        vencimento: dateStr(1),
        status: 'Emitido',
        linha_digitavel: '03399.12345 67890.123456 78901.234567 5 99990000150000',
      },
      {
        codigo: 'COB-1095',
        clientKey: 'cli-3',
        descricao: 'Consultoria Complementar LGPD / Backups',
        competencia: '03/2025',
        valor: 3200,
        vencimento: dateStr(20),
        status: 'Emitido',
        linha_digitavel: '10491.12345 67890.123456 78901.234567 8 99990000320000',
      },
      // Cancelado
      {
        codigo: 'COB-1082',
        clientKey: 'cli-6',
        descricao: 'Taxa de Setup Servidor NAS (Cancelado)',
        competencia: '01/2025',
        valor: 1750,
        vencimento: dateStr(-30),
        status: 'Cancelado',
        linha_digitavel: '23793.12345 67890.123456 78901.234567 7 99990000175000',
      },
      // Histórico de cobranças pagas dos meses anteriores para o gráfico de 6 meses
      {
        codigo: 'COB-1070',
        clientKey: 'cli-3',
        descricao: 'Mensalidade Portal de Laudos e Licenças',
        competencia: '02/2025',
        valor: 18400,
        vencimento: dateStr(-35),
        pago_em: dateStr(-34),
        status: 'Pago',
        linha_digitavel: '34191.79001 01043.510047 91020.150008 1 99990001840000',
      },
      {
        codigo: 'COB-1071',
        clientKey: 'cli-1',
        descricao: 'Suporte de TI e Monitoramento 24x7',
        competencia: '02/2025',
        valor: 2200,
        vencimento: dateStr(-38),
        pago_em: dateStr(-37),
        status: 'Pago',
        linha_digitavel: '03399.07202 54321.890012 34567.890001 8 99990000220000',
      },
      {
        codigo: 'COB-1060',
        clientKey: 'cli-2',
        descricao: 'Mensalidade Suporte e Integrações ERP',
        competencia: '01/2025',
        valor: 14500,
        vencimento: dateStr(-68),
        pago_em: dateStr(-67),
        status: 'Pago',
        linha_digitavel: '23793.38128 60000.123456 78901.234567 4 99990001450000',
      },
      {
        codigo: 'COB-1061',
        clientKey: 'cli-1',
        descricao: 'Suporte de TI e Monitoramento 24x7',
        competencia: '01/2025',
        valor: 2200,
        vencimento: dateStr(-70),
        pago_em: dateStr(-69),
        status: 'Pago',
        linha_digitavel: '03399.07202 54321.890012 34567.890001 8 99990000220000',
      },
      {
        codigo: 'COB-1050',
        clientKey: 'cli-3',
        descricao: 'Projeto Customização e Integração',
        competencia: '12/2024',
        valor: 16800,
        vencimento: dateStr(-98),
        pago_em: dateStr(-97),
        status: 'Pago',
        linha_digitavel: '10491.80004 00001.234567 89012.345678 3 99990001680000',
      },
      {
        codigo: 'COB-1051',
        clientKey: 'cli-4',
        descricao: 'Mensalidade Telemetria Industrial',
        competencia: '12/2024',
        valor: 3900,
        vencimento: dateStr(-102),
        pago_em: dateStr(-101),
        status: 'Pago',
        linha_digitavel: '74891.12345 56789.012345 67890.123456 9 99990000390000',
      },
      {
        codigo: 'COB-1040',
        clientKey: 'cli-2',
        descricao: 'Setup e Migração de Catálogo',
        competencia: '11/2024',
        valor: 12500,
        vencimento: dateStr(-128),
        pago_em: dateStr(-127),
        status: 'Pago',
        linha_digitavel: '34191.23456 78901.234567 89012.345678 2 99990001250000',
      },
      {
        codigo: 'COB-1041',
        clientKey: 'cli-5',
        descricao: 'Módulo de Roteirização de Frotas',
        competencia: '11/2024',
        valor: 3600,
        vencimento: dateStr(-132),
        pago_em: dateStr(-131),
        status: 'Pago',
        linha_digitavel: '03399.12345 67890.123456 78901.234567 5 99990000360000',
      },
      {
        codigo: 'COB-1030',
        clientKey: 'cli-1',
        descricao: 'Setup FinOps Cloud e Treinamento Equipe',
        competencia: '10/2024',
        valor: 9800,
        vencimento: dateStr(-158),
        pago_em: dateStr(-157),
        status: 'Pago',
        linha_digitavel: '23793.12345 67890.123456 78901.234567 7 99990000980000',
      },
    ]

    for (const c of rawCharges) {
      const rec = new Record(cobrancasCol)
      rec.set('cliente_id', clientMap[c.clientKey].id)
      rec.set('codigo', c.codigo)
      rec.set('descricao', c.descricao)
      rec.set('competencia', c.competencia)
      rec.set('valor', c.valor)
      rec.set('vencimento', c.vencimento)
      rec.set('status', c.status)
      rec.set('linha_digitavel', c.linha_digitavel)
      rec.set('metodo', 'boleto')
      if (c.pago_em) {
        rec.set('pago_em', c.pago_em)
      }
      app.save(rec)
    }
  },
  (app) => {
    // down: limpa registros inseridos se necessário
  },
)
