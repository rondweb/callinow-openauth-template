# Configuração de Envio de Emails - CallNow

Este documento explica como configurar o envio de emails para recuperação de senha e códigos de verificação no CallNow OpenAuth Template usando **Mailjet API v3.1**.

## 📧 Por que Mailjet?

O CallNow utiliza o **Mailjet** como provedor de email por oferecer:

- ✅ API moderna e bem documentada (v3.1)
- ✅ Integração simples com Cloudflare Workers
- ✅ Excelentes taxas de entrega
- ✅ Painel de controle completo
- ✅ Plano gratuito generoso (até 6.000 emails/mês com até 200 emails/dia)
- ✅ Suporte a autenticação básica (API Key + Secret Key)

## 🚀 Configuração Rápida

### Passo 1: Criar conta no Mailjet

1. Acesse [mailjet.com](https://www.mailjet.com/) e crie uma conta gratuita
2. Verifique seu email
3. Complete o onboarding inicial

### Passo 2: Obter credenciais da API

1. Acesse o [painel de API Keys](https://app.mailjet.com/account/apikeys)
2. Copie o **API Key** (chave pública)
3. Copie o **Secret Key** (chave privada)

### Passo 3: Verificar email remetente

1. Vá para [Sender Domains & Addresses](https://app.mailjet.com/account/sender)
2. Adicione e verifique seu domínio ou email individual
3. Siga as instruções para configurar SPF/DKIM (opcional, mas recomendado)

### Passo 4: Configurar variáveis de ambiente

**Para desenvolvimento local (.env):**

```bash
# Copie o arquivo de exemplo
cp .env.example .env
```

Edite o arquivo `.env` e adicione suas credenciais:

```bash
MAILJET_API_KEY=sua-api-key-aqui
MAILJET_SECRET_KEY=sua-secret-key-aqui
EMAIL_FROM_EMAIL=noreply@seudominio.com
EMAIL_FROM_NAME=CallNow
```

Use o Wrangler CLI para adicionar secrets:

```bash
# Login no Cloudflare
npx wrangler login

# Adicione os secrets do Mailjet
npx wrangler secret put MAILJET_API_KEY
npx wrangler secret put MAILJET_SECRET_KEY
npx wrangler secret put EMAIL_FROM_EMAIL
npx wrangler secret put EMAIL_FROM_NAME
```

Ou configure pelo [Dashboard do Cloudflare](https://dash.cloudflare.com):

1. Vá para **Workers & Pages**
2. Selecione seu worker `callinow-openauth-template`
3. Clique em **Settings** > **Variables**
4. Adicione cada variável como **"Secret"** (não como variável de ambiente)

### Passo 5: Teste o envio

Execute o worker em desenvolvimento:

```bash
npm run dev
```

Acesse a página de login (`http://localhost:8787`) e tente fazer login com seu email. Você deve receber um código de verificação no email configurado.

## 📋 Template do Email

O sistema envia um email HTML formatado com o seguinte conteúdo:

- **Assunto:** Seu Código de Verificação - CallNow
- **Conteúdo:**
  - Cabeçalho com gradiente azul
  - Código de verificação em destaque
  - Instruções claras
  - Aviso de expiração (10 minutos)
  - Footer com copyright

### Exemplo visual:

```
┌─────────────────────────────┐
│    🔐 Código de Verificação  │  (fundo azul gradiente)
├─────────────────────────────┤
│                             │
│  Olá,                       │
│                             │
│  ┌─────────────────┐        │
│  │   123456        │        │  (código em destaque)
│  └─────────────────┘        │
│                             │
│  Digite este código...      │
│  Expira em 10 minutos       │
│                             │
└─────────────────────────────┘
```

## 🔧 Personalização

Para personalizar o template do email, edite a função `sendVerificationEmail` em `src/index.ts`:

```typescript
// Localize esta seção no código:
subject: 'Seu Código de Verificação - CallNow',
html: `
  <!DOCTYPE html>
  <html>
    <!-- Customize aqui -->
  </html>
`
```

## � Formato do Email

O sistema envia um email HTML formatado com o seguinte conteúdo:

- **Assunto:** Seu Código de Verificação - CallNow
- **Remetente:** Nome configurado em `EMAIL_FROM_NAME` <email configurado em `EMAIL_FROM_EMAIL`>
- **Conteúdo:**
  - Cabeçalho com gradiente azul (#0051c3 para #0066ff)
  - Código de verificação em destaque (fonte grande, azul, com espaçamento)
  - Instruções claras em português
  - Aviso de expiração (10 minutos)
  - Footer com copyright CallNow

O email também inclui uma versão em **texto puro** (TextPart) para clientes de email que não suportam HTML.

## 🧪 Testando a Integração

### Teste local com Wrangler Dev

```bash
# Inicie o servidor de desenvolvimento
npm run dev

# Em outro terminal, teste o endpoint
curl http://localhost:8787
```

### Teste direto da API Mailjet

Você pode testar a API do Mailjet diretamente:

```bash
curl -X POST \
  --user "SUA_API_KEY:SUA_SECRET_KEY" \
  https://api.mailjet.com/v3.1/send \
  -H 'Content-Type: application/json' \
  -d '{
    "Messages":[
      {
        "From": {
          "Email": "noreply@seudominio.com",
          "Name": "CallNow"
        },
        "To": [
          {
            "Email": "seu@email.com"
          }
        ],
        "Subject": "Teste de Email",
        "TextPart": "Este é um teste",
        "HTMLPart": "<h1>Este é um teste</h1>"
      }
    ]
  }'
```

## 🐛 Troubleshooting

### Email não está sendo enviado

**1. Verifique os logs do Worker:**

```bash
npx wrangler tail
```

Procure por mensagens de erro relacionadas ao Mailjet.

**2. Verifique se as variáveis estão configuradas:**

```bash
npx wrangler secret list
```

Você deve ver: `MAILJET_API_KEY`, `MAILJET_SECRET_KEY`, `EMAIL_FROM_EMAIL`, `EMAIL_FROM_NAME`

**3. Teste as credenciais:**

Use o comando curl acima para testar diretamente com a API do Mailjet.

**4. Verifique o status do Mailjet:**

Acesse [status.mailjet.com](https://status.mailjet.com) para ver se há alguma interrupção no serviço.

### Email vai para spam

1. **Verifique o email remetente:**
   - O email em `EMAIL_FROM_EMAIL` deve estar verificado no Mailjet
   - Acesse [Sender Domains & Addresses](https://app.mailjet.com/account/sender)

2. **Configure SPF, DKIM e DMARC:**
   - Acesse as [configurações de domínio](https://app.mailjet.com/account/sender) no Mailjet
   - Siga as instruções para adicionar registros DNS
   - Aguarde a propagação DNS (pode levar até 48 horas)

3. **Evite palavras de spam:**
   - Não use palavras como "grátis", "ganhe", "promoção" em excesso
   - Mantenha uma proporção saudável de texto e HTML

4. **Não use domínios gratuitos como remetente:**
   - Evite usar @gmail.com, @outlook.com, @yahoo.com como remetente
   - Use um domínio próprio verificado

### Erro: "Mailjet credentials not configured"

Certifique-se de que as seguintes variáveis estão configuradas:

- `MAILJET_API_KEY` (obrigatório)
- `MAILJET_SECRET_KEY` (obrigatório)
- `EMAIL_FROM_EMAIL` (opcional, padrão: noreply@callinow.com)
- `EMAIL_FROM_NAME` (opcional, padrão: CallNow)

### Erro HTTP 401 (Unauthorized)

Suas credenciais estão incorretas. Verifique:

1. API Key e Secret Key estão corretos
2. As chaves não foram revogadas no painel do Mailjet
3. A conta Mailjet está ativa

### Erro HTTP 403 (Forbidden)

O email remetente não está verificado:

1. Acesse [Sender Domains & Addresses](https://app.mailjet.com/account/sender)
2. Verifique o email ou domínio
3. Aguarde a aprovação (geralmente instantânea para emails individuais)

## 📊 Monitoramento no Mailjet

O Mailjet oferece um dashboard completo para monitorar seus emails:

### Estatísticas disponíveis

- **Emails enviados:** Total de mensagens processadas
- **Taxa de entrega:** Percentual de emails entregues com sucesso
- **Bounces:** Emails que retornaram (hard bounce e soft bounce)
- **Spam complaints:** Reclamações de spam
- **Aberturas:** Quantos destinatários abriram o email
- **Cliques:** Quantos clicaram em links (se tracking habilitado)

### Acessar o Dashboard

1. Faça login em [app.mailjet.com](https://app.mailjet.com)
2. Vá para **Statistics** no menu lateral
3. Visualize métricas em tempo real

### Logs detalhados

Para ver logs detalhados de cada email:

1. Acesse **Statistics** > **Message History**
2. Pesquise por email do destinatário ou ID da mensagem
3. Veja o status de entrega, aberturas, cliques, etc.

## 🔐 Segurança e Boas Práticas

### Proteção de Credenciais

**⚠️ CRÍTICO:**

1. **NUNCA faça commit das API keys** no Git
2. Use **Cloudflare Workers Secrets** para produção
3. Use **diferentes chaves** para desenvolvimento e produção
4. **Rotacione as chaves** periodicamente (a cada 3-6 meses)
5. **Monitore o uso** no dashboard do Mailjet

### Rate Limiting

Implemente rate limiting para prevenir abuso:

```typescript
// Exemplo: limitar a 5 emails por hora por IP
const RATE_LIMIT = 5;
const RATE_WINDOW = 3600; // 1 hora em segundos
```

### Validação de Email

Sempre valide o formato do email antes de enviar:

```typescript
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  throw new Error('Invalid email format');
}
```

## 💡 Dicas e Otimizações

### Performance

- **Use a API v3.1:** Mais rápida e eficiente que a v3
- **Envio em lote:** Para múltiplos emails, use o array Messages
- **Compressão:** Mailjet aceita gzip, economizando banda

### Personalização

- **Templates Mailjet:** Crie templates no dashboard para reutilização
- **Variáveis:** Use `{{var:nome}}` para personalização dinâmica
- **Linguagem de template:** Habilite com `TemplateLanguage: true`

### Deliverability (Taxa de Entrega)

- **Aqueça o IP:** Comece enviando poucos emails e aumente gradualmente
- **Limpe sua lista:** Remova emails inválidos regularmente
- **Monitore bounces:** Pare de enviar para emails que sempre bounceam
- **Permita unsubscribe:** Sempre inclua opção de descadastro

## 📚 Documentação e Recursos

### Documentação Oficial

- [Mailjet API v3.1 Guide](https://dev.mailjet.com/email/guides/send-api-v31/)
- [API Reference](https://dev.mailjet.com/email/reference/send-emails/)
- [Mailjet Templates](https://dev.mailjet.com/template-language/reference/)
- [Deliverability Best Practices](https://www.mailjet.com/blog/news/email-deliverability-best-practices/)

### Ferramentas Úteis

- [Mailjet Status Page](https://status.mailjet.com)
- [SPF Record Check](https://mxtoolbox.com/spf.aspx)
- [DKIM Validator](https://mxtoolbox.com/dkim.aspx)
- [Email Tester](https://www.mail-tester.com/)

### Cloudflare Workers

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Workers Secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
- [Workers KV](https://developers.cloudflare.com/kv/)

## 🆘 Suporte

### Problemas com a integração

1. **Verifique os logs:** `npx wrangler tail`
2. **Teste a API diretamente:** Use curl para testar
3. **Consulte a documentação:** Link acima
4. **Abra uma issue:** No repositório do projeto

### Suporte Mailjet

- **Email:** [help@mailjet.com](mailto:help@mailjet.com)
- **Chat:** Disponível no dashboard
- **Documentação:** [Mailjet Help Center](https://www.mailjet.com/support/)

### Comunidade

- [Mailjet Community](https://community.mailjet.com/)
- [Stack Overflow - Mailjet Tag](https://stackoverflow.com/questions/tagged/mailjet)
- [GitHub Issues](https://github.com/mailjet)

---

## 📝 Exemplo Completo de Código

Aqui está um exemplo completo de como a função `sendVerificationEmail` funciona:

```typescript
async function sendVerificationEmail(env: Env, email: string, code: string) {
  // Credenciais
  const credentials = btoa(`${env.MAILJET_API_KEY}:${env.MAILJET_SECRET_KEY}`);
  
  // Payload da API v3.1
  const payload = {
    Messages: [{
      From: {
        Email: env.EMAIL_FROM_EMAIL || 'noreply@callinow.com',
        Name: env.EMAIL_FROM_NAME || 'CallNow',
      },
      To: [{ Email: email }],
      Subject: 'Seu Código de Verificação - CallNow',
      TextPart: `Seu código: ${code}`,
      HTMLPart: `<h1>Seu código: ${code}</h1>`,
    }],
  };

  // Enviar via API
  const response = await fetch('https://api.mailjet.com/v3.1/send', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Mailjet error: ${response.status}`);
  }
}
```

---

**Última atualização:** Novembro 2025  
**Versão da API:** Mailjet v3.1  
**Compatibilidade:** Cloudflare Workers
