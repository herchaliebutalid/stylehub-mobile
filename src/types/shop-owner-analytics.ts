export interface ShopOwnerAnalyticsPeriod {
  date_from: string;

  date_to: string;

  days: number;

  is_default: boolean;
}

export interface ShopOwnerAnalyticsSummary {
  total_bookings: number;

  unique_customers: number;

  completed_revenue: number;

  average_rating: number | null;

  review_count: number;
}

export interface ShopOwnerAnalyticsStatusCounts {
  pending: number;

  confirmed: number;

  completed: number;

  no_show: number;

  cancelled: number;

  declined: number;
}

export interface ShopOwnerAnalyticsPerformance {
  attendance_outcomes: number;

  completion_rate: number | null;

  no_show_rate: number | null;

  cancellation_rate: number | null;

  decline_rate: number | null;
}

export interface ShopOwnerAnalyticsDailyTrendItem {
  date: string;

  total_bookings: number;

  completed: number;

  no_show: number;

  cancelled: number;

  completed_revenue: number;
}

export interface ShopOwnerAnalyticsTopService {
  service_id: number;

  service_name: string;

  total_bookings: number;

  completed_bookings: number;

  no_show_count: number;

  completed_revenue: number;
}

export interface ShopOwnerAnalyticsData {
  period: ShopOwnerAnalyticsPeriod;

  summary: ShopOwnerAnalyticsSummary;

  status_counts: ShopOwnerAnalyticsStatusCounts;

  performance: ShopOwnerAnalyticsPerformance;

  daily_trend: ShopOwnerAnalyticsDailyTrendItem[];

  top_services: ShopOwnerAnalyticsTopService[];
}

export interface ShopOwnerAnalyticsResponse {
  success: boolean;

  data: ShopOwnerAnalyticsData;

  generated_at: string;
}

export interface ShopOwnerAnalyticsDateRange {
  dateFrom: string;

  dateTo: string;
}