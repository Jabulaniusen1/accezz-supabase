# Setting up Gmail SMTP in Supabase

## In Supabase Dashboard:

1. Go to your Supabase project dashboard
2. Navigate to **Project Settings** → **Auth** → **SMTP Settings**

## Configure Gmail SMTP:

### Option 1: Using Gmail App Password (Recommended for Gmail)

1. **Create a Gmail App Password:**
   - Go to your Google Account settings
   - Security → 2-Step Verification (must be enabled)
   - App Passwords → Generate new app password
   - Copy the 16-character password

2. **Fill in SMTP Configuration:**
   ```
   Host: smtp.gmail.com
   Port: 587
   Username: your-email@gmail.com
   Password: [your-16-char-app-password]
   Sender email: your-email@gmail.com
   Sender name: Your App Name
   ```

3. **Enable SMTP** in Supabase settings

### Option 2: Using Custom SMTP Domain

If you have a custom domain with Gmail Workspace:

1. **Get SMTP credentials from Gmail Admin Console:**
   - Or use same settings as above

2. **Configure:**
   ```
   Host: smtp.gmail.com
   Port: 587 (or 465 for SSL)
   Username: your-workspace-email@yourdomain.com
   Password: your-google-workspace-password
   Sender email: noreply@yourdomain.com
   ```

## Testing Email Sending:

Once configured, you can test by:
1. Using Supabase Auth email templates
2. Sending from your application using `supabase.auth.signUp()` or password reset flows
3. Using Supabase Edge Functions to send custom emails

## Using in Your App:

Supabase will automatically send emails for:
- Email verification
- Password reset
- Magic link authentication
- Custom emails via Edge Functions

## Troubleshooting:

- **Authentication failed:** Check that 2FA is enabled and app password is correct
- **Connection timeout:** Check firewall/network settings
- **Rate limits:** Gmail has sending limits (500 emails/day for free accounts)
