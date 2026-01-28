# Setting up ZeptoMail SMTP in Supabase

## In Supabase Dashboard:

1. Go to your Supabase project dashboard
2. Navigate to **Project Settings** → **Auth** → **SMTP Settings**

## Configure ZeptoMail SMTP:

### Using ZeptoMail API Credentials

1. **Get Your ZeptoMail Credentials:**
   - **Username:** `emailapikey` (standard for ZeptoMail)
   - **Password:** Your ZeptoMail API password
   - **Server:** `smtp.zeptomail.com`
   - **Port:** `587` (TLS) or `465` (SSL)
   - **Domain:** Your verified domain (e.g., `accezzlive.com`)

2. **Fill in SMTP Configuration:**
   ```
   Host: smtp.zeptomail.com
   Port: 587 (or 465 for SSL)
   Username: emailapikey
   Password: [your-zeptomail-api-password]
   Sender email: noreply@accezzlive.com
   Sender name: Accezz
   ```

3. **Enable SMTP** in Supabase settings

### Port Options:

- **Port 587 (TLS/STARTTLS)** - Recommended
  - Uses STARTTLS encryption
  - More compatible with firewalls
  - Set `secure: false` in configuration

- **Port 465 (SSL)**
  - Uses SSL encryption
  - Use if port 587 is blocked
  - Set `secure: true` in configuration

### Sender Email Configuration:

- The sender email must be from your verified domain
- Common options:
  - `noreply@accezzlive.com`
  - `support@accezzlive.com`
  - `info@accezzlive.com`
  - `notifications@accezzlive.com`

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

- **Authentication failed:** 
  - Check that username is `emailapikey`
  - Verify your API password is correct
  - Ensure your ZeptoMail account is active

- **Connection timeout:** 
  - Check firewall/network settings
  - Verify port 587 or 465 is open
  - Try the alternative port if one doesn't work

- **Sender address not verified:**
  - Ensure the sender email domain matches your verified domain in ZeptoMail
  - Verify your domain (accezzlive.com) is properly configured in ZeptoMail

- **Rate limits:** 
  - Check your ZeptoMail plan limits
  - Monitor your sending quota in ZeptoMail dashboard
  - Review your sending volume

## ZeptoMail SMTP Settings Summary:

- **Host:** `smtp.zeptomail.com`
- **Port:** `587` (TLS) or `465` (SSL)
- **Username:** `emailapikey` (standard)
- **Password:** Your ZeptoMail API password
- **Security:** TLS/STARTTLS for port 587, SSL for port 465
- **Authentication:** Required

## Domain Verification:

For your domain (accezzlive.com):

1. **Verify Domain in ZeptoMail:**
   - Go to ZeptoMail dashboard
   - Add your domain (accezzlive.com)
   - Configure DNS records (SPF, DKIM, DMARC) as shown in ZeptoMail

2. **DNS Records:**
   - Add SPF record to authorize ZeptoMail to send emails
   - Add DKIM record for email authentication
   - Add DMARC record (optional but recommended)

3. **Wait for Verification:**
   - DNS changes can take up to 48 hours to propagate
   - Check verification status in ZeptoMail dashboard

## Additional Notes:

- ZeptoMail provides reliable email delivery with good deliverability rates
- The `emailapikey` username is standard for all ZeptoMail accounts
- Use API passwords for better security than account passwords
- Monitor your sending limits and quotas in ZeptoMail dashboard
- Ensure SPF and DKIM records are configured for better deliverability
