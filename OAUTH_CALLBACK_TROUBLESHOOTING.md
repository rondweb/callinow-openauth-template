# OAuth Callback Error: "Authorization code not found"

## Problem Description

When attempting to authenticate (login/signup/password reset), the OAuth flow fails at the callback stage with the error:
```
Authorization code not found
```

This error occurs in `callback.tsx:406`, which is part of the OpenAuth UI library, not your application code.

## Root Causes

### 1. **URL Inconsistency (Most Common)**
The OAuth flow requires that the callback URL matches exactly with the authorization request URL.

**Problem:** Mixing `localhost` and `127.0.0.1`
- Initial request: `http://localhost:8787/authorize`
- Callback redirect: `http://127.0.0.1:8787/callback`

**Solution:** Pick ONE and stick with it throughout the session:
- ✅ Use `http://127.0.0.1:8787` (recommended for WSL)
- ❌ Don't switch between `localhost` and `127.0.0.1`

### 2. **Browser Cookie/Storage Issues**
OpenAuth uses browser storage (cookies/localStorage) to maintain OAuth state between the authorization request and callback.

**Symptoms:**
- Works in incognito mode but not regular browsing
- Error appears after switching tabs/windows
- Third-party cookies are blocked

**Solutions:**
- Clear browser cache and cookies for `http://127.0.0.1:8787`
- Check browser settings: Allow cookies for this site
- Disable strict tracking prevention for development
- Try a different browser

### 3. **Session Timeout**
OAuth states have expiration times stored in KV storage. If you take too long between steps, the state expires.

**Solution:**
- Complete the authentication flow quickly (within 5-10 minutes)
- Don't leave the verification code page open for extended periods
- If timeout occurs, start fresh from the homepage

### 4. **KV Storage Issues**
The authorization state is stored in Cloudflare KV (`AUTH_STORAGE`). If KV is unavailable or misconfigured, the state cannot be retrieved.

**Check:**
```powershell
# List all keys in KV storage
curl http://127.0.0.1:8787/debug/storage
```

### 5. **CORS/Network Issues**
If the browser can't complete the redirect properly due to network issues, the code parameter may be lost.

## Enhanced Debugging

I've added comprehensive logging and error pages to help diagnose the issue:

### 1. **Enhanced Callback Logging**
The `/callback` endpoint now logs:
- Full callback URL
- Authorization code presence
- State parameter
- Any error parameters
- All URL parameters

**To see logs:**
```powershell
# In WSL terminal running wrangler dev
# Logs will appear when callback is accessed
```

### 2. **Better Error Pages**
- ❌ If OAuth error parameter is present: Shows detailed error message
- ⚠️ If authorization code is missing: Shows troubleshooting guide
- ✅ If successful: Shows authentication details

### 3. **Debug Endpoints**
Access these to inspect system state:

```bash
# Check all registered users
curl http://127.0.0.1:8787/debug/users

# Check KV storage keys (OAuth states)
curl http://127.0.0.1:8787/debug/storage
```

## Step-by-Step Troubleshooting

### Step 1: Clean Slate
```powershell
# 1. Stop the dev server (Ctrl+C in WSL terminal)
# 2. Clear browser data for http://127.0.0.1:8787
#    - Open DevTools (F12)
#    - Application tab
#    - Clear storage
# 3. Close all browser tabs for this site
```

### Step 2: Restart Dev Server
```bash
# In WSL
cd /mnt/e/OTHER_PROJECTS/callinow-openauth-template
wrangler dev
```

### Step 3: Test Authentication Flow
1. Open browser to **exactly**: `http://127.0.0.1:8787`
   - ❌ NOT `http://localhost:8787`
   - ❌ NOT `http://127.0.0.1:8787/authorize`
   
2. Click "Create account" or "Login"

3. **For signup:**
   - Enter email
   - Receive code (check console: `[DEBUG] Verification code for...`)
   - Enter code
   - Set password
   - Should redirect to `/callback` with success

