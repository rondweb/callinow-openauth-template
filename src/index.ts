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
            // eslint-disable-next-line @typescript-eslint/require-await
            sendCode: async (email: string, code: string) => {
              // This is where you would email the verification code to the
              // user, e.g. using Resend:
              // https://resend.com/docs/send-with-cloudflare-workers
              console.log(`Sending code ${code} to ${email}`);
            },
            copy: {
              input_code: "Code (check Worker logs)",
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
        title: "myAuth",
        primary: "#0051c3",
        favicon: "https://workers.cloudflare.com//favicon.ico",
        logo: {
          dark: "https://imagedelivery.net/wSMYJvS3Xw-n339CbDyDIA/db1e5c92-d3a6-4ea9-3e72-155844211f00/public",
          light:
            "https://imagedelivery.net/wSMYJvS3Xw-n339CbDyDIA/fa5a3023-7da9-466b-98a7-4ce01ee6c700/public",
        },
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
