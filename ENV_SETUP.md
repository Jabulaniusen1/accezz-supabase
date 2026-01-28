# Environment Variables Setup

## Required Environment Variables

Add the following to your `.env` file:

### Supabase Variables (Required)
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### ZeptoMail SMTP Variables (Required for Email Functionality)
```env
ZEPTOMAIL_USER=emailapikey
ZEPTOMAIL_PASSWORD=your-zeptomail-api-password
ZEPTOMAIL_SENDER_EMAIL=noreply@accezzlive.com
ZEPTOMAIL_SENDER_NAME=Accezz
```

**Note:** See the [ZeptoMail Setup](#zeptomail-setup) section below for instructions on configuring ZeptoMail.

## How to Get Your Supabase Service Role Key

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **API**
4. Scroll down to **Project API keys**
5. Copy the **`service_role`** key (NOT the `anon` key)
   - ⚠️ **WARNING**: The service role key bypasses Row Level Security (RLS)
   - ⚠️ **Never expose this key** in client-side code or public repositories
   - ⚠️ **Only use it in server-side API routes** (like `/api/admin/users-emails`)

## Adding to Your .env File

1. Open your `.env` file in the project root
2. Add the service role key:
   ```env
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
3. Save the file
4. **Restart your Next.js development server** for the changes to take effect

## Security Notes

- The `SUPABASE_SERVICE_ROLE_KEY` is only used in server-side API routes
- It's required for admin operations to access `auth.users` table
- Keep this key secret and never commit it to version control
- Add `.env` to your `.gitignore` if it's not already there

## ZeptoMail Setup

To enable email sending (welcome emails and ticket emails), you need to configure ZeptoMail SMTP:

### Step 1: Get Your ZeptoMail Credentials

From your ZeptoMail dashboard, you should have:
- **Username:** `emailapikey` (standard for ZeptoMail)
- **Password:** Your ZeptoMail API password
- **Server:** `smtp.zeptomail.com`
- **Port:** `587` (TLS) or `465` (SSL)
- **Domain:** Your verified domain (e.g., `accezzlive.com`)

### Step 2: Add to .env File
```env
ZEPTOMAIL_USER=emailapikey
ZEPTOMAIL_PASSWORD=your-zeptomail-api-password
ZEPTOMAIL_SENDER_EMAIL=noreply@accezzlive.com
ZEPTOMAIL_SENDER_NAME=Accezz
```

**Example with your credentials:**
```env
ZEPTOMAIL_USER=emailapikey
ZEPTOMAIL_PASSWORD=wSsVR61/qUL1Bvh8zTf8IOlrywkAAV33R0V/jFqh4iP1T/mRocduxRKbDAKgHfkeQG5sQGQSprotmUxT0zVaiIwrm1sGCCiF9mqRe1U4J3x17qnvhDzKX21ZmhqPK4sBzwlun2JpFs8h+g==
ZEPTOMAIL_SENDER_EMAIL=noreply@accezzlive.com
ZEPTOMAIL_SENDER_NAME=Accezz
```

**Important Notes:**
- The username is always `emailapikey` for ZeptoMail
- Use your full ZeptoMail API password
- The sender email must be from your verified domain (accezzlive.com)
- Common sender emails: `noreply@accezzlive.com`, `support@accezzlive.com`, `info@accezzlive.com`
- Keep your API password secure and never commit it to version control
- Review your ZeptoMail plan limits and sending quotas

### ZeptoMail SMTP Settings

The application uses the following ZeptoMail SMTP configuration:
- **Host:** `smtp.zeptomail.com`
- **Port:** `587` (TLS) - recommended, or `465` (SSL) as alternative
- **Security:** TLS (STARTTLS) for port 587, SSL for port 465
- **Authentication:** Required
- **Username:** `emailapikey` (standard)

## Verify Setup

After adding the keys, restart your dev server and try accessing the admin dashboard again. The error should be resolved.

### Test Email Functionality
1. Sign up a new user - they should receive a welcome email
2. Purchase a ticket - the buyer should receive a ticket email with QR code
3. Check your server logs for any email-related errors

