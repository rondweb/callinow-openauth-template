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

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    // This top section is just for demo purposes. In a real setup another
    // application would redirect the user to this Worker to be authenticated,
    // and after signing in or registering the user would be redirected back to
    // the application they came from. In our demo setup there is no other
    // application, so this Worker needs to do the initial redirect and handle
    // the callback redirect on completion.
    const url = new URL(request.url);
    if (url.pathname === "/") {
      url.searchParams.set("redirect_uri", url.origin + "/callback");
      url.searchParams.set("client_id", "your-client-id");
      url.searchParams.set("response_type", "code");
      url.pathname = "/authorize";
      return Response.redirect(url.toString());
    } else if (url.pathname === "/callback") {
      // Handle successful authentication callback
      return new Response(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Authentication Successful</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .success { color: #28a745; font-size: 24px; margin-bottom: 20px; }
            .info { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .params { text-align: left; max-width: 600px; margin: 0 auto; }
            pre { background: #e9ecef; padding: 10px; border-radius: 4px; overflow-x: auto; }
          </style>
        </head>
        <body>
          <div class="success">✅ Authentication Successful!</div>
          <div class="info">
            <h3>Authentication Details</h3>
            <div class="params">
              <p><strong>URL Parameters:</strong></p>
              <pre>${url.searchParams.toString()}</pre>
              <p><strong>Parsed Parameters:</strong></p>
              <pre>${JSON.stringify(Object.fromEntries(url.searchParams.entries()), null, 2)}</pre>
            </div>
          </div>
          <p><a href="/">← Back to Home</a></p>
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
      success: async (ctx, value) => {
        // Handle different provider response types
        let email: string;

        if (value.provider === "password") {
          email = value.email;
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
            email = userData.email || `github-${userData.id}@github.com`;
          } catch (error) {
            console.error("Failed to fetch GitHub user data:", error);
            email = `github-${value.clientID}@github.com`;
          }
        } else if (value.provider === "google") {
          // For Google, check the raw token data for ID token
          try {
            const rawToken = value.tokenset.raw;
            if (rawToken && rawToken.id_token) {
              const tokenParts = rawToken.id_token.split('.');
              const payload = JSON.parse(atob(tokenParts[1]));
              email = payload.email || `google-${value.clientID}@google.com`;
            } else {
              email = `google-${value.clientID}@google.com`;
            }
          } catch (error) {
            console.error("Failed to decode Google ID token:", error);
            email = `google-${value.clientID}@google.com`;
          }
        } else if (value.provider === "microsoft") {
          // For Microsoft, check the raw token data for ID token
          try {
            const rawToken = value.tokenset.raw;
            if (rawToken && rawToken.id_token) {
              const tokenParts = rawToken.id_token.split('.');
              const payload = JSON.parse(atob(tokenParts[1]));
              email = payload.preferred_username || payload.email || `microsoft-${value.clientID}@microsoft.com`;
            } else {
              email = `microsoft-${value.clientID}@microsoft.com`;
            }
          } catch (error) {
            console.error("Failed to decode Microsoft ID token:", error);
            email = `microsoft-${value.clientID}@microsoft.com`;
          }
        } else {
          throw new Error(`Unknown provider: ${(value as any).provider}`);
        }

        return ctx.subject("user", {
          id: await getOrCreateUser(env, email),
        });
      },
    }).fetch(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;

async function getOrCreateUser(env: Env, email: string): Promise<string> {
  const result = await env.AUTH_DB.prepare(
    `
		INSERT INTO user (email)
		VALUES (?)
		ON CONFLICT (email) DO UPDATE SET email = email
		RETURNING id;
		`,
  )
    .bind(email)
    .first<{ id: string }>();
  if (!result) {
    throw new Error(`Unable to process user: ${email}`);
  }
  console.log(`Found or created user ${result.id} with email ${email}`);
  return result.id;
}
