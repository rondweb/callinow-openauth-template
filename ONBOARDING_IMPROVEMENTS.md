# Melhorias de Onboarding - Extração de Informações do Usuário

## 🎯 Objetivo

Este projeto foi aprimorado para **extrair todas as informações disponíveis do usuário** durante o processo de autenticação via provedores OAuth (GitHub, Google, Microsoft), focando principalmente em **nome** e **email** para uso em processos de onboarding.

## 📋 Mudanças Implementadas

### 1. **Migração do Banco de Dados**
- **Arquivo**: `migrations/0002_add_user_profile_fields.sql`
- **Novos campos adicionados à tabela `user`**:
  - `name` - Nome completo do usuário
  - `avatar_url` - URL da foto de perfil
  - `provider` - Nome do provedor usado (github, google, microsoft, password)
  - `provider_id` - ID único do usuário no provedor
  - `updated_at` - Data da última atualização

### 2. **Extração de Dados por Provedor**

#### **GitHub** 🐙
Extrai automaticamente:
- ✅ **Email** (busca na API `/user` e `/user/emails` se necessário)
- ✅ **Nome completo** (ou username como fallback)
- ✅ **Avatar URL**
- ✅ **ID do GitHub**

```typescript
// Chamada adicional para buscar emails privados
const emailsResponse = await fetch("https://api.github.com/user/emails", {
  headers: {
    Authorization: `Bearer ${value.tokenset.access}`,
  },
});
```

#### **Google** 🔵
Extrai do ID Token:
- ✅ **Email**
- ✅ **Nome completo**
- ✅ **Avatar URL** (foto do perfil)
- ✅ **Sub (ID único)**

#### **Microsoft** 🟦
Extrai do ID Token:
- ✅ **Email** (preferred_username ou email)
- ✅ **Nome completo**
- ✅ **OID (ID único)**

### 3. **Novo Endpoint `/userinfo`**

**Endpoint**: `GET /userinfo?user_id={USER_ID}`

**Descrição**: Retorna todas as informações do usuário autenticado.

**Exemplo de Request**:
```bash
GET https://your-worker.workers.dev/userinfo?user_id=abc123def456
```

**Exemplo de Response**:
```json
{
  "id": "abc123def456",
  "email": "user@example.com",
  "name": "João Silva",
  "avatar_url": "https://avatars.githubusercontent.com/u/123456?v=4",
  "provider": "github",
  "provider_id": "123456",
  "created_at": "2025-11-02T10:30:00Z",
  "updated_at": "2025-11-02T10:30:00Z"
}
```

## 🚀 Como Usar

### 1. Aplicar a Migração

Para ambiente local (dev):
```bash
wrangler d1 migrations apply AUTH_DB --local
```

Para produção:
```bash
wrangler d1 migrations apply AUTH_DB --remote
```

### 2. Fluxo de Onboarding

```javascript
// 1. Usuário faz login via provedor
// 2. Após autenticação bem-sucedida, extrair user_id do token/sessão
const userId = extractUserIdFromToken(token);

// 3. Buscar informações completas do usuário
const response = await fetch(`https://your-worker.workers.dev/userinfo?user_id=${userId}`);
const userInfo = await response.json();

// 4. Usar as informações para onboarding
console.log(`Bem-vindo, ${userInfo.name}!`);
console.log(`Email: ${userInfo.email}`);
console.log(`Avatar: ${userInfo.avatar_url}`);

// 5. Exemplo: Criar perfil na sua aplicação
await createUserProfile({
  name: userInfo.name,
  email: userInfo.email,
  avatar: userInfo.avatar_url,
  externalId: userInfo.provider_id,
  provider: userInfo.provider
});
```

### 3. Testar Localmente

```bash
# Iniciar servidor de desenvolvimento
npm run dev

# Acessar no navegador
http://localhost:8787/

# Fazer login via GitHub/Google/Microsoft
# Após login, o user_id será criado/atualizado no banco

