import {
    apiRequest,
} from '@/src/services/api';

import type {
    InAppNotificationListQuery,
    InAppNotificationListResponse,
    InAppNotificationReadAllResponse,
    InAppNotificationReadResponse,
    InAppNotificationUnreadCountResponse,
} from '@/src/types/in-app-notification';


/* ==========================================================================
   QUERY HELPERS
   ========================================================================== */

function appendQuery(
  parameters: string[],
  key: string,
  value: string | number | undefined,
): void {
  if (
    value === undefined
    ||
    value === ''
  ) {
    return;
  }

  parameters.push(
    `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`,
  );
}

function buildNotificationQuery(
  query: InAppNotificationListQuery,
): string {
  const parameters: string[] = [];

  appendQuery(
    parameters,
    'status',
    query.status,
  );

  appendQuery(
    parameters,
    'page',
    query.page,
  );

  appendQuery(
    parameters,
    'per_page',
    query.perPage,
  );

  if (
    parameters.length === 0
  ) {
    return '';
  }

  return `?${parameters.join('&')}`;
}


/* ==========================================================================
   LIST
   ========================================================================== */

export async function getInAppNotifications(
  token: string,
  query: InAppNotificationListQuery = {},
): Promise<InAppNotificationListResponse> {
  return apiRequest<InAppNotificationListResponse>(
    `/notifications${buildNotificationQuery(query)}`,
    {
      token,
    },
  );
}


/* ==========================================================================
   UNREAD COUNT
   ========================================================================== */

export async function getInAppNotificationUnreadCount(
  token: string,
): Promise<InAppNotificationUnreadCountResponse> {
  return apiRequest<InAppNotificationUnreadCountResponse>(
    '/notifications/unread-count',
    {
      token,
    },
  );
}


/* ==========================================================================
   MARK ONE READ
   ========================================================================== */

export async function markInAppNotificationRead(
  token: string,
  notificationId: number,
): Promise<InAppNotificationReadResponse> {
  return apiRequest<InAppNotificationReadResponse>(
    `/notifications/${notificationId}/read`,
    {
      method:
        'PATCH',

      token,
    },
  );
}


/* ==========================================================================
   MARK ALL READ
   ========================================================================== */

export async function markAllInAppNotificationsRead(
  token: string,
): Promise<InAppNotificationReadAllResponse> {
  return apiRequest<InAppNotificationReadAllResponse>(
    '/notifications/read-all',
    {
      method:
        'PATCH',

      token,
    },
  );
}