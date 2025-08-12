const nodemailer = require('nodemailer');

// Create email transporter
let transporter;

try {
    transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        },
        tls: {
            rejectUnauthorized: false
        }
    });

    console.log('✅ Email transporter configured');
} catch (error) {
    console.error('❌ Email transporter configuration error:', error);
}

// Verify email configuration
async function verifyEmailConfig() {
    if (!transporter) {
        throw new Error('Email transporter not configured');
    }
    
    try {
        await transporter.verify();
        console.log('✅ Email server connection verified');
        return true;
    } catch (error) {
        console.error('❌ Email server verification failed:', error);
        return false;
    }
}

// Send confirmation email
async function sendConfirmationEmail(data) {
    const { email, name, plan, amount, transaction_id, external_reference } = data;
    
    if (!transporter) {
        throw new Error('Email service not configured');
    }
    
    const planText = plan === 'annual' ? 'Anual' : 'Mensal';
    const accessUrl = process.env.SYSTEM_URL || 'https://sistema.concursoturbo.com';
    
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bem-vindo ao Concurso Turbo IA!</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 0 auto; background: white; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; }
            .header h1 { font-size: 28px; margin-bottom: 10px; }
            .content { padding: 40px 30px; }
            .success-box { background: #d4edda; border-left: 4px solid #28a745; padding: 20px; margin: 20px 0; border-radius: 5px; }
            .info-box { background: #e3f2fd; border-left: 4px solid #2196f3; padding: 20px; margin: 20px 0; border-radius: 5px; }
            .warning-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 20px; margin: 20px 0; border-radius: 5px; }
            .button { display: inline-block; background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
            .button:hover { background: #218838; }
            .details { background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; }
            .details h3 { color: #495057; margin-bottom: 15px; }
            .details ul { list-style: none; }
            .details li { padding: 5px 0; border-bottom: 1px solid #dee2e6; }
            .details li:last-child { border-bottom: none; }
            .footer { background: #6c757d; color: white; padding: 20px; text-align: center; font-size: 12px; }
            .emoji { font-size: 20px; }
            @media (max-width: 600px) {
                .container { margin: 0; }
                .header, .content { padding: 20px; }
                .button { display: block; text-align: center; }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="emoji">🎉</div>
                <h1>Compra Confirmada!</h1>
                <p>Bem-vindo ao Concurso Turbo IA</p>
            </div>
            
            <div class="content">
                <div class="success-box">
                    <h2><span class="emoji">✅</span> Pagamento Aprovado com Sucesso!</h2>
                    <p>Olá <strong>${name}</strong>, sua compra foi processada e confirmada!</p>
                </div>
                
                <div class="details">
                    <h3><span class="emoji">📋</span> Detalhes da Compra</h3>
                    <ul>
                        <li><strong>Plano:</strong> ${planText}</li>
                        <li><strong>Valor:</strong> R$ ${parseFloat(amount).toFixed(2).replace('.', ',')}</li>
                        <li><strong>Transação:</strong> #${transaction_id}</li>
                        <li><strong>Referência:</strong> ${external_reference}</li>
                        <li><strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR', { 
                            day: '2-digit', 
                            month: '2-digit', 
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })}</li>
                    </ul>
                </div>
                
                <div class="info-box">
                    <h3><span class="emoji">🚀</span> Próximos Passos</h3>
                    <ol style="padding-left: 20px;">
                        <li><strong>Acesso liberado:</strong> Seu acesso ao sistema já está ativo!</li>
                        <li><strong>Login:</strong> Use este email (${email}) para fazer login</li>
                        <li><strong>Senha temporária:</strong> Será enviada em email separado em até 24h</li>
                        <li><strong>Configure seu perfil:</strong> Informe seu concurso e preferências</li>
                        <li><strong>Comece a estudar:</strong> A IA criará seu plano personalizado!</li>
                    </ol>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${accessUrl}" class="button">
                        <span class="emoji">🎯</span> ACESSAR O SISTEMA AGORA
                    </a>
                </div>
                
                <div class="warning-box">
                    <h3><span class="emoji">🛡️</span> Garantia de 7 Dias</h3>
                    <p>Lembre-se: você tem <strong>7 dias</strong> para testar o sistema. Se não gostar, devolvemos 100% do seu dinheiro, sem perguntas!</p>
                </div>
                
                <div class="details">
                    <h3><span class="emoji">📞</span> Precisa de Ajuda?</h3>
                    <ul>
                        <li><strong>WhatsApp:</strong> (69) 98437-2961</li>
                        <li><strong>Email:</strong> concursoturboia@gmail.com</li>
                        <li><strong>Horário:</strong> Segunda a Sexta, 9h às 16h</li>
                    </ul>
                </div>

                <div class="info-box">
                    <h3><span class="emoji">🎁</span> Bônus Inclusos</h3>
                    <ul style="padding-left: 20px;">
                        <li>✅ Acesso vitalício a atualizações</li>
                        <li>✅ Suporte prioritário via WhatsApp</li>
                        <li>✅ Materiais exclusivos de estudo</li>
                        <li>✅ Comunidade VIP de concurseiros</li>
                    </ul>
                </div>
            </div>
            
            <div class="footer">
                <p><strong>© 2024 Concurso Turbo IA</strong> - Todos os direitos reservados</p>
                <p>Este é um email automático. Para suporte, use os contatos acima.</p>
                <p style="margin-top: 10px;">
                    <small>Você está recebendo este email porque adquiriu nosso produto. 
                    Seus dados estão protegidos conforme nossa política de privacidade.</small>
                </p>
            </div>
        </div>
    </body>
    </html>
    `;

    const mailOptions = {
        from: `"Concurso Turbo IA 🚀" <${process.env.SMTP_USER}>`,
        to: email,
        subject: `🎉 Compra Confirmada - Bem-vindo ao Concurso Turbo IA!`,
        html: htmlContent,
        text: `
Olá ${name}!

Sua compra foi confirmada com sucesso!

Detalhes:
- Plano: ${planText}
- Valor: R$ ${parseFloat(amount).toFixed(2).replace('.', ',')}
- Transação: #${transaction_id}

Próximos passos:
1. Aguarde o email com seus dados de acesso (até 24h)
2. Faça login no sistema: ${accessUrl}
3. Configure seu perfil e comece a estudar!

Suporte: (69) 98437-2961
Email: concursoturboia@gmail.com

Garantia de 7 dias - 100% do dinheiro de volta!

Concurso Turbo IA
        `
    };

    try {
        const result = await transporter.sendMail(mailOptions);
        console.log('✅ Confirmation email sent successfully:', {
            messageId: result.messageId,
            to: email,
            subject: mailOptions.subject
        });
        return result;
    } catch (error) {
        console.error('❌ Email sending failed:', {
            error: error.message,
            to: email,
            smtp_user: process.env.SMTP_USER ? 'configured' : 'missing',
            smtp_pass: process.env.SMTP_PASS ? 'configured' : 'missing'
        });
        throw error;
    }
}

// Send access credentials
async function sendAccessCredentials(data) {
    const { email, name, password, login_url } = data;
    
    if (!transporter) {
        throw new Error('Email service not configured');
    }
    
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Seus Dados de Acesso - Concurso Turbo IA</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 0 auto; background: white; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; }
            .content { padding: 40px 30px; }
            .credentials-box { background: #fff3cd; border: 2px solid #ffc107; padding: 25px; border-radius: 10px; margin: 20px 0; text-align: center; }
            .credentials-box h3 { color: #856404; margin-bottom: 20px; }
            .credential-item { background: white; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #ffc107; }
            .button { display: inline-block; background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
            .warning { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; padding: 20px; border-radius: 5px; margin: 20px 0; }
            .footer { background: #6c757d; color: white; padding: 20px; text-align: center; font-size: 12px; }
            .emoji { font-size: 20px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="emoji">🔑</div>
                <h1>Seus Dados de Acesso</h1>
                <p>Concurso Turbo IA</p>
            </div>
            
            <div class="content">
                <p>Olá <strong>${name}</strong>,</p>
                <p>Aqui estão seus dados de acesso ao sistema:</p>
                
                <div class="credentials-box">
                    <h3><span class="emoji">🔐</span> Dados de Login</h3>
                    
                    <div class="credential-item">
                        <strong>Email:</strong> ${email}
                    </div>
                    
                    <div class="credential-item">
                        <strong>Senha Temporária:</strong> ${password}
                    </div>
                    
                    <div class="credential-item">
                        <strong>URL de Acesso:</strong><br>
                        <a href="${login_url}" style="color: #007bff;">${login_url}</a>
                    </div>
                </div>
                
                <div style="text-align: center;">
                    <a href="${login_url}" class="button">
                        <span class="emoji">🚀</span> FAZER LOGIN AGORA
                    </a>
                </div>
                
                <div class="warning">
                    <h4><span class="emoji">⚠️</span> Importante:</h4>
                    <ul style="padding-left: 20px; margin-top: 10px;">
                        <li><strong>Altere sua senha</strong> após o primeiro login</li>
                        <li><strong>Não compartilhe</strong> seus dados de acesso</li>
                        <li><strong>Guarde este email</strong> em local seguro</li>
                        <li><strong>Em caso de problemas,</strong> entre em contato conosco</li>
                    </ul>
                </div>

                <div style="background: #e3f2fd; padding: 20px; border-radius: 5px; margin: 20px 0;">
                    <h4><span class="emoji">📞</span> Suporte Técnico:</h4>
                    <p><strong>WhatsApp:</strong> (69) 98437-2961</p>
                    <p><strong>Email:</strong> concursoturboia@gmail.com</p>
                    <p><strong>Horário:</strong> Segunda a Sexta, 9h às 16h</p>
                </div>
            </div>
            
            <div class="footer">
                <p><strong>© 2024 Concurso Turbo IA</strong> - Todos os direitos reservados</p>
                <p>Este é um email automático. Para suporte, use os contatos acima.</p>
            </div>
        </div>
    </body>
    </html>
    `;

    const mailOptions = {
        from: `"Concurso Turbo IA 🔑" <${process.env.SMTP_USER}>`,
        to: email,
        subject: `🔑 Seus Dados de Acesso - Concurso Turbo IA`,
        html: htmlContent,
        text: `
Olá ${name}!

Aqui estão seus dados de acesso:

Email: ${email}
Senha: ${password}
URL: ${login_url}

IMPORTANTE:
- Altere sua senha após o primeiro login
- Não compartilhe seus dados de acesso
- Guarde este email em local seguro

Suporte: (69) 98437-2961
Email: concursoturboia@gmail.com

Concurso Turbo IA
        `
    };

    try {
        const result = await transporter.sendMail(mailOptions);
        console.log('✅ Access credentials email sent successfully:', {
            messageId: result.messageId,
            to: email
        });
        return result;
    } catch (error) {
        console.error('❌ Access credentials email sending failed:', error);
        throw error;
    }
}

// Test email function
async function sendTestEmail(to) {
    if (!transporter) {
        throw new Error('Email service not configured');
    }

    const mailOptions = {
        from: `"Concurso Turbo IA Test 🧪" <${process.env.SMTP_USER}>`,
        to: to,
        subject: '🧪 Teste de Email - Concurso Turbo IA',
        html: `
        <h2>✅ Email funcionando perfeitamente!</h2>
        <p>Este é um email de teste do sistema Concurso Turbo IA.</p>
        <p><strong>Data/Hora:</strong> ${new Date().toLocaleString('pt-BR')}</p>
        <p><strong>Servidor:</strong> ${process.env.SMTP_HOST}</p>
        <p><strong>Usuário:</strong> ${process.env.SMTP_USER}</p>
        `,
        text: `
Email de teste - Concurso Turbo IA
Data/Hora: ${new Date().toLocaleString('pt-BR')}
Sistema funcionando corretamente!
        `
    };

    try {
        const result = await transporter.sendMail(mailOptions);
        console.log('✅ Test email sent successfully:', result.messageId);
        return result;
    } catch (error) {
        console.error('❌ Test email failed:', error);
        throw error;
    }
}

module.exports = {
    sendConfirmationEmail,
    sendAccessCredentials,
    sendTestEmail,
    verifyEmailConfig
};
