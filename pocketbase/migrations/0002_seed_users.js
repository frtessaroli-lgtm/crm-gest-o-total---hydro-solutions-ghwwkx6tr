/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    const adminEmail = 'fr.tessaroli@gmail.com'

    try {
      app.findAuthRecordByEmail('_pb_users_auth_', adminEmail)
      // Já existe, não recriar
    } catch (_) {
      const record = new Record(users)
      record.setEmail(adminEmail)
      record.setPassword('Skip@Pass')
      record.setVerified(true)
      record.set('name', 'Carlos Tessaroli')
      app.save(record)
    }

    // Também criar um usuário padrão simples de acesso caso queira entrar como admin@nexocrm.com.br
    const demoEmail = 'admin@nexocrm.com.br'
    try {
      app.findAuthRecordByEmail('_pb_users_auth_', demoEmail)
    } catch (_) {
      const demo = new Record(users)
      demo.setEmail(demoEmail)
      demo.setPassword('Skip@Pass')
      demo.setVerified(true)
      demo.set('name', 'Admin Nexo CRM')
      app.save(demo)
    }
  },
  (app) => {
    try {
      const r1 = app.findAuthRecordByEmail('_pb_users_auth_', 'fr.tessaroli@gmail.com')
      app.delete(r1)
    } catch (_) {}
    try {
      const r2 = app.findAuthRecordByEmail('_pb_users_auth_', 'admin@nexocrm.com.br')
      app.delete(r2)
    } catch (_) {}
  },
)
