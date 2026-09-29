import {
    Ionicons,
} from '@expo/vector-icons';

import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import {
    COLORS,
} from '@/src/constants/colors';

import {
    useInAppNotifications,
} from '@/src/context/InAppNotificationContext';


/* ==========================================================================
   HELPERS
   ========================================================================== */

function formatBadgeCount(
  count: number,
): string {
  if (
    count > 99
  ) {
    return '99+';
  }

  return String(
    count,
  );
}


/* ==========================================================================
   NOTIFICATION BELL
   ========================================================================== */

export default function NotificationBellButton({
  onPress,
}: {
  onPress:
    () => void;
}) {
  const {
    unreadCount,
  } = useInAppNotifications();

  const accessibilityLabel =
    unreadCount > 0
      ? `Open notifications, ${unreadCount} unread`
      : 'Open notifications';

  return (
    <TouchableOpacity
      activeOpacity={
        0.68
      }
      accessibilityRole="button"
      accessibilityLabel={
        accessibilityLabel
      }
      hitSlop={
        8
      }
      onPress={
        onPress
      }
      style={
        styles.button
      }
    >
      <Ionicons
        name="notifications-outline"
        size={24}
        color={
          COLORS.navy
        }
      />

      {unreadCount > 0 ? (
        <View
          style={
            styles.badge
          }
        >
          <Text
            numberOfLines={
              1
            }
            style={
              styles.badgeText
            }
          >
            {
              formatBadgeCount(
                unreadCount,
              )
            }
          </Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}


/* ==========================================================================
   STYLES
   ========================================================================== */

const styles =
  StyleSheet.create({
    button: {
      width: 40,
      height: 40,

      position: 'relative',

      alignItems: 'center',
      justifyContent: 'center',
    },

    badge: {
      minWidth: 17,
      height: 17,

      position: 'absolute',
      top: 0,
      right: -2,

      alignItems: 'center',
      justifyContent: 'center',

      paddingHorizontal: 4,

      borderWidth: 2,
      borderColor: COLORS.background,
      borderRadius: 999,

      backgroundColor: COLORS.danger,
    },

    badgeText: {
      color: COLORS.white,

      fontSize: 8,
      lineHeight: 10,
      fontWeight: '800',
    },
  });