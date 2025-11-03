export type WithdrawalStatus = 'pending' | 'approved' | 'rejected';

export interface WithdrawalRequest {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  status: WithdrawalStatus;
  admin_note?: string | null;
  resolved_at?: string | null;
  created_at: string;
}


