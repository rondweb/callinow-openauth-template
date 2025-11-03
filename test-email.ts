/**
 * Script de teste para verificar o envio de email via Mailjet
 * Execute com: npx tsx test-email.ts
 */

// Carrega variáveis de ambiente do .env
import { config } from 'dotenv';
config();

async function testEmailSending() {
  const MAILJET_API_KEY = process.env.MAILJET_API_KEY;
  const MAILJET_SECRET_KEY = process.env.MAILJET_SECRET_KEY;
  const EMAIL_FROM_EMAIL = process.env.EMAIL_FROM_EMAIL || 'noreply@callinow.com';
  const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || 'CallNow';
  const TEST_EMAIL = process.env.TEST_EMAIL || 'seu-email@exemplo.com'; // Configure no .env

  console.log('🔍 Testando configuração de email...\n');
  console.log('Configuração:');
  console.log('- API Key:', MAILJET_API_KEY ? `${MAILJET_API_KEY.substring(0, 8)}...` : '❌ NÃO CONFIGURADO');
  console.log('- Secret Key:', MAILJET_SECRET_KEY ? `${MAILJET_SECRET_KEY.substring(0, 8)}...` : '❌ NÃO CONFIGURADO');
  console.log('- From Email:', EMAIL_FROM_EMAIL);
  console.log('- From Name:', EMAIL_FROM_NAME);
  console.log('- Test Email:', TEST_EMAIL);
  console.log('');

  if (!MAILJET_API_KEY || !MAILJET_SECRET_KEY) {
    console.error('❌ ERRO: MAILJET_API_KEY e MAILJET_SECRET_KEY devem estar configurados no arquivo .env');
    process.exit(1);
  }

  if (TEST_EMAIL === 'seu-email@exemplo.com') {
    console.warn('⚠️  AVISO: Configure TEST_EMAIL no arquivo .env com seu email real');
    console.log('   Adicione a linha: TEST_EMAIL=seu-email@dominio.com');
    console.log('');
  }

  // Código de verificação de teste
  const testCode = Math.floor(100000 + Math.random() * 900000).toString();

  // Create Basic Authentication header (API_KEY:SECRET_KEY)
  const credentials = Buffer.from(`${MAILJET_API_KEY}:${MAILJET_SECRET_KEY}`).toString('base64');
  
  // Prepare the email payload according to Mailjet API v3.1
  const payload = {
    Messages: [
      {
        From: {
          Email: EMAIL_FROM_EMAIL,
          Name: EMAIL_FROM_NAME,
        },
        To: [
          {
            Email: TEST_EMAIL,
          },
        ],
        Subject: '🧪 Teste - Seu Código de Verificação - CallNow',
        TextPart: `Olá,\n\nEste é um email de TESTE do sistema CallNow.\n\nSeu código de verificação de teste é: ${testCode}\n\nSe você recebeu este email, o sistema de envio está funcionando corretamente! ✅\n\n© ${new Date().getFullYear()} CallNow. Todos os direitos reservados.`,
        HTMLPart: `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #0051c3 0%, #0066ff 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                .code-box { background: white; border: 2px solid #0051c3; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
                .code { font-size: 32px; font-weight: bold; color: #0051c3; letter-spacing: 5px; }
                .test-badge { background: #ffc107; color: #000; padding: 5px 10px; border-radius: 5px; font-weight: bold; display: inline-block; margin-bottom: 10px; }
                .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <div class="test-badge">🧪 EMAIL DE TESTE</div>
                  <h1>🔐 Código de Verificação</h1>
                </div>
                <div class="content">
                  <p>Olá,</p>
                  <p>Este é um email de <strong>TESTE</strong> do sistema CallNow.</p>
                  <div class="code-box">
                    <div class="code">${testCode}</div>
                  </div>
                  <p>✅ Se você recebeu este email, o sistema de envio está funcionando corretamente!</p>
                  <p>Código de teste gerado em: ${new Date().toLocaleString('pt-BR')}</p>
                </div>
                <div class="footer">
                  <p>© ${new Date().getFullYear()} CallNow. Todos os direitos reservados.</p>
                </div>
              </div>
            </body>
          </html>
        `,
      },
    ],
  };

  console.log('📧 Enviando email de teste...');
  console.log('');

  try {
    // Send email via Mailjet API v3.1
    const response = await fetch('https://api.mailjet.com/v3.1/send', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    
    if (!response.ok) {
      console.error('❌ ERRO ao enviar email via Mailjet');
      console.error('Status:', response.status, response.statusText);
      console.error('Resposta:', responseText);
      console.log('');
      
      // Parse error response
      try {
        const errorData = JSON.parse(responseText);
        
        if (errorData.Messages && errorData.Messages[0] && errorData.Messages[0].Errors) {
          const errors = errorData.Messages[0].Errors;
          console.log('📋 Detalhes do erro:');
          errors.forEach((error: any) => {
            console.log(`   - ${error.ErrorCode}: ${error.ErrorMessage}`);
            
            // Specific error handling
            if (error.ErrorCode === 'send-0003') {
              console.log('');
              console.log('⚠️  SOLUÇÃO: O email remetente não está verificado no Mailjet!');
              console.log('');
              console.log('   Para corrigir:');
              console.log('   1. Acesse: https://app.mailjet.com/account/sender');
              console.log('   2. Adicione e verifique o email: ' + EMAIL_FROM_EMAIL);
              console.log('   3. Ou adicione e verifique o domínio: ' + EMAIL_FROM_EMAIL.split('@')[1]);
              console.log('   4. Siga as instruções para confirmar (email ou DNS)');
              console.log('');
            }
          });
        }
      } catch (e) {
        // Não foi possível parsear o erro
      }
      
      process.exit(1);
    }

    const result = JSON.parse(responseText);
    console.log('✅ Email enviado com sucesso!');
    console.log('');
    console.log('📊 Detalhes:');
    console.log('- Message ID:', result.Messages[0]?.To[0]?.MessageID);
    console.log('- Status:', result.Messages[0]?.Status);
    console.log('- Para:', TEST_EMAIL);
    console.log('- Código de teste:', testCode);
    console.log('');
    console.log('🎉 Verifique sua caixa de entrada (e spam) para confirmar o recebimento!');
    
  } catch (error) {
    console.error('❌ Erro inesperado:', error);
    process.exit(1);
  }
}

// Execute o teste
testEmailSending().catch(console.error);
