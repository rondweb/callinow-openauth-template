/**
 * Script para verificar o status das configurações do Mailjet
 * e histórico de envios
 */

import { config } from 'dotenv';
config();

async function checkMailjetStatus() {
  const MAILJET_API_KEY = process.env.MAILJET_API_KEY;
  const MAILJET_SECRET_KEY = process.env.MAILJET_SECRET_KEY;
  const EMAIL_FROM_EMAIL = process.env.EMAIL_FROM_EMAIL || 'noreply@callinow.com';

  console.log('🔍 Verificando configurações do Mailjet...\n');

  if (!MAILJET_API_KEY || !MAILJET_SECRET_KEY) {
    console.error('❌ ERRO: Credenciais do Mailjet não configuradas');
    process.exit(1);
  }

  const credentials = Buffer.from(`${MAILJET_API_KEY}:${MAILJET_SECRET_KEY}`).toString('base64');

  // 1. Verificar senders validados
  console.log('📧 Verificando emails/domínios validados...\n');
  
  try {
    const sendersResponse = await fetch('https://api.mailjet.com/v3/REST/sender', {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${credentials}`,
      },
    });

    if (sendersResponse.ok) {
      const sendersData = await sendersResponse.json() as any;
      
      if (sendersData.Data && sendersData.Data.length > 0) {
        console.log('✅ Emails/Domínios registrados no Mailjet:\n');
        
        sendersData.Data.forEach((sender: any) => {
          const status = sender.Status === 'Active' ? '✅ ATIVO' : '⚠️ ' + sender.Status;
          const emailStatus = sender.EmailType === 'bulk' ? '(Email em massa)' : '(Email transacional)';
          
          console.log(`   ${status} - ${sender.Email} ${emailStatus}`);
          console.log(`      Nome: ${sender.Name || 'N/A'}`);
          console.log(`      Status: ${sender.Status}`);
          
          if (sender.Email === EMAIL_FROM_EMAIL || sender.Email.includes(EMAIL_FROM_EMAIL.split('@')[1])) {
            console.log(`      🎯 Este é o email/domínio configurado!`);
          }
          console.log('');
        });

        // Verificar se o email configurado está na lista
        const isConfigured = sendersData.Data.some((sender: any) => 
          sender.Email === EMAIL_FROM_EMAIL || sender.Email.includes(EMAIL_FROM_EMAIL.split('@')[1])
        );

        if (!isConfigured) {
          console.log('⚠️  PROBLEMA ENCONTRADO:');
          console.log(`   O email "${EMAIL_FROM_EMAIL}" NÃO está registrado no Mailjet!`);
          console.log('');
          console.log('   📝 SOLUÇÃO:');
          console.log('   1. Acesse: https://app.mailjet.com/account/sender');
          console.log(`   2. Adicione o email: ${EMAIL_FROM_EMAIL}`);
          console.log(`   3. OU adicione o domínio: ${EMAIL_FROM_EMAIL.split('@')[1]}`);
          console.log('   4. Confirme a verificação via email ou DNS');
          console.log('');
        }
      } else {
        console.log('⚠️  Nenhum email/domínio registrado no Mailjet!');
        console.log('');
        console.log('   📝 SOLUÇÃO:');
        console.log('   1. Acesse: https://app.mailjet.com/account/sender');
        console.log(`   2. Adicione o email: ${EMAIL_FROM_EMAIL}`);
        console.log(`   3. OU adicione o domínio: ${EMAIL_FROM_EMAIL.split('@')[1]}`);
        console.log('');
      }
    }
  } catch (error) {
    console.error('❌ Erro ao verificar senders:', error);
  }

  // 2. Verificar mensagens recentes
  console.log('\n📨 Verificando histórico de envios (últimas 10 mensagens)...\n');
  
  try {
    const messagesResponse = await fetch('https://api.mailjet.com/v3/REST/message?Limit=10', {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${credentials}`,
      },
    });

    if (messagesResponse.ok) {
      const messagesData = await messagesResponse.json() as any;
      
      if (messagesData.Data && messagesData.Data.length > 0) {
        console.log('📋 Últimas mensagens:\n');
        
        messagesData.Data.forEach((message: any, index: number) => {
          const date = new Date(message.ArrivedAt).toLocaleString('pt-BR');
          const status = message.Status === 'sent' ? '✅ Enviado' : 
                        message.Status === 'opened' ? '📖 Aberto' :
                        message.Status === 'clicked' ? '🖱️ Clicado' :
                        message.Status === 'blocked' ? '🚫 Bloqueado' :
                        message.Status === 'bounce' ? '⚠️ Retornou (bounce)' :
                        message.Status === 'spam' ? '⚠️ Marcado como spam' :
                        '❓ ' + message.Status;
          
          console.log(`   ${index + 1}. ${status}`);
          console.log(`      Para: ${message.DestinationEmail || 'N/A'}`);
          console.log(`      De: ${message.SenderEmail || 'N/A'}`);
          console.log(`      Data: ${date}`);
          console.log(`      Status: ${message.Status}`);
          
          if (message.Status === 'blocked') {
            console.log(`      ⚠️  MOTIVO DO BLOQUEIO: Provavelmente sender não verificado`);
          }
          
          console.log('');
        });
      } else {
        console.log('📭 Nenhuma mensagem enviada ainda.');
        console.log('');
      }
    }
  } catch (error) {
    console.error('❌ Erro ao verificar mensagens:', error);
  }

  // 3. Verificar estatísticas da conta
  console.log('\n📊 Verificando estatísticas da conta...\n');
  
  try {
    const statsResponse = await fetch('https://api.mailjet.com/v3/REST/statcounters?CounterSource=APIKey&CounterTiming=Message&CounterResolution=Lifetime', {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${credentials}`,
      },
    });

    if (statsResponse.ok) {
      const statsData = await statsResponse.json() as any;
      
      if (statsData.Data && statsData.Data.length > 0) {
        const stats = statsData.Data[0];
        console.log('📈 Estatísticas da conta:');
        console.log(`   Total enviado: ${stats.MessageSentCount || 0}`);
        console.log(`   Entregas bem-sucedidas: ${stats.MessageDeliveredCount || 0}`);
        console.log(`   Bloqueados: ${stats.MessageBlockedCount || 0}`);
        console.log(`   Bounces: ${stats.MessageHardBouncedCount + stats.MessageSoftBouncedCount || 0}`);
        console.log(`   Spam complaints: ${stats.MessageSpamCount || 0}`);
        console.log('');
        
        if (stats.MessageBlockedCount > 0) {
          console.log('⚠️  ATENÇÃO: Há mensagens bloqueadas!');
          console.log('   Isso geralmente indica que o sender não está verificado.');
          console.log('');
        }
      }
    }
  } catch (error) {
    console.error('❌ Erro ao verificar estatísticas:', error);
  }

  // 4. Instruções finais
  console.log('\n💡 Próximos passos:\n');
  console.log('1. Verifique o email/domínio no Mailjet (instruções acima)');
  console.log('2. Após verificar, teste novamente com: npx tsx test-email.ts');
  console.log('3. Verifique sua pasta de SPAM/Lixo Eletrônico');
  console.log('4. Adicione noreply@callinow.com aos seus contatos');
  console.log('');
  console.log('📚 Mais informações:');
  console.log('   - Dashboard Mailjet: https://app.mailjet.com');
  console.log('   - Senders: https://app.mailjet.com/account/sender');
  console.log('   - Estatísticas: https://app.mailjet.com/stats');
  console.log('');
}

checkMailjetStatus().catch(console.error);