4. **For password reset:**
   - Enter email on login page
   - Click "Forgot password?"
   - Enter code from email
   - Set new password
   - Should redirect to `/callback` with success

### Step 4: Check Logs
If error occurs, check:

**Browser Console (F12):**
```
Look for errors from callback.tsx
Check Network tab for /callback request
```

**Terminal (WSL running wrangler dev):**
```
[CALLBACK] Received callback request
[CALLBACK] Full URL: ...
[CALLBACK] Code: null  ← Problem if null
[CALLBACK] State: ...
```

### Step 5: Verify KV Storage
```bash
curl http://127.0.0.1:8787/debug/storage
```

Should show keys like:
```json
{
  "count": 2,
  "keys": [
    {
      "name": "oauth:state:abc123...",
      "expiration": 1234567890
    }
  ]
}
```

## Quick Fixes

### Fix 1: Reset Everything
```bash
# Stop dev server
# Clear browser cache
# Restart dev server
npm run dev
```

### Fix 2: Use Incognito Mode
This bypasses cookie/cache issues:
1. Open incognito/private window
2. Go to `http://127.0.0.1:8787`
3. Test authentication

### Fix 3: Check Browser Settings
**Chrome/Edge:**
- Settings → Privacy → Cookies → Allow all cookies (for development)
- Settings → Privacy → Site Settings → `http://127.0.0.1:8787` → Allow cookies

**Firefox:**
- Options → Privacy → Standard (not Strict)
- Or add exception for `127.0.0.1`

## Understanding the OAuth Flow

### Normal Flow (What Should Happen)
```
1. User visits http://127.0.0.1:8787/
   ↓
2. Redirects to /authorize?redirect_uri=http://127.0.0.1:8787/callback&client_id=...
   ↓
3. OpenAuth shows login UI
   ↓
4. User enters credentials/code
   ↓
5. OpenAuth validates and creates OAuth state in KV
   ↓
6. Redirects to /callback?code=ABC123&state=XYZ789
   ↓
7. Your app exchanges code for token
   ↓
8. Success page displayed
```

### Broken Flow (What's Happening)
```
1. User visits http://localhost:8787/  ← localhost
   ↓
2. Redirects to /authorize with redirect_uri=http://localhost:8787/callback
   ↓
3. User completes authentication
   ↓
4. OpenAuth tries to redirect to http://127.0.0.1:8787/callback  ← Changed to 127.0.0.1!
   ↓
5. Browser sees different origin, loses state
   ↓
6. Code parameter missing or invalid
   ↓
❌ Error: "Authorization code not found"
```

## Production Considerations

When deploying to production, ensure:

1. **Consistent URLs:**
   - Use your production domain (e.g., `https://auth.callinow.com`)
   - Configure OAuth providers with exact callback URLs

2. **Cookie Settings:**
   - Use secure cookies (HTTPS)
   - Set appropriate `SameSite` attributes
   - Configure CORS properly

3. **Session Duration:**
   - Set appropriate TTL for OAuth states in KV
   - Default is usually 5-10 minutes

4. **Error Handling:**
   - Monitor OAuth errors in production logs
   - Provide user-friendly error messages
   - Have fallback authentication methods

## Still Having Issues?

1. **Check the terminal logs** while attempting authentication
2. **Check browser Network tab** (F12) for the `/callback` request
3. **Try the account reset** if you have an unverified account: `http://127.0.0.1:8787/auth/reset-unverified`
4. **Review the debug endpoints** to see system state

## Summary

The most common fix is:
1. Always use `http://127.0.0.1:8787` (not `localhost`)
2. Clear browser cache/cookies
3. Complete the flow quickly without interruption
4. Check that third-party cookies aren't blocked

Your authentication system is working correctly - this is almost always a browser state/cookie issue or URL inconsistency.
