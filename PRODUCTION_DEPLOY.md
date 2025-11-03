# 🚀 Guia de Deploy para Produção - CallNow OpenAuth

## 📋 Checklist de Produção

### ✅ Passo 1: Configurar Secrets no Cloudflare

As variáveis do arquivo `.env` são apenas para desenvolvimento local. Para produção, você DEVE configurar secrets no Cloudflare.

#### Opção A: Via Wrangler CLI (Recomendado)

```bash
# 1. Login no Cloudflare (se ainda não fez)
npx wrangler login

# 2. Configure os secrets do Mailjet
npx wrangler secret put MAILJET_API_KEY
# Cole quando solicitar: 16b0caa64a5965193ab2973838c54854

npx wrangler secret put MAILJET_SECRET_KEY
# Cole quando solicitar: c43a175e0d5348663a95f2808b3dfda0

npx wrangler secret put EMAIL_FROM_EMAIL
# Cole quando solicitar: noreply@callinow.com (após reativar)
# OU temporariamente: info@callinow.tech

npx wrangler secret put EMAIL_FROM_NAME
# Cole quando solicitar: CallNow

# 3. Configure OAuth providers (se usar)
npx wrangler secret put GITHUB_CLIENT_ID
npx wrangler secret put GITHUB_CLIENT_SECRET

# Repita para Google e Microsoft se necessário
```

#### Opção B: Via Dashboard do Cloudflare

1. Acesse: https://dash.cloudflare.com
2. Vá em **Workers & Pages**
3. Selecione seu worker: `callinow-openauth-template`
4. Clique em **Settings** > **Variables**
5. Na seção **Environment Variables**, clique em **Add variable**
6. Para cada variável, selecione **"Encrypt"** (Secret) e adicione:

| Nome da Variável | Valor | Tipo |
|------------------|-------|------|
| `MAILJET_API_KEY` | `16b0caa64a5965193ab2973838c54854` | Secret |
| `MAILJET_SECRET_KEY` | `c43a175e0d5348663a95f2808b3dfda0` | Secret |
| `EMAIL_FROM_EMAIL` | `noreply@callinow.com` ou `info@callinow.tech` | Secret |
| `EMAIL_FROM_NAME` | `CallNow` | Secret |
| `GITHUB_CLIENT_ID` | (seu valor) | Secret |
| `GITHUB_CLIENT_SECRET` | (seu valor) | Secret |

7. Clique em **Save**

---

### ✅ Passo 2: Reativar noreply@callinow.com

**Por que?** É mais profissional usar `noreply@` para emails transacionais.

1. Acesse: https://app.mailjet.com/account/sender
2. Procure por `noreply@callinow.com` (Status: **Inactive**)
3. Clique em **"Revalidate"** ou **"Resend validation email"**
4. Abra o email de verificação enviado pela Mailjet
5. Clique no link de confirmação
6. Aguarde o status mudar para **Active** (✅)

**Após ativar**, atualize o secret no Cloudflare:

```bash
npx wrangler secret put EMAIL_FROM_EMAIL
# Digite: noreply@callinow.com
```

---

### ✅ Passo 3: Configurar SPF e DKIM (ALTAMENTE RECOMENDADO)

Isso melhora muito a taxa de entrega e evita que emails caiam no spam.

#### 3.1. SPF (Sender Policy Framework)

Adicione este registro TXT no DNS do domínio `callinow.com`:

```
Tipo: TXT
Nome: @ (ou callinow.com)
Valor: v=spf1 include:spf.mailjet.com ?all
```

#### 3.2. DKIM (DomainKeys Identified Mail)

1. Acesse: https://app.mailjet.com/account/sender
2. Clique no domínio `callinow.com` (ou adicione se não existir)
3. Copie os registros DNS DKIM fornecidos
4. Adicione no seu provedor DNS:

```
Tipo: TXT
Nome: mailjet._domainkey.callinow.com
Valor: (fornecido pelo Mailjet)
```

#### 3.3. DMARC (Opcional, mas recomendado)

