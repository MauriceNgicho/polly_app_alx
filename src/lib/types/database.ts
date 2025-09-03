export interface Poll {
  id: string;
  title: string;
  description?: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  is_active: boolean;
  expires_at?: string;
}

export interface PollOption {
  id: string;
  poll_id: string;
  text: string;
  created_at: string;
}

export interface Vote {
  id: string;
  poll_id: string;
  option_id: string;
  user_id?: string;
  ip_address?: string;
  created_at: string;
}

export interface CreatePollData {
  title: string;
  description?: string;
  options: string[];
  expires_at?: string;
}

export interface CreatePollResponse {
  success: boolean;
  poll?: Poll;
  error?: string;
}
