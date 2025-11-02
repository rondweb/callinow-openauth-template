# Script de Teste do Endpoint /userinfo

## Como testar

### 1. Primeiro, inicie o servidor de desenvolvimento:
```bash
npm run dev
```

### 2. Faça login através do navegador:
```
http://localhost:8787/
```

### 3. Após o login, verifique os logs do terminal para encontrar o user_id criado:
```
Found or created user abc123def456 with email user@example.com and name João Silva
```

### 4. Teste o endpoint /userinfo:

#### Via navegador:
```
http://localhost:8787/userinfo?user_id=abc123def456
```

#### Via curl (PowerShell):
```powershell
curl "http://localhost:8787/userinfo?user_id=abc123def456"
```

#### Via curl (formato JSON bonito):
```powershell
curl "http://localhost:8787/userinfo?user_id=abc123def456" | ConvertFrom-Json | ConvertTo-Json
```

#### Via Invoke-WebRequest (PowerShell):
```powershell
$response = Invoke-WebRequest -Uri "http://localhost:8787/userinfo?user_id=abc123def456"
$response.Content | ConvertFrom-Json | ConvertTo-Json
```

## Exemplos de Respostas

### Sucesso (200):
```json
{
  "id": "abc123def456",
  "email": "user@example.com",
  "name": "João Silva",
  "avatar_url": "https://avatars.githubusercontent.com/u/123456?v=4",
  "provider": "github",
  "provider_id": "123456",
  "created_at": "2025-11-02T10:30:00.000Z",
  "updated_at": "2025-11-02T10:30:00.000Z"
}
```

### Erro - user_id não fornecido (400):
```json
{
  "error": "user_id parameter required"
}
```

### Erro - Usuário não encontrado (404):
```json
{
  "error": "User not found"
}
```

## Testando com Postman

1. **Method**: GET
2. **URL**: `http://localhost:8787/userinfo`
3. **Query Params**:
   - Key: `user_id`
   - Value: `abc123def456` (substitua pelo ID real)

## Testando Diferentes Provedores

### GitHub:
1. Faça login via GitHub
2. Verifique que `provider` = "github"
3. Confirme que `name` e `avatar_url` foram preenchidos
4. Email pode vir de `/user` ou `/user/emails`

### Google:
1. Faça login via Google
2. Verifique que `provider` = "google"
3. Confirme que `name`, `email` e `avatar_url` (picture) foram preenchidos

### Microsoft:
1. Faça login via Microsoft
2. Verifique que `provider` = "microsoft"
3. Confirme que `name` e `email` foram preenchidos
4. Note que `avatar_url` será `null` (Microsoft não fornece no ID token)

## Verificando o Banco de Dados

### Local (dev):
```bash
wrangler d1 execute AUTH_DB --local --command "SELECT * FROM user"
```

### Produção:
```bash
wrangler d1 execute AUTH_DB --remote --command "SELECT * FROM user"
```

### Ver todos os campos de um usuário específico:
```bash
wrangler d1 execute AUTH_DB --local --command "SELECT * FROM user WHERE email = 'user@example.com'"
```

## Dicas de Debug

1. **Verifique os logs do Worker**: Todas as informações extraídas são logadas
2. **Use o Wrangler Dev**: Permite ver os logs em tempo real
3. **Teste cada provedor separadamente**: Para identificar problemas específicos
4. **Verifique os scopes**: Certifique-se que os scopes corretos estão configurados

## Próximos Passos de Integração

Depois de testar e confirmar que funciona, você pode integrar assim:

```javascript
// No seu frontend/aplicação
async function onUserLogin(authCode) {
  // 1. Trocar código por token (já feito pelo OpenAuth)
  // 2. Extrair user_id do token/sessão
  const userId = extractUserIdFromSession();
  
  // 3. Buscar informações do usuário
  const userInfo = await fetch(`/userinfo?user_id=${userId}`)
    .then(res => res.json());
  
  // 4. Usar para onboarding
  showWelcomeScreen({
    name: userInfo.name,
    email: userInfo.email,
    avatar: userInfo.avatar_url
  });
  
  // 5. Salvar no seu sistema
  await saveUserToDatabase(userInfo);
}
```
