export type InAppNotificationType =
  | 'booking_received'
  | 'appointment_confirmed'
  | 'appointment_declined'
  | 'appointment_cancelled'
  | 'appointment_completed'
  | 'appointment_reminder'
  | 'reschedule_requested'
  | 'reschedule_approved'
  | 'reschedule_rejected'
  | 'review_received'
  | 'promo_available';

export type InAppNotificationTargetKind =
  | 'appointment'
  | 'reschedule_request'
  | 'feedback'
  | 'promo';

export type InAppNotificationStatusFilter =
  | 'all'
  | 'unread'
  | 'read';

export interface InAppNotificationTarget {
  kind:
    InAppNotificationTargetKind;

  id:
    number;
}

export interface InAppNotification {
  id:
    number;

  type:
    InAppNotificationType;

  type_label:
    string;

  title:
    string;

  message:
    string;

  is_read:
    boolean;

  read_at:
    string | null;

  created_at:
    string | null;

  target:
    InAppNotificationTarget | null;
}

export interface InAppNotificationPagination {
  current_page:
    number;

  per_page:
    number;

  total:
    number;

  last_page:
    number;

  has_more_pages:
    boolean;
}

export interface InAppNotificationListResponse {
  success:
    boolean;

  data: {
    notifications:
      InAppNotification[];

    unread_count:
      number;

    pagination:
      InAppNotificationPagination;
  };
}

export interface InAppNotificationUnreadCountResponse {
  success:
    boolean;

  data: {
    unread_count:
      number;
  };
}

export interface InAppNotificationReadResponse {
  success:
    boolean;

  message?:
    string;

  data: {
    notification:
      InAppNotification;
  };
}

export interface InAppNotificationReadAllResponse {
  success:
    boolean;

  message?:
    string;

  data: {
    marked_read_count:
      number;

    unread_count:
      number;
  };
}

export interface InAppNotificationListQuery {
  status?:
    InAppNotificationStatusFilter;

  page?:
    number;

  perPage?:
    number;
}