```
Tipo: TXT
Nome: _dmarc.callinow.com
Valor: v=DMARC1; p=none; rua=mailto:dmarc@callinow.com
```

**Onde configurar DNS?**
- Se usa Cloudflare DNS: https://dash.cloudflare.com > DNS
- Outro provedor: Acesse o painel do seu registrador de domínio

---

### ✅ Passo 4: Testar em Produção

Depois de configurar os secrets:

```bash
# 1. Deploy para produção
npm run deploy

# 2. Acesse a URL de produção
# https://callinow-openauth-template.seu-subdominio.workers.dev

# 3. Teste o signup com seu email
# O código de verificação deve chegar
```

---

### ✅ Passo 5: Monitoramento

#### 5.1. Monitorar estatísticas do Mailjet

- Dashboard: https://app.mailjet.com/stats
- Verifique:
  - Taxa de entrega (delivery rate)
  - Emails bloqueados
  - Bounces
  - Spam complaints

#### 5.2. Logs do Cloudflare Workers

```bash
# Ver logs em tempo real
npx wrangler tail

# Ou acesse o dashboard:
# https://dash.cloudflare.com > Workers > callinow-openauth-template > Logs
```

---

## 🔐 Segurança

### ⚠️ IMPORTANTE: Nunca comite secrets

Verifique se o `.env` está no `.gitignore`:

```bash
# Verificar
cat .gitignore | grep -E "\.env$"
```

Se não estiver, adicione:

```bash
echo ".env" >> .gitignore
```

### 🔒 Rotacionar secrets periodicamente

A cada 3-6 meses, considere:
1. Gerar novas API Keys no Mailjet
2. Atualizar os secrets no Cloudflare
3. Regenerar Client IDs/Secrets do OAuth

---

## 📊 Diferenças: Desenvolvimento vs Produção

| Aspecto | Desenvolvimento (Local) | Produção (Cloudflare) |
|---------|------------------------|------------------------|
| Variáveis | Arquivo `.env` | Secrets do Cloudflare |
| Email remetente | Pode usar qualquer ativo | Use `noreply@callinow.com` |
| SPF/DKIM | Opcional | **Obrigatório** |
| Logs | Console local | Cloudflare Logs |
| URL | `localhost:8787` | `*.workers.dev` ou custom domain |

---

## 🎯 Resumo Rápido

Para ir para produção:

```bash
# 1. Configure secrets (escolha A ou B acima)
npx wrangler secret put MAILJET_API_KEY
npx wrangler secret put MAILJET_SECRET_KEY
npx wrangler secret put EMAIL_FROM_EMAIL
npx wrangler secret put EMAIL_FROM_NAME

# 2. Deploy
npm run deploy

# 3. Teste na URL de produção
```

**Depois:**
- ✅ Reative `noreply@callinow.com` no Mailjet
- ✅ Configure SPF/DKIM no DNS
- ✅ Monitore os logs e estatísticas

---

## 🆘 Troubleshooting em Produção

### Problema: "Email não chega em produção"

**Verificar:**
1. Secrets configurados? `npx wrangler secret list`
2. Email ativo no Mailjet? Verificar status
3. SPF/DKIM configurados? Testar em https://mxtoolbox.com
4. Logs do worker: `npx wrangler tail`

### Problema: "Emails caem no spam"

**Solução:**
1. Configure SPF e DKIM (obrigatório)
2. Adicione DMARC
3. Evite palavras suspeitas no assunto
4. Mantenha boa reputação (baixa taxa de bounce/spam)

---

## 📚 Links Úteis

- **Cloudflare Dashboard:** https://dash.cloudflare.com
- **Mailjet Dashboard:** https://app.mailjet.com
- **Mailjet Senders:** https://app.mailjet.com/account/sender
- **Wrangler Docs:** https://developers.cloudflare.com/workers/wrangler/
- **SPF/DKIM Checker:** https://mxtoolbox.com/SuperTool.aspx

---

**Data de criação:** 3 de novembro de 2025
**Última atualização:** Deploy inicial
