# Admin Dashboard

A comprehensive admin dashboard for managing users, events, and analytics in the Accezz platform.

## Features

### 1. Users Management
- View all users with their verification status
- Filter users by verified/unverified status
- Search users by email or name
- View events created by each user
- See revenue statistics per user

### 2. Events Management
- View all events with creator information
- See ticket sales for each event
- View revenue per event
- Delete events (with confirmation)
- Search and filter events
- Link to view event pages

### 3. Analytics Dashboard
- **Overall Statistics:**
  - Total revenue across all events
  - Total number of events
  - Total number of users
  - Total tickets sold

- **Top Events by Revenue:**
  - Lists the top 10 events by revenue
  - Shows tickets sold and revenue for each event

- **Top Users by Revenue:**
  - Lists the top 10 users by revenue
  - Shows number of events and total revenue per user

## Setup Instructions

### 1. Database Migration

Run the admin support migration to add admin functionality:

```sql
-- Run this SQL file in your Supabase SQL editor
supabase/migrations/002_admin_support.sql
```

This migration will:
- Add `is_admin` column to `profiles` table
- Create RLS policies for admin access
- Allow admins to read all data and delete events

### 2. Make a User an Admin

To grant admin privileges to a user, run this SQL query in Supabase:

```sql
-- Replace 'user-email@example.com' with the actual user's email
UPDATE public.profiles
SET is_admin = true
WHERE user_id = (
  SELECT id 
  FROM auth.users 
  WHERE email = 'user-email@example.com'
);
```

Or update by user_id directly:

```sql
UPDATE public.profiles
SET is_admin = true
WHERE user_id = 'uuid-of-user-id';
```

### 3. Environment Variables

Ensure these environment variables are set in your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**Important:** The `SUPABASE_SERVICE_ROLE_KEY` is required for the admin API route to access auth.users table. This should be kept secret and never exposed to the client.

### 4. Access the Admin Dashboard

Navigate to: `/admin`

The dashboard will:
- Check if the logged-in user is an admin
- Redirect non-admin users to the regular dashboard
- Show appropriate error messages for unauthorized access

## Security

### Admin Authentication
- Admin status is checked on every page load
- API routes verify admin status before processing requests
- Uses Supabase RLS policies to restrict admin operations server-side

### Data Access
- Admins can view all users, events, and orders
- Admins can delete events (with confirmation)
- Admin operations are logged through Supabase RLS

### API Security
- The `/api/admin/users-emails` route requires:
  - Valid authentication token
  - Admin role verification
  - Service role key for accessing auth.users

## Components

### AdminDashboard (`/app/admin/page.tsx`)
- Main admin dashboard with tab navigation
- Authentication and authorization checks
- Tab switching between Users, Events, and Analytics

### AdminUsers (`/app/admin/components/AdminUsers.tsx`)
- Users list with filters
- User verification status display
- Events created by user (modal view)
- Revenue per user statistics

### AdminEvents (`/app/admin/components/AdminEvents.tsx`)
- Events list with search
- Creator information display
- Ticket sales and revenue per event
- Event deletion functionality

### AdminAnalytics (`/app/admin/components/AdminAnalytics.tsx`)
- Overall platform statistics
- Top events by revenue
- Top users by revenue
- Revenue breakdowns

## API Routes

### `/api/admin/users-emails` (POST)
**Purpose:** Fetch user emails from auth.users table (requires service role access)

**Authentication:** Requires admin role

**Request Body:**
```json
{
  "user_ids": ["uuid1", "uuid2", ...]
}
```

**Response:**
```json
{
  "emails": [["uuid", "email@example.com"], ...],
  "names": [["uuid", "Full Name"], ...]
}
```

## Notes

- Admin dashboard requires proper admin privileges set in the database
- All admin operations respect Supabase RLS policies
- Revenue calculations are based on paid orders only
- Ticket sales are calculated from ticket_types.sold column
- User emails are fetched via API route since auth.users cannot be accessed directly from client

## Troubleshooting

### "Access denied" error
- Verify the user has `is_admin = true` in the profiles table
- Check that the migration has been applied correctly

### Cannot fetch user emails
- Ensure `SUPABASE_SERVICE_ROLE_KEY` is set in environment variables
- Check that the API route has proper authentication
- Verify the user making the request is an admin

### Events not showing creator info
- Check that the API route is responding correctly
- Verify the authorization header is being sent
- Check browser console for API errors

