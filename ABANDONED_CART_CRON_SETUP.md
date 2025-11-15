# Abandoned Cart Email Cron Job Setup

This guide explains how to set up the Supabase cron job for sending abandoned cart emails.

## Overview

The system sends emails to users who created an order but didn't complete the purchase after 5 minutes. The cron job runs every 5 minutes to check for incomplete orders and send reminder emails.

## Setup Steps

### 1. Run the Migration

Run the migration file to set up the database function and cron job:

```bash
# If using Supabase CLI
supabase migration up

# Or apply the migration via Supabase Dashboard
# Go to Database > Migrations and run: 009_abandoned_cart_cron.sql
```

### 2. Update the API URL

After running the migration, update the API URL in the config table with your actual domain:

```sql
UPDATE public.config 
SET value = 'https://your-actual-domain.com/api/emails/send-abandoned-carts'
WHERE key = 'abandoned_cart_api_url';
```

Replace `your-actual-domain.com` with your actual domain (e.g., `accezz.com` or your Vercel deployment URL).

### 3. Enable Required Extensions

The migration requires two extensions:

1. **pg_net** - For making HTTP requests from the database
2. **pg_cron** - For scheduling the cron job

#### Enable pg_net

In Supabase Dashboard:
1. Go to **Database** > **Extensions**
2. Search for `pg_net` and enable it

Or via SQL:
```sql
CREATE EXTENSION IF NOT EXISTS pg_net;
```

#### Enable pg_cron

In Supabase Dashboard:
1. Go to **Database** > **Extensions**
2. Search for `pg_cron` and enable it

Or via SQL:
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

### 4. Schedule the Cron Job

#### Option A: Via Supabase Dashboard (Recommended)

1. Go to **Database** > **Cron Jobs** in Supabase Dashboard
2. Click **New Cron Job**
3. Configure:
   - **Name**: `send-abandoned-cart-emails`
   - **Schedule**: `*/5 * * * *` (every 5 minutes)
   - **Command**: 
     ```sql
     SELECT public.send_abandoned_cart_emails();
     ```
   - **Database**: Your database name
   - **Username**: `postgres`

#### Option B: Via SQL (if dashboard scheduling doesn't work)

```sql
SELECT cron.schedule(
  'send-abandoned-cart-emails',
  '*/5 * * * *', -- Every 5 minutes
  $$SELECT public.send_abandoned_cart_emails();$$
);
```

### 5. Test the Function

Test the function manually to ensure it works:

```sql
SELECT public.send_abandoned_cart_emails();
```

This should return a JSON response with the status and results.

## Verification

### Check if Cron Job is Running

```sql
SELECT * FROM cron.job WHERE jobname = 'send-abandoned-cart-emails';
```

### Check Cron Job Execution History

```sql
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'send-abandoned-cart-emails')
ORDER BY start_time DESC 
LIMIT 10;
```

### Monitor the Function

You can check the logs in Supabase Dashboard under **Logs** > **Postgres Logs** to see if the function is being called and if there are any errors.

## Troubleshooting

### Issue: pg_net extension not available

If `pg_net` is not available in your Supabase instance, you have two options:

1. **Contact Supabase Support** to enable the `pg_net` extension
2. **Use an external cron service** (like Vercel Cron, GitHub Actions, or a traditional cron server) to call the API endpoint directly:
   ```bash
   curl -X POST https://your-domain.com/api/emails/send-abandoned-carts \
     -H "Content-Type: application/json" \
     -d '{"minutes": 5, "limit": 50}'
   ```

### Issue: pg_cron not scheduling jobs

If automatic scheduling doesn't work:

1. Check if `pg_cron` extension is enabled
2. Try scheduling manually via Supabase Dashboard (Database > Cron Jobs)
3. Contact Supabase Support if cron jobs are not available in your plan

### Issue: Function returns error about API URL

Make sure you've updated the `abandoned_cart_api_url` in the config table:

```sql
SELECT * FROM public.config WHERE key = 'abandoned_cart_api_url';
```

If it still shows the placeholder URL, update it:

```sql
UPDATE public.config 
SET value = 'https://your-actual-domain.com/api/emails/send-abandoned-carts'
WHERE key = 'abandoned_cart_api_url';
```

## Alternative: External Cron Service

If Supabase cron jobs are not available or not working, you can use an external service:

### Vercel Cron (if deployed on Vercel)

Create `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/emails/send-abandoned-carts",
    "schedule": "*/5 * * * *"
  }]
}
```

### GitHub Actions

Create `.github/workflows/abandoned-cart-cron.yml`:

```yaml
name: Abandoned Cart Emails
on:
  schedule:
    - cron: '*/5 * * * *'  # Every 5 minutes
jobs:
  send-emails:
    runs-on: ubuntu-latest
    steps:
      - name: Call API
        run: |
          curl -X POST https://your-domain.com/api/emails/send-abandoned-carts \
            -H "Content-Type: application/json" \
            -d '{"minutes": 5, "limit": 50}'
```

## Configuration

You can adjust the timing and limits by modifying the function call or updating the config:

```sql
-- Change the minutes threshold (default: 5)
-- Update the function to use a different value, or pass it as a parameter

-- Change the limit (default: 50)
-- This limits how many emails are sent per run
```

## Monitoring

Monitor the cron job performance:

1. Check execution logs in Supabase Dashboard
2. Monitor email sending success rates
3. Check for any errors in the function execution
4. Review abandoned cart email metrics

## Support

If you encounter issues:
1. Check Supabase logs for error messages
2. Verify all extensions are enabled
3. Ensure the API URL is correct
4. Test the function manually before relying on the cron job