# Testar o endpoint (substitua pelo user_id real)
http://localhost:8787/userinfo?user_id=YOUR_USER_ID
```

## 📊 Dados Armazenados

| Campo | Tipo | Descrição | Origem |
|-------|------|-----------|--------|
| `id` | TEXT | ID único interno | Gerado automaticamente |
| `email` | TEXT | Email do usuário | API do provedor |
| `name` | TEXT | Nome completo | API do provedor |
| `avatar_url` | TEXT | URL da foto de perfil | API do provedor |
| `provider` | TEXT | Provedor de autenticação | Sistema |
| `provider_id` | TEXT | ID no provedor externo | API do provedor |
| `created_at` | TIMESTAMP | Data de criação | Sistema |
| `updated_at` | TIMESTAMP | Última atualização | Sistema |

## 🔐 Segurança

**⚠️ IMPORTANTE**: O endpoint `/userinfo` está simplificado para demonstração. Em produção, você deve:

1. **Autenticar as requisições**: Usar tokens JWT ou sessões
2. **Validar permissões**: Garantir que o usuário só acessa seus próprios dados
3. **Adicionar rate limiting**: Prevenir abuso
4. **Usar HTTPS**: Sempre em produção

Exemplo de implementação segura:
```typescript
if (url.pathname === "/userinfo") {
  // Extrair token do header
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");
  
  if (!token) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  
  // Validar token e extrair user_id
  const userId = await validateAndExtractUserId(token);
  
  // Retornar dados do usuário
  const user = await getUserInfo(env, userId);
  // ...
}
```

## 🎨 Casos de Uso para Onboarding

### 1. Formulário de Boas-vindas Pré-preenchido
```javascript
const userInfo = await fetchUserInfo(userId);

// Preencher formulário automaticamente
document.getElementById('name').value = userInfo.name;
document.getElementById('email').value = userInfo.email;
document.getElementById('avatar').src = userInfo.avatar_url;
```

### 2. Personalização da Experiência
```javascript
// Saudação personalizada
const greeting = `Olá, ${userInfo.name}! Seja bem-vindo(a).`;

// Mostrar avatar
<img src={userInfo.avatar_url} alt={userInfo.name} />
```

### 3. Vincular com Sistema Interno
```javascript
// Criar ou atualizar perfil no seu sistema
await database.upsert('profiles', {
  external_id: userInfo.id,
  provider: userInfo.provider,
  provider_id: userInfo.provider_id,
  email: userInfo.email,
  display_name: userInfo.name,
  profile_picture: userInfo.avatar_url,
  onboarding_completed: false
});
```

## 📝 Logs

O sistema agora registra informações detalhadas no console:

```
GitHub user data: { id: 123456, login: "user", name: "João Silva", ... }
Google user data: { sub: "...", email: "...", name: "...", picture: "..." }
Microsoft user data: { oid: "...", name: "...", preferred_username: "..." }
Final user info to store: { email: "...", name: "...", avatar_url: "...", ... }
Found or created user abc123 with email user@example.com and name João Silva
```

## 🧪 Testando com Diferentes Provedores

### GitHub
1. Certifique-se de ter os scopes corretos: `user:email`
2. Se o email for privado, o sistema busca automaticamente em `/user/emails`
3. O `name` pode ser null - neste caso usa o `login` (username)

### Google
1. Scopes necessários: `openid`, `email`, `profile`
2. Todas as informações vêm do ID Token
3. Inclui foto de perfil de alta qualidade

### Microsoft
1. Scopes necessários: `openid`, `email`, `profile`
2. Usa `preferred_username` como email principal
3. Avatar não está disponível no ID Token (retorna undefined)

## 🔄 Atualização de Dados

Os dados do usuário são **atualizados automaticamente** a cada novo login:

```sql
ON CONFLICT (email) DO UPDATE SET 
  name = excluded.name,
  avatar_url = excluded.avatar_url,
  provider = excluded.provider,
  provider_id = excluded.provider_id,
  updated_at = CURRENT_TIMESTAMP
```

Isso garante que se o usuário mudar o nome ou foto no provedor, a mudança seja refletida no próximo login.

## 📚 Próximos Passos

- [ ] Implementar autenticação JWT para o endpoint `/userinfo`
- [ ] Adicionar endpoint para atualizar informações do usuário
- [ ] Criar sistema de preferências de usuário
- [ ] Implementar webhook para sincronização de dados
- [ ] Adicionar suporte para mais provedores (Discord, Twitter, etc.)

---

**Criado em**: 02/11/2025  
**Versão**: 1.0.0
