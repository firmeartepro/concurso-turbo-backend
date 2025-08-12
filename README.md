# 🚀 Concurso Turbo IA - Backend

Sistema backend completo para processamento de pagamentos e gestão de usuários do Concurso Turbo IA.

## 🛠️ Tecnologias

- **Node.js** - Runtime JavaScript
- **Express.js** - Framework web
- **SQLite** - Banco de dados
- **Mercado Pago** - Gateway de pagamento
- **Nodemailer** - Sistema de emails
- **Railway** - Hospedagem

## 📋 Funcionalidades

- ✅ Processamento de pagamentos via Mercado Pago
- ✅ Sistema de emails automático
- ✅ Webhooks para confirmação de pagamento
- ✅ Painel administrativo
- ✅ Banco de dados SQLite
- ✅ API RESTful completa
- ✅ Segurança e rate limiting

## 🚀 Deploy

### Railway (Recomendado)

1. Conecte este repositório ao Railway
2. Configure as variáveis de ambiente
3. Deploy automático

### Variáveis de Ambiente

```env
MERCADOPAGO_ACCESS_TOKEN=seu-access-token
MERCADOPAGO_PUBLIC_KEY=sua-public-key
FRONTEND_URL=https://seu-frontend.vercel.app
BACKEND_URL=https://seu-backend.railway.app
SYSTEM_URL=https://seu-sistema.com
SMTP_USER=concursoturboia@gmail.com
SMTP_PASS=sua-senha-de-app
ADMIN_TOKEN=seu-token-admin
NODE_ENV=production

📊 Endpoints

Pagamentos

POST /api/payments/process
 - Processar pagamento
GET /api/payments/status/:id
 - Status do pagamento
Admin

GET /api/admin/stats
 - Estatísticas
GET /api/admin/payments
 - Lista de pagamentos
POST /api/admin/test-email
 - Testar email
Webhooks

POST /api/webhooks/mercadopago
 - Webhook do Mercado Pago
🔧 Desenvolvimento Local

# Instalar dependências
npm install

# Configurar .env
cp .env.example .env

# Executar em desenvolvimento
npm run dev

# Executar em produção
npm start

📞 Suporte

Email:
 concursoturboia@gmail.com
WhatsApp:
 (69) 98437-2961
📄 Licença

MIT License - © 2024 Concurso Turbo IA


---
