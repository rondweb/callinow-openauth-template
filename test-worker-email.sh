#!/bin/bash
# Script para testar o envio de email no worker em desenvolvimento

echo "🧪 Testando envio de email no Worker DEV..."
echo ""

# Detectar a porta do wrangler dev
WORKER_URL="http://localhost:8787"

# Verificar se o worker está respondendo
echo "🔍 Verificando se o worker está ativo em $WORKER_URL..."
if ! curl -s -o /dev/null -w "%{http_code}" "$WORKER_URL/" | grep -q "30[0-9]"; then
    echo "❌ Worker não está respondendo em $WORKER_URL"
    echo "   Certifique-se de que 'npm run dev' está rodando"
    exit 1
fi
echo "✅ Worker está ativo!"
echo ""

# Simular o processo de signup que envia email
echo "📧 Iniciando processo de signup (isso deve enviar um email)..."
echo "   Email de teste: ${TEST_EMAIL:-ronaldonelis@gmail.com}"
echo ""

# Acessar a página de signup
echo "1️⃣ Acessando página de signup..."
curl -s -c cookies.txt -b cookies.txt "$WORKER_URL/" > /dev/null
echo "✅ Página carregada"
echo ""

echo "ℹ️  Agora você precisa:"
echo "   1. Abrir o navegador em: $WORKER_URL"
echo "   2. Fazer signup com seu email"
echo "   3. Verificar se recebeu o código de verificação"
echo ""
echo "💡 Para testar automaticamente, precisaríamos simular o fluxo OAuth completo,"
echo "   mas é mais simples testar manualmente no navegador."
echo ""
echo "🌐 Abra: $WORKER_URL"
echo ""

# Limpar cookies temporários
rm -f cookies.txt
