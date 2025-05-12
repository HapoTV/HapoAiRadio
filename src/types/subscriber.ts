export interface Subscriber {
  id: string;
  email: string;
  full_name: string;
  subscription_type: 'basic' | 'premium' | 'family';
  subscription_status: 'active' | 'expired' | 'cancelled';
  start_date: string;
  end_date: string;
  last_login: string;
  total_listening_hours: number;
  favorite_genres: string[];
  created_at: string;
}

export interface ListeningStats {
  date: string;
  hours: number;
  peak_hour: number;
}

export interface ContentEngagement {
  content_type: 'playlist' | 'podcast' | 'interview';
  content_id: string;
  title: string;
  play_count: number;
  total_duration: number;
  last_played: string;
}

export interface SubscriberMetrics {
  total_subscribers: number;
  active_subscribers: number;
  churn_rate: number;
  average_listening_hours: number;
  popular_content: Array<{
    title: string;
    plays: number;
  }>;
  subscription_distribution: Array<{
    type: string;
    count: number;
  }>;
}