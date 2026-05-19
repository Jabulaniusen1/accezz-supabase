export type WithdrawalStatus = 'pending' | 'approved' | 'completed' | 'rejected';
export type WithdrawalSource = 'combined' | 'affiliate' | 'event';

export interface WithdrawalRequest {
  id: string;
  user_id: string;
  amount: number;
  fee_amount?: number;
  net_amount?: number;
  currency: string;
  source?: WithdrawalSource;
  status: WithdrawalStatus;
  admin_note?: string | null;
  resolved_at?: string | null;
  created_at: string;
}

