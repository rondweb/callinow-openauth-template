import { issuer } from "@openauthjs/openauth";
import { CloudflareStorage } from "@openauthjs/openauth/storage/cloudflare";
import { PasswordProvider } from "@openauthjs/openauth/provider/password";
import { PasswordUI } from "@openauthjs/openauth/ui/password";
import { GithubProvider } from "@openauthjs/openauth/provider/github";
import { GoogleProvider } from "@openauthjs/openauth/provider/google";
import { MicrosoftProvider } from "@openauthjs/openauth/provider/microsoft";
import { createSubjects } from "@openauthjs/openauth/subject";
import { object, string } from "valibot";
import { CustomCloudflareStorage } from "./custom-storage";

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
    
    // HTML page to help with unverified accounts
    if (url.pathname === "/auth/unverified-account-help" && request.method === "GET") {
      const email = url.searchParams.get('email');
      return new Response(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Unverified Account Help - CalliNow</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 20px;
            }
            .container {
              background: white;
              border-radius: 16px;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
              max-width: 500px;
              width: 100%;
              padding: 40px;
            }
            h1 { 
              color: #333;
              font-size: 28px;
              margin-bottom: 10px;
              text-align: center;
            }
            .subtitle {
              color: #666;
              text-align: center;
              margin-bottom: 30px;
              font-size: 14px;
              line-height: 1.6;
            }
            .info-box {
              background: #eef2ff;
              border-left: 4px solid #667eea;
              padding: 15px;
              margin-bottom: 20px;
              border-radius: 4px;
            }
            .info-text {
              color: #4338ca;
              font-size: 14px;
              line-height: 1.5;
            }
            label {
              display: block;
              color: #333;
              font-weight: 600;
              margin-bottom: 8px;
              font-size: 14px;
            }
            input[type="email"] {
              width: 100%;
              padding: 12px 16px;
              border: 2px solid #e0e0e0;
              border-radius: 8px;
              font-size: 16px;
              transition: all 0.3s;
              margin-bottom: 20px;
              background-color: #f8f9fa;
            }
            input[type="email"]:focus {
              outline: none;
              border-color: #667eea;
              box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
            }
            .button-group {
              display: flex;
              flex-direction: column;
              gap: 12px;
            }
            button {
              width: 100%;
              padding: 14px;
              border: none;
              border-radius: 8px;
              font-size: 16px;
              font-weight: 600;
              cursor: pointer;
              transition: transform 0.2s, box-shadow 0.2s;
            }
            button:hover:not(:disabled) {
              transform: translateY(-2px);
              box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
            }
            button:disabled {
              opacity: 0.6;
              cursor: not-allowed;
            }
            #resendBtn {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
            }
            #deleteBtn {
              background: #f8d7da;
              color: #721c24;
              border: 1px solid #f5c6cb;
            }
             #deleteBtn:hover:not(:disabled) {
              background: #f5c6cb;
            }
            .back-link {
              display: block;
              text-align: center;
              margin-top: 20px;
              color: #667eea;
              text-decoration: none;
              font-size: 14px;
            }
            .back-link:hover {
              text-decoration: underline;
            }
            .message {
              padding: 15px;
              border-radius: 8px;
              margin-bottom: 20px;
              font-size: 14px;
              line-height: 1.5;
            }
            .success {
              background: #d4edda;
              border-left: 4px solid #28a745;
              color: #155724;
            }
            .error {
              background: #f8d7da;
              border-left: 4px solid #dc3545;
              color: #721c24;
            }
            .hidden { display: none; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🤔 Unverified Account</h1>
            <p class="subtitle">
              It looks like an account was created with this email, but not verified.
              What would you like to do?
            </p>
            
            <div id="message" class="message hidden"></div>
            
            <form id="actionForm">
              <label for="email">Your Email</label>
              <input 
                type="email" 
                id="email" 
                name="email" 
                value="${email || ''}"
                placeholder="you@example.com"
                required
                readonly
              >
              
              <div class="button-group">
                <button type="button" id="resendBtn">
                  ✉️ Resend Verification Code
                </button>
                <button type="button" id="deleteBtn">
                  🗑️ Delete and Start Over
                </button>
              </div>
            </form>
            
            <a href="/" class="back-link">← Back to login</a>
          </div>
          
          <script>
            const form = document.getElementById('actionForm');
            const messageDiv = document.getElementById('message');
            const resendBtn = document.getElementById('resendBtn');
            const deleteBtn = document.getElementById('deleteBtn');
            const emailInput = document.getElementById('email');
            
            // Function to handle button/form state
            function setLoading(isLoading) {
              resendBtn.disabled = isLoading;
              deleteBtn.disabled = isLoading;
              resendBtn.textContent = isLoading ? 'Processing...' : '✉️ Resend Verification Code';
              deleteBtn.textContent = isLoading ? 'Deleting...' : '🗑️ Delete and Start Over';
            }

            // Action 1: Resend verification code (by redirecting to login)
            resendBtn.addEventListener('click', () => {
              const email = emailInput.value;
              if (!email) {
                messageDiv.className = 'message error';
                messageDiv.textContent = '❌ Please enter your email first.';
                return;
              }
              // Redirect to the login flow, which will trigger a new code
              const loginUrl = new URL('/', window.location.origin);
              loginUrl.searchParams.set('email', email); // Pre-fill email
              window.location.href = loginUrl.toString();
            });

            // Action 2: Delete the unverified account
            deleteBtn.addEventListener('click', async () => {
              const email = emailInput.value;
              if (!email) {
                messageDiv.className = 'message error';
                messageDiv.textContent = '❌ Please enter your email first.';
                return;
              }
              
              if (!confirm('Are you sure you want to delete this unverified account?')) {
                return;
              }

              setLoading(true);
              messageDiv.className = 'message hidden';
              
              try {
                const response = await fetch('/auth/reset-unverified', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email })
                });
                
                const data = await response.json();
                
                if (response.ok && data.success) {
                  messageDiv.className = 'message success';
                  messageDiv.textContent = '✅ ' + data.message + ' Redirecting to signup...';
                  setTimeout(() => {
                    window.location.href = '/'; // Redirect to start fresh
                  }, 3000);
                } else {
                  messageDiv.className = 'message error';
                  messageDiv.textContent = '❌ ' + (data.message || data.error || 'Unknown error');
                  setLoading(false);
                }
              } catch (error) {
                messageDiv.className = 'message error';
                messageDiv.textContent = '❌ Connection error. Please try again.';
                setLoading(false);
              }
            });
          </script>
        </body>
        </html>
      `, {
        headers: { "Content-Type": "text/html" }
      });
    }
    
    // Endpoint para limpar conta não verificada e permitir novo signup
    if (url.pathname === "/auth/reset-unverified" && request.method === "POST") {
      try {
        const body = await request.json() as { email: string };
        const email = body.email;
        
        if (!email) {
          return new Response(JSON.stringify({ error: "Email is required" }), {
            status: 400,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
          });
        }
        
        // Verificar se existe usuário com este email e provider password
        const existingUser = await env.AUTH_DB.prepare(
          `SELECT id, email, provider FROM user WHERE email = ? AND provider = 'password'`
        ).bind(email).first();
        
        if (existingUser) {
          // Deletar o usuário não verificado para permitir novo cadastro
          await env.AUTH_DB.prepare(
            `DELETE FROM user WHERE id = ? AND provider = 'password'`
          ).bind(existingUser.id).run();
          
          console.log(`✅ Unverified account removed for ${email}. User can try again.`);
          
          return new Response(JSON.stringify({ 
            success: true,
            message: "Previous account removed. You can create a new account now."
          }), {
            status: 200,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
          });
        } else {
          return new Response(JSON.stringify({ 
            success: false,
            message: "No account found with this email."
          }), {
            status: 404,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
          });
        }
      } catch (error) {
        console.error(`Error resetting unverified account:`, error);
        return new Response(JSON.stringify({ error: String(error) }), {
          status: 500,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }
    }
    
    // Debug endpoint to list all users
    if (url.pathname === "/debug/users") {
      try {
        const allUsers = await env.AUTH_DB.prepare(
          `SELECT id, email, name, provider, provider_id, created_at FROM user ORDER BY created_at DESC LIMIT 10`
        ).all();
        
        return new Response(JSON.stringify({
          count: allUsers.results?.length || 0,
          users: allUsers.results
        }, null, 2), {
          status: 200,
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        });
      } catch (error) {
        console.error(`Error listing users:`, error);
        return new Response(JSON.stringify({ error: String(error) }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
    
    // Debug endpoint to check KV storage
    if (url.pathname === "/debug/storage") {
      try {
        // List all keys in AUTH_STORAGE (KV)
        const listResult = await env.AUTH_STORAGE.list({ limit: 100 });
        
        // For debugging, we can show key names (but not values for security)
        const keys = listResult.keys.map(k => ({
          name: k.name,
          expiration: k.expiration,
          metadata: k.metadata
        }));
        
        return new Response(JSON.stringify({
          count: keys.length,
          keys: keys,
          list_complete: listResult.list_complete
        }, null, 2), {
          status: 200,
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        });
      } catch (error) {
        console.error(`Error listing KV storage:`, error);
        return new Response(JSON.stringify({ error: String(error) }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
    
    // Endpoint /auth/fetch-openauth-profile/:userId - returns authenticated user information
    const profileMatch = url.pathname.match(/^\/auth\/fetch-openauth-profile\/(.+)$/);
    if (profileMatch) {
      try {
        let userId = decodeURIComponent(profileMatch[1]);
        console.log(`[Profile] Raw user ID from URL: "${userId}"`);
        
        // Remove "user:" prefix if present (OpenAuth format)
        if (userId.startsWith('user:')) {
          userId = userId.substring(5); // Remove "user:" prefix
          console.log(`[Profile] Removed prefix, searching for: "${userId}"`);
        }

        // First, let's check what users exist in the database
        const allUsers = await env.AUTH_DB.prepare(
          `SELECT id, email FROM user LIMIT 5`
        ).all();
        console.log(`[Profile] Sample users in DB:`, JSON.stringify(allUsers.results));

        const user = await getUserInfo(env, userId);
        if (!user) {
          console.error(`[Profile] User not found: "${userId}"`);
          console.error(`[Profile] All users query returned: ${allUsers.results?.length || 0} users`);
          
          return new Response(JSON.stringify({ 
            error: "User not found in OpenAuth",
            detail: `No user found with ID: ${userId}`,
            debug: {
              requestedId: userId,
              totalUsersInDb: allUsers.results?.length || 0,
              sampleUsers: allUsers.results
            }
          }), {
            status: 404,
            headers: { 
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*"
            }
          });
        }

        console.log(`[Profile] ✅ User found:`, JSON.stringify(user));
        return new Response(JSON.stringify(user), {
          status: 200,
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        });
      } catch (error) {
        console.error(`[Profile] Error fetching user profile:`, error);
        return new Response(JSON.stringify({ 
          error: "Internal server error",
          detail: error instanceof Error ? error.message : String(error)
        }), {
          status: 500,
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        });
      }
    }
    
    // Endpoint /userinfo - returns authenticated user information (legacy endpoint)
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
      const error = url.searchParams.get("error");
      const errorDescription = url.searchParams.get("error_description");
      
      // Enhanced logging for debugging
      console.log(`[CALLBACK] Received callback request`);
      console.log(`[CALLBACK] Full URL: ${url.toString()}`);
      console.log(`[CALLBACK] Code: ${code}`);
      console.log(`[CALLBACK] State: ${state}`);
      console.log(`[CALLBACK] Error: ${error}`);
      console.log(`[CALLBACK] Error Description: ${errorDescription}`);
      console.log(`[CALLBACK] All params:`, Object.fromEntries(url.searchParams.entries()));
      
      // If there's an error, show it prominently
      if (error) {
        return new Response(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Authentication Error</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
              .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
              .error { color: #dc3545; font-size: 24px; margin-bottom: 20px; }
              .details { background: #f8d7da; color: #721c24; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: left; }
              pre { background: #f8f9fa; padding: 15px; border-radius: 4px; overflow-x: auto; font-size: 12px; }
              .button { display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 10px; }
              .button:hover { background: #0056b3; }
              .troubleshooting { background: #d1ecf1; color: #0c5460; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: left; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="error">❌ Authentication Failed</div>
              <div class="details">
                <h3>Error Details</h3>
                <p><strong>Error Code:</strong> ${error}</p>
                <p><strong>Description:</strong> ${errorDescription || 'No description provided'}</p>
              </div>
              <div class="troubleshooting">
                <h3>🔧 Troubleshooting Steps</h3>
                <ol>
                  <li><strong>URL Consistency:</strong> Make sure you're using the same URL (either <code>http://127.0.0.1:8787</code> or <code>http://localhost:8787</code>, not both)</li>
                  <li><strong>Browser Cache:</strong> Clear your browser cache and cookies for this site</li>
                  <li><strong>Cookie Settings:</strong> Check that third-party cookies are not blocked</li>
                  <li><strong>Session Timeout:</strong> If too much time passed between steps, the session may have expired</li>
                  <li><strong>Start Fresh:</strong> Try the authentication flow again from the beginning</li>
                </ol>
              </div>
              <a href="/" class="button">← Try Again</a>
            </div>
          </body>
          </html>
        `, {
          headers: { "Content-Type": "text/html" },
          status: 400
        });
      }
      
      // If no code, show a warning
      if (!code) {
        return new Response(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Missing Authorization Code</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
              .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
              .warning { color: #ffc107; font-size: 24px; margin-bottom: 20px; }
              .details { background: #fff3cd; color: #856404; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: left; }
              pre { background: #f8f9fa; padding: 15px; border-radius: 4px; overflow-x: auto; font-size: 12px; }
              .button { display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 10px; }
              .button:hover { background: #0056b3; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="warning">⚠️ Authorization Code Not Found</div>
              <div class="details">
                <h3>What Happened?</h3>
                <p>The authentication callback was received, but the authorization code is missing from the URL.</p>
                <p><strong>Received Parameters:</strong></p>
                <pre>${JSON.stringify(Object.fromEntries(url.searchParams.entries()), null, 2)}</pre>
                <h3>Common Causes:</h3>
                <ul>
                  <li>The authentication flow was interrupted</li>
                  <li>The session expired (took too long to complete)</li>
                  <li>URL mismatch (using localhost vs 127.0.0.1)</li>
                  <li>Browser blocking cookies/storage</li>
                </ul>
                <h3>Solution:</h3>
                <p>Start the authentication process again from the beginning.</p>
              </div>
              <a href="/" class="button">← Back to Login</a>
            </div>
          </body>
          </html>
        `, {
          headers: { "Content-Type": "text/html" },
          status: 400
        });
      }
      
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
      storage: CustomCloudflareStorage({
        namespace: env.AUTH_STORAGE,
      }),
      subjects,
      ...(env.PRIVATE_KEY ? { keys: { private: env.PRIVATE_KEY } } : {}),
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
                console.error(`Error details:`, error);
                
                // Log the code for debugging (helps in troubleshooting)
                console.log(`[DEBUG] Verification code for ${email}: ${code}`);
                
                // Re-throw with user-friendly message
                throw new Error('Failed to send verification email. Check your connection and try again. If the problem persists, contact support.');
              }
            },
            copy: {
              // Customização dos textos da interface
              input_email: "Email",
              input_code: "Verification Code",
              input_password: "Password",
              input_repeat: "Confirm Password",
              button_continue: "Continue",
              code_resend: "Resend verification code",
              code_return: "← Back to login",
              register: "Create account",
              register_prompt: "Don't have an account?",
              login: "Login",
              login_prompt: "Already have an account?",
              change_prompt: "Forgot password?",
              login_description: "Enter your email to receive a verification code",
              register_description: "Create a new account using your email",
              error_email_taken: `❌ This email is already registered but not verified. <a href="/auth/unverified-account-help?email={email}">Click here to resolve this issue.</a>`,
              error_invalid_code: "❌ Invalid code. Check your input or click 'Resend verification code'.",
              error_invalid_email: "❌ Invalid email. Check the format.",
              error_invalid_password: "❌ Password too weak. Use at least 8 characters.",
              error_password_mismatch: "❌ Passwords do not match. Please re-enter.",
              error_validation_error: "❌ Validation error. Check all fields.",
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
        
        console.log(`[SUCCESS HANDLER] Provider: ${value.provider}`);
        console.log(`[SUCCESS HANDLER] Value:`, JSON.stringify(value, null, 2));

        if (value.provider === "password") {
          userInfo = {
            email: value.email,
            name: undefined,
            avatar_url: undefined,
            provider: "password",
            provider_id: value.email,
          };
          console.log(`[SUCCESS HANDLER] Created password userInfo:`, userInfo);
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

        console.log("[OAuth Success] Final user info to store:", JSON.stringify(userInfo));

        const userId = await getOrCreateUser(env, userInfo);
        console.log(`[OAuth Success] User ID returned: ${userId}`);
        
        return ctx.subject("user", {
          id: userId,
        });
      },
    }).fetch(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;

async function getOrCreateUser(env: Env, userInfo: UserInfo): Promise<string> {
  console.log(`[getOrCreateUser] Attempting to create/update user:`, JSON.stringify(userInfo));
  
  try {
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
      console.error(`[getOrCreateUser] Failed to insert/update user: ${userInfo.email}`);
      throw new Error(`Unable to process user: ${userInfo.email}`);
    }
    
    console.log(`[getOrCreateUser] ✅ Successfully created/updated user ${result.id}:`, {
      id: result.id,
      email: userInfo.email,
      name: userInfo.name,
      provider: userInfo.provider,
      provider_id: userInfo.provider_id
    });
    
    // Verify the user was actually saved
    const verifyUser = await getUserInfo(env, result.id);
    console.log(`[getOrCreateUser] Verification query result:`, JSON.stringify(verifyUser));
    
    return result.id;
  } catch (error) {
    console.error(`[getOrCreateUser] Database error:`, error);
    throw error;
  }
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
        Subject: 'Your Verification Code - CallNow',
        TextPart: `Hello,\n\nYou requested a verification code to access your CallNow account.\n\nYour verification code is: ${code}\n\nEnter this code on the login page to continue.\n\nThis code expires in 10 minutes.\n\nIf you did not request this code, please ignore this email.\n\n© ${new Date().getFullYear()} CallNow. All rights reserved.`,
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
                  <h1>🔐 Verification Code</h1>
                </div>
                <div class="content">
                  <p>Hello,</p>
                  <p>You requested a verification code to access your CallNow account.</p>
                  <div class="code-box">
                    <div class="code">${code}</div>
                  </div>
                  <p>Enter this code on the login page to continue.</p>
                  <p><strong>This code expires in 10 minutes.</strong></p>
                  <p>If you did not request this code, please ignore this email.</p>
                </div>
                <div class="footer">
                  <p>© ${new Date().getFullYear()} CallNow. All rights reserved.</p>
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
    const errorBody = await response.text();
    console.error(`Mailjet API Error: Status ${response.status}`, errorBody);
    throw new Error(`Failed to send email via Mailjet: ${response.status} ${response.statusText}. Response: ${errorBody}`);
  }

  const result = await response.json();
  console.log('Email sent successfully via Mailjet:', result);
}
