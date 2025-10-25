# Callinow OpenAuth Template

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/rondweb/callinow-openauth-template)

Deploy an OpenAuth server on Cloudflare Workers with support for GitHub, Google, and Microsoft OAuth providers.

## Features

- 🔐 Password-based authentication
- 🐙 GitHub OAuth
- 🔵 Google OAuth
- 🟦 Microsoft OAuth
- 💾 Cloudflare D1 Database
- 🔑 Cloudflare KV Storage

## Setup

### 1. Clone and Install

```bash
git clone https://github.com/rondweb/callinow-openauth-template.git
cd callinow-openauth-template
npm install
```

### 2. Configure OAuth Providers

#### GitHub OAuth
1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Create a new OAuth App
3. Set Authorization callback URL to: `https://your-domain.com/callback`
4. Note your Client ID and Client Secret

#### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Go to Credentials and create OAuth 2.0 Client ID
5. Set Authorized redirect URIs to: `https://your-domain.com/callback`
6. Note your Client ID and Client Secret

#### Microsoft OAuth
1. Go to [Microsoft Azure Portal](https://portal.azure.com/)
2. Navigate to Azure Active Directory
3. Register a new application
4. Set Redirect URI to: `https://your-domain.com/callback`
5. Note your Application (client) ID and Client Secret

### 3. Environment Variables

Set the following environment variables in your Cloudflare Workers dashboard or wrangler.toml:

```toml
[vars]
GITHUB_CLIENT_ID = "your-github-client-id"
GITHUB_CLIENT_SECRET = "your-github-client-secret"
GOOGLE_CLIENT_ID = "your-google-client-id"
GOOGLE_CLIENT_SECRET = "your-google-client-secret"
MICROSOFT_CLIENT_ID = "your-microsoft-client-id"
MICROSOFT_CLIENT_SECRET = "your-microsoft-client-secret"
```

Alternatively, copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Then edit `.env` with your actual OAuth credentials.

### 4. Database and Storage Setup

1. Create a [D1 database](https://developers.cloudflare.com/d1/get-started/):
   ```bash
   npx wrangler d1 create AUTH_DB
   ```
   Update the `database_id` field in `wrangler.json` with the new database ID.

2. Run the database migration:
   ```bash
   npx wrangler d1 migrations apply --remote AUTH_DB
   ```

3. Create a [KV namespace](https://developers.cloudflare.com/kv/get-started/):
   ```bash
   npx wrangler kv namespace create AUTH_STORAGE
   ```
   Update the `kv_namespaces` -> `id` field in `wrangler.json` with the new namespace ID.

### 5. Deploy

```bash
npx wrangler deploy
```

### 6. Monitor

```bash
npx wrangler tail
```

## Testing

To test the authentication system locally:

1. Start the development server:
   ```bash
   npx wrangler dev
   ```

2. Open your browser and navigate to `http://localhost:8787`

3. Test the different authentication methods:
   - **Password**: Click "Sign up" or "Sign in" to test email/password authentication
   - **GitHub**: Click the GitHub button to test OAuth flow
   - **Google**: Click the Google button to test OAuth flow
   - **Microsoft**: Click the Microsoft button to test OAuth flow

4. Check the console logs for authentication events and user creation.

## Usage

The authentication system will redirect users through the OAuth flow and create user accounts automatically. After successful authentication, users will be redirected to the callback URL with their authentication tokens.

## API Endpoints

- `GET /` - Redirects to authorization page
- `GET /callback` - Handles OAuth callbacks and returns authentication results
- `POST /authorize` - Initiates the OAuth authorization flow

## Configuration Complete ✅

Your OpenAuth server is now configured with:

- ✅ Password-based authentication
- ✅ GitHub OAuth provider
- ✅ Google OAuth provider
- ✅ Microsoft OAuth provider
- ✅ Cloudflare D1 Database integration
- ✅ Cloudflare KV Storage integration
- ✅ Environment variables setup
- ✅ TypeScript configuration
- ✅ Database migrations ready
- ✅ Proper OAuth callback handling
- ✅ User email extraction from OAuth tokens

## Next Steps

1. **Set up your OAuth applications** following the instructions in the Setup section
2. **Configure environment variables** with your OAuth credentials
3. **Deploy to production** using `npx wrangler deploy`
4. **Test the authentication flows** in your browser

The system will automatically create user accounts when users authenticate through any of the configured providers.

## Troubleshooting

If you encounter issues with OAuth providers:

1. **Check your OAuth app configurations** - Ensure redirect URIs match exactly
2. **Verify environment variables** - Make sure all CLIENT_ID and CLIENT_SECRET values are set
3. **Check browser console** - Look for CORS or token-related errors
4. **Monitor worker logs** - Use `npx wrangler tail` to see authentication events
5. **Test individual providers** - Try each OAuth provider separately to isolate issues

## OAuth Flow

1. User visits your site and clicks an OAuth provider button
2. User is redirected to the provider's authorization page
3. User grants permission and is redirected back to `/callback`
4. OpenAuth processes the authorization code and exchanges it for tokens
5. User email is extracted from the OAuth response
6. User account is created in the database
7. User is redirected to the success page with authentication details

## Getting Started

Outside of this repo, you can start a new project with this template using [C3](https://developers.cloudflare.com/pages/get-started/c3/) (the `create-cloudflare` CLI):

```bash
npm create cloudflare@latest -- --template=cloudflare/templates/openauth-template
```

A live public deployment of this template is available at [https://openauth-template.templates.workers.dev](https://openauth-template.templates.workers.dev)

## Setup Steps

1. Install the project dependencies with a package manager of your choice:
   ```bash
   npm install
   ```
2. Create a [D1 database](https://developers.cloudflare.com/d1/get-started/) with the name "openauth-template-auth-db":
   ```bash
   npx wrangler d1 create openauth-template-auth-db
   ```
   ...and update the `database_id` field in `wrangler.json` with the new database ID.
3. Run the following db migration to initialize the database (notice the `migrations` directory in this project):
   ```bash
   npx wrangler d1 migrations apply --remote openauth-template-auth-db
   ```
4. Create a [kv namespace](https://developers.cloudflare.com/kv/get-started/) with a binding named "AUTH_STORAGE":
   ```bash
   npx wrangler kv namespace create AUTH_STORAGE
   ```
   ...and update the `kv_namespaces` -> `id` field in `wrangler.json` with the new namespace ID.
5. Deploy the project!
   ```bash
   npx wrangler deploy
   ```
6. And monitor your worker
   ```bash
   npx wrangler tail
   ```
