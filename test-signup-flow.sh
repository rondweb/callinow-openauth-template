#!/bin/bash
# Script para testar o fluxo completo de signup com envio de email

echo "🧪 Testando Fluxo de Signup com Envio de Email"
echo "================================================"
echo ""

WORKER_URL="http://localhost:8787"
TEST_EMAIL="${TEST_EMAIL:-ronaldonelis@gmail.com}"

echo "📋 Configuração:"
echo "   Worker URL: $WORKER_URL"
echo "   Test Email: $TEST_EMAIL"
echo ""

# Verificar se o worker está rodando
echo "1️⃣ Verificando se o worker está ativo..."
if ! curl -s -f -o /dev/null "$WORKER_URL/"; then
    echo "   ❌ Worker não está respondendo em $WORKER_URL"
    echo "   Certifique-se de que 'npm run dev' está rodando"
    exit 1
fi
echo "   ✅ Worker está ativo!"
echo ""

# Verificar configuração das variáveis
echo "2️⃣ Verificando variáveis de ambiente no .dev.vars:"
echo "   MAILJET_API_KEY: $(grep MAILJET_API_KEY .dev.vars | cut -d'=' -f2 | cut -c1-8)..."
echo "   MAILJET_SECRET_KEY: $(grep MAILJET_SECRET_KEY .dev.vars | cut -d'=' -f2 | cut -c1-8)..."
echo "   EMAIL_FROM_EMAIL: $(grep EMAIL_FROM_EMAIL .dev.vars | cut -d'=' -f2)"
echo "   EMAIL_FROM_NAME: $(grep EMAIL_FROM_NAME .dev.vars | cut -d'=' -f2)"
echo ""

echo "3️⃣ Para testar o envio de email, você precisa:"
echo ""
echo "   📱 TESTE MANUAL (Recomendado):"
echo "   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   1. Abra o navegador em: $WORKER_URL"
echo "   2. Clique em 'Create account' ou 'Don't have an account?'"
echo "   3. Digite seu email: $TEST_EMAIL"
echo "   4. Clique em 'Continue'"
echo "   5. O sistema deve enviar um código de verificação"
echo "   6. Verifique seu email (e pasta de spam)"
echo "   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "   🔍 VERIFICAR LOGS:"
echo "   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   Quando você tentar fazer signup, observe o terminal onde"
echo "   'npm run dev' está rodando. Você deve ver:"
echo "   • '✅ Verification code sent to [seu-email]'"
echo "   • 'Email sent successfully via Mailjet'"
echo ""
echo "   Se aparecer algum erro, copie a mensagem completa."
echo "   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "🌐 Abrindo o navegador em: $WORKER_URL"
echo ""

# Tentar abrir o navegador automaticamente (funciona em WSL2)
if command -v wslview &> /dev/null; then
    wslview "$WORKER_URL" 2>/dev/null
elif command -v xdg-open &> /dev/null; then
    xdg-open "$WORKER_URL" 2>/dev/null
else
    echo "   ℹ️  Abra manualmente no seu navegador"
fi

echo "✅ Pronto para testar!"
echo ""
echo "💡 Dica: Mantenha este terminal aberto para ver as instruções"
echo "          e observe o terminal do 'npm run dev' para ver os logs"
