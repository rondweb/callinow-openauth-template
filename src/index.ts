import { issuer } from "@openauthjs/openauth";
import { CloudflareStorage } from "@openauthjs/openauth/storage/cloudflare";
import { PasswordProvider } from "@openauthjs/openauth/provider/password";
import { PasswordUI } from "@openauthjs/openauth/ui/password";
import { GithubProvider } from "@openauthjs/openauth/provider/github";
import { GoogleProvider } from "@openauthjs/openauth/provider/google";
import { MicrosoftProvider } from "@openauthjs/openauth/provider/microsoft";
import { createSubjects } from "@openauthjs/openauth/subject";
import { object, string } from "valibot";

// This value should be shared between the OpenAuth server Worker and other
// client Workers that you connect to it, so the types and schema validation are
// consistent.
const subjects = createSubjects({
  user: object({
    id: string(),
  }),
});

// User information interface
interface UserInfo {
  email: string;
  name?: string;
  avatar_url?: string;
  provider: string;
  provider_id?: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);
    
    // Endpoint /userinfo - returns authenticated user information
    if (url.pathname === "/userinfo") {
      try {
        // Get user ID from query parameter (in real app, get from session/token)
        const userId = url.searchParams.get("user_id");
        if (!userId) {
          return new Response(JSON.stringify({ error: "user_id parameter required" }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }

        const user = await getUserInfo(env, userId);
        if (!user) {
          return new Response(JSON.stringify({ error: "User not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" }
          });
        }

        return new Response(JSON.stringify(user), {
          status: 200,
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    // This top section is just for demo purposes. In a real setup another
    // application would redirect the user to this Worker to be authenticated,
    // and after signing in or registering the user would be redirected back to
    // the application they came from. In our demo setup there is no other
    // application, so this Worker needs to do the initial redirect and handle
    // the callback redirect on completion.
    if (url.pathname === "/") {
      url.searchParams.set("redirect_uri", url.origin + "/callback");
      url.searchParams.set("client_id", "your-client-id");
      url.searchParams.set("response_type", "code");
      url.pathname = "/authorize";
      return Response.redirect(url.toString());
    } else if (url.pathname === "/callback") {
      // Handle successful authentication callback
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      
      return new Response(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Authentication Successful</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
            .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .success { color: #28a745; font-size: 24px; margin-bottom: 20px; }
            .info { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .params { text-align: left; }
            pre { background: #e9ecef; padding: 15px; border-radius: 4px; overflow-x: auto; font-size: 12px; }
            .button { display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 10px; }
            .button:hover { background: #0056b3; }
            .note { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; text-align: left; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="success">✅ Authentication Successful!</div>
            <div class="info">
              <h3>Authentication Details</h3>
              <div class="params">
                <p><strong>Authorization Code:</strong></p>
                <pre>${code || 'N/A'}</pre>
                <p><strong>State:</strong></p>
                <pre>${state || 'N/A'}</pre>
                <p><strong>All Parameters:</strong></p>
                <pre>${JSON.stringify(Object.fromEntries(url.searchParams.entries()), null, 2)}</pre>
              </div>
            </div>
            <div class="note">
              <p><strong>ℹ️ Next Steps for Onboarding:</strong></p>
              <p>In a real application, you would:</p>
              <ol style="text-align: left;">
                <li>Exchange the authorization code for an access token</li>
                <li>Extract the user_id from the token/session</li>
                <li>Call <code>GET /userinfo?user_id=YOUR_USER_ID</code> to get user profile</li>
                <li>Use the user information (name, email, avatar) for onboarding</li>
              </ol>
            </div>
            <a href="/" class="button">← Back to Home</a>
          </div>
        </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' }
      });
    }

    // The real OpenAuth server code starts here:
    return issuer({
      storage: CloudflareStorage({
        namespace: env.AUTH_STORAGE,
      }),
      subjects,
      providers: {
        password: PasswordProvider(
          PasswordUI({
            sendCode: async (email: string, code: string) => {
              // Send verification code via email using SMTP or email service
              try {
                await sendVerificationEmail(env, email, code);
                console.log(`✅ Verification code sent to ${email}`);
              } catch (error) {
                console.error(`❌ Failed to send email to ${email}:`, error);
                // Fallback: log the code (for development only)
                console.log(`Verification code for ${email}: ${code}`);
              }
            },
            copy: {
              input_code: "Código de Verificação (verifique seu email)",
            },
          }),
        ),
        github: GithubProvider({
          clientID: env.GITHUB_CLIENT_ID,
          clientSecret: env.GITHUB_CLIENT_SECRET,
          scopes: ["user:email"],
        }),
        google: GoogleProvider({
          clientID: env.GOOGLE_CLIENT_ID,
          clientSecret: env.GOOGLE_CLIENT_SECRET,
          scopes: ["openid", "email", "profile"],
        }),
        microsoft: MicrosoftProvider({
          tenant: env.MICROSOFT_CLIENT_ID,
          clientID: env.MICROSOFT_CLIENT_ID,
          clientSecret: env.MICROSOFT_CLIENT_SECRET,
          scopes: ["openid", "email", "profile"],
        }),
      },
      theme: {
        title: "CalliNow",
        primary: "#0051c3",
        favicon: "https://workers.cloudflare.com//favicon.ico",
        logo: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='60'%3E%3Ctext x='10' y='40' font-family='Arial, sans-serif' font-size='36' font-weight='bold' fill='%230051c3'%3ECalliNow%3C/text%3E%3C/svg%3E",
      },
      success: async (ctx: any, value: any) => {
        // Handle different provider response types
        let userInfo: UserInfo;

        if (value.provider === "password") {
          userInfo = {
            email: value.email,
            name: undefined,
            avatar_url: undefined,
            provider: "password",
            provider_id: value.email,
          };
        } else if (value.provider === "github") {
          // For GitHub, we need to fetch user info from GitHub API
          try {
            const userResponse = await fetch("https://api.github.com/user", {
              headers: {
                Authorization: `Bearer ${value.tokenset.access}`,
                "User-Agent": "OpenAuth-Template",
              },
            });
            const userData = await userResponse.json() as any;
            
            // Fetch emails if primary email is not public
            let email = userData.email;
            if (!email) {
              const emailsResponse = await fetch("https://api.github.com/user/emails", {
                headers: {
                  Authorization: `Bearer ${value.tokenset.access}`,
                  "User-Agent": "OpenAuth-Template",
                },
              });
              const emails = await emailsResponse.json() as any[];
              const primaryEmail = emails.find((e: any) => e.primary);
              email = primaryEmail ? primaryEmail.email : `github-${userData.id}@github.com`;
            }

            userInfo = {
              email,
              name: userData.name || userData.login,
              avatar_url: userData.avatar_url,
              provider: "github",
              provider_id: userData.id.toString(),
            };
            
            console.log("GitHub user data:", userData);
          } catch (error) {
            console.error("Failed to fetch GitHub user data:", error);
            userInfo = {
              email: `github-${value.clientID}@github.com`,
              name: undefined,
              avatar_url: undefined,
              provider: "github",
              provider_id: value.clientID,
            };
          }
        } else if (value.provider === "google") {
          // For Google, check the raw token data for ID token
          try {
            const rawToken = value.tokenset.raw;
            if (rawToken && rawToken.id_token) {
              const tokenParts = rawToken.id_token.split('.');
              const payload = JSON.parse(atob(tokenParts[1]));
              
              userInfo = {
                email: payload.email || `google-${payload.sub}@google.com`,
                name: payload.name,
                avatar_url: payload.picture,
                provider: "google",
                provider_id: payload.sub,
              };
              
              console.log("Google user data:", payload);
            } else {
              userInfo = {
                email: `google-${value.clientID}@google.com`,
                name: undefined,
                avatar_url: undefined,
                provider: "google",
                provider_id: value.clientID,
              };
            }
          } catch (error) {
            console.error("Failed to decode Google ID token:", error);
            userInfo = {
              email: `google-${value.clientID}@google.com`,
              name: undefined,
              avatar_url: undefined,
              provider: "google",
              provider_id: value.clientID,
            };
          }
        } else if (value.provider === "microsoft") {
          // For Microsoft, check the raw token data for ID token
          try {
            const rawToken = value.tokenset.raw;
            if (rawToken && rawToken.id_token) {
              const tokenParts = rawToken.id_token.split('.');
              const payload = JSON.parse(atob(tokenParts[1]));
              
              userInfo = {
                email: payload.preferred_username || payload.email || `microsoft-${payload.oid}@microsoft.com`,
                name: payload.name,
                avatar_url: undefined, // Microsoft doesn't provide avatar in ID token
                provider: "microsoft",
                provider_id: payload.oid,
              };
              
              console.log("Microsoft user data:", payload);
            } else {
              userInfo = {
                email: `microsoft-${value.clientID}@microsoft.com`,
                name: undefined,
                avatar_url: undefined,
                provider: "microsoft",
                provider_id: value.clientID,
              };
            }
          } catch (error) {
            console.error("Failed to decode Microsoft ID token:", error);
            userInfo = {
              email: `microsoft-${value.clientID}@microsoft.com`,
              name: undefined,
              avatar_url: undefined,
              provider: "microsoft",
              provider_id: value.clientID,
            };
          }
        } else {
          throw new Error(`Unknown provider: ${(value as any).provider}`);
        }

        console.log("Final user info to store:", userInfo);

        return ctx.subject("user", {
          id: await getOrCreateUser(env, userInfo),
        });
      },
    }).fetch(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;

async function getOrCreateUser(env: Env, userInfo: UserInfo): Promise<string> {
  const result = await env.AUTH_DB.prepare(
    `
    INSERT INTO user (email, name, avatar_url, provider, provider_id, updated_at)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT (email) DO UPDATE SET 
      name = excluded.name,
      avatar_url = excluded.avatar_url,
      provider = excluded.provider,
      provider_id = excluded.provider_id,
      updated_at = CURRENT_TIMESTAMP
    RETURNING id;
    `,
  )
    .bind(
      userInfo.email,
      userInfo.name || null,
      userInfo.avatar_url || null,
      userInfo.provider,
      userInfo.provider_id || null
    )
    .first<{ id: string }>();
  if (!result) {
    throw new Error(`Unable to process user: ${userInfo.email}`);
  }
  console.log(`Found or created user ${result.id} with email ${userInfo.email} and name ${userInfo.name}`);
  return result.id;
}

async function getUserInfo(env: Env, userId: string): Promise<any> {
  const user = await env.AUTH_DB.prepare(
    `
    SELECT id, email, name, avatar_url, provider, provider_id, created_at, updated_at
    FROM user
    WHERE id = ?
    `,
  )
    .bind(userId)
    .first();
  
  return user;
}

/**
 * Sends a verification email with the code using Mailjet API v3.1
 * Documentation: https://dev.mailjet.com/email/guides/send-api-v31/
 */
async function sendVerificationEmail(env: Env, email: string, code: string): Promise<void> {
  if (!env.MAILJET_API_KEY || !env.MAILJET_SECRET_KEY) {
    throw new Error('Mailjet credentials not configured. Please set MAILJET_API_KEY and MAILJET_SECRET_KEY in your environment variables.');
  }

  // Create Basic Authentication header (API_KEY:SECRET_KEY)
  const credentials = btoa(`${env.MAILJET_API_KEY}:${env.MAILJET_SECRET_KEY}`);
  
  const fromEmail = env.EMAIL_FROM_EMAIL || 'noreply@callinow.com';
  const fromName = env.EMAIL_FROM_NAME || 'CallNow';

  // Prepare the email payload according to Mailjet API v3.1
  const payload = {
    Messages: [
      {
        From: {
          Email: fromEmail,
          Name: fromName,
        },
        To: [
          {
            Email: email,
          },
        ],
        Subject: 'Seu Código de Verificação - CallNow',
        TextPart: `Olá,\n\nVocê solicitou um código de verificação para acessar sua conta CallNow.\n\nSeu código de verificação é: ${code}\n\nDigite este código na página de login para continuar.\n\nEste código expira em 10 minutos.\n\nSe você não solicitou este código, ignore este email.\n\n© ${new Date().getFullYear()} CallNow. Todos os direitos reservados.`,
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
                .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>🔐 Código de Verificação</h1>
                </div>
                <div class="content">
                  <p>Olá,</p>
                  <p>Você solicitou um código de verificação para acessar sua conta CallNow.</p>
                  <div class="code-box">
                    <div class="code">${code}</div>
                  </div>
                  <p>Digite este código na página de login para continuar.</p>
                  <p><strong>Este código expira em 10 minutos.</strong></p>
                  <p>Se você não solicitou este código, ignore este email.</p>
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

  // Send email via Mailjet API v3.1
  const response = await fetch('https://api.mailjet.com/v3.1/send', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('Mailjet API error:', errorData);
    throw new Error(`Failed to send email via Mailjet: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  console.log('Email sent successfully via Mailjet:', result);
}
