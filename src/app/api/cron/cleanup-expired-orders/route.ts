import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabaseClient';

/**
 * API route to cleanup expired order reservations
 * This should be called periodically (every 1-2 minutes) via:
 * - Vercel Cron (vercel.json)
 * - Supabase pg_cron
 * - External cron service
 * 
 * The function release_expired_reservations() handles the actual cleanup
 */
export async function GET(req: NextRequest) {
  try {
    // Optional: Add authentication/authorization check
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Call the database function to release expired reservations
    const { data: result, error } = await supabase
      .rpc('release_expired_reservations');

    if (error) {
      console.error('[cleanup-expired-orders] Error releasing expired reservations:', error);
      return NextResponse.json(
        { error: error.message, success: false },
        { status: 500 }
      );
    }

    const resultData = result as { 
      success: boolean; 
      orders_cancelled?: number; 
      tickets_released?: number;
      timestamp?: string;
    } | null;

    return NextResponse.json({
      success: true,
      result: resultData,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error('[cleanup-expired-orders] Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: message, success: false },
      { status: 500 }
    );
  }
}

// Also support POST for flexibility
export const POST = GET;


