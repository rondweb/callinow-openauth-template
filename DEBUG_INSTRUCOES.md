# Instruções de Debug - Problema com Usuário não encontrado

## Problema
O erro mostra que o usuário `user:6678bb402d2e0aff` não está sendo encontrado no banco de dados após login via GitHub.

## Verificações Necessárias

### 1. Verificar usuários no banco de dados local

Você tem um problema com o workerd instalado para Linux. Para corrigir:

```bash
# Limpar node_modules
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json

# Reinstalar dependências no Windows
npm install
```

### 2. Depois de reinstalar, verificar usuários no banco

```bash
# Consultar todos os usuários
npx wrangler d1 execute AUTH_DB --local --command="SELECT * FROM user;"

# Ou via endpoint debug (depois de rodar npm run dev)
# Abrir no navegador: http://localhost:8787/debug/users
```

### 3. Verificar se o ID do usuário está correto

O ID `user:6678bb402d2e0aff` parece ter o prefixo `user:` que pode estar causando problemas.

**Possível causa**: O OpenAuth pode estar retornando o subject no formato `user:ID`, mas estamos salvando apenas o ID no banco.

### 4. Logs a verificar

Quando você fizer login via GitHub novamente, verifique nos logs do terminal:

```
[getOrCreateUser] Attempting to create/update user: {...}
[getOrCreateUser] ✅ Successfully created/updated user ID: ...
[OAuth Success] User ID returned: ...
```

E quando tentar buscar o perfil:

```
[Profile] Fetching profile for user ID: "user:6678bb402d2e0aff"
[Profile] Sample users in DB: [...]
```

## Possível Solução

O problema pode estar no formato do ID. Temos duas opções:

### Opção 1: Remover prefixo "user:" ao buscar
Se o OpenAuth retorna `user:ID`, precisamos remover o prefixo antes de buscar no banco.

### Opção 2: Salvar com prefixo "user:"
Modificar a função `getOrCreateUser` para adicionar o prefixo `user:` ao ID retornado.

## Próximos Passos

1. Limpar e reinstalar node_modules (comando acima)
2. Rodar `npm run dev`
3. Fazer login via GitHub
4. Verificar logs no terminal
5. Acessar http://localhost:8787/debug/users para ver usuários salvos
6. Compartilhar os logs e resultado do debug/users
