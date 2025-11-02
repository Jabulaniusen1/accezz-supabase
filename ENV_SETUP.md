# Environment Variables Setup

## Required Environment Variables

Add the following to your `.env` file:

### Supabase Variables (Required)
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

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

## Verify Setup

After adding the key, restart your dev server and try accessing the admin dashboard again. The error should be resolved.

