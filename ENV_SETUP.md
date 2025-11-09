# Environment Variables Setup

## Required Environment Variables

Add the following to your `.env` file:

### Supabase Variables (Required)
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### WhatsApp Purchase Bot (Required)
```env
NEXT_PUBLIC_WHATSAPP_BUSINESS_NUMBER=2348123456789
META_WHATSAPP_ACCESS_TOKEN=your_meta_permanent_access_token
META_PHONE_NUMBER_ID=your_meta_phone_number_id
META_WEBHOOK_VERIFY_TOKEN=your_custom_webhook_verify_token
```

Optional overrides:

```env
META_GRAPH_API_VERSION=v19.0              # defaults to v19.0
PAYSTACK_WHATSAPP_CALLBACK_URL=https://your-domain.com
```

### Paystack (Required for Payments)
```env
PAYSTACK_SECRET_KEY=sk_live_xxx
PAYSTACK_PUBLIC_KEY=pk_live_xxx
```

### Gmail SMTP Variables (Required for Email Functionality)
```env
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-16-character-app-password
GMAIL_SENDER_NAME=Accezz
```

**Note:** See the [Gmail App Password Setup](#gmail-app-password-setup) section below for instructions on generating an app password.

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

## Gmail App Password Setup

To enable email sending (welcome emails and ticket emails), you need to configure Gmail SMTP:

### Step 1: Enable 2-Step Verification
1. Go to your Google Account settings: https://myaccount.google.com/
2. Navigate to **Security** → **2-Step Verification**
3. Enable 2-Step Verification if not already enabled

### Step 2: Generate App Password
1. While in Security settings, go to **App Passwords** (you may need to search for it)
2. Select **Mail** as the app
3. Select **Other (Custom name)** as the device and enter "Accezz" or any name
4. Click **Generate**
5. Copy the 16-character password (it will look like: `abcd efgh ijkl mnop`)
6. Use this password (with or without spaces) as `GMAIL_APP_PASSWORD` in your `.env` file

### Step 3: Add to .env File
```env
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=abcdefghijklmnop
GMAIL_SENDER_NAME=Accezz
```

**Important Notes:**
- Use your full Gmail address for `GMAIL_USER`
- The app password is different from your regular Gmail password
- Keep your app password secure and never commit it to version control
- Gmail free accounts have a limit of 500 emails per day

## Verify Setup

After adding the keys, restart your dev server and try accessing the admin dashboard again. The error should be resolved.

### Test Email Functionality
1. Sign up a new user - they should receive a welcome email
2. Purchase a ticket - the buyer should receive a ticket email with QR code
3. Check your server logs for any email-related errors

