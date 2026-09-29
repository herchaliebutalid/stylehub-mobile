import {
    Ionicons,
} from '@expo/vector-icons';

import {
    router,
} from 'expo-router';

import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import {
    COLORS,
} from '@/src/constants/colors';

import type {
    MobileUserRole,
} from '@/src/types/auth';

interface AccountSecurityLinkCardProps {
  role:
    MobileUserRole;
}

export default function AccountSecurityLinkCard({
  role,
}: AccountSecurityLinkCardProps) {
  function handlePress(): void {
    if (
      role ===
      'customer'
    ) {
      router.push(
        '/(customer)/customer-security',
      );

      return;
    }

    router.push(
      '/(shop-owner)/shop-owner-security',
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={
        0.82
      }
      accessibilityRole="button"
      accessibilityLabel="Open account security"
      onPress={
        handlePress
      }
      style={
        styles.card
      }
    >
      <View
        style={
          styles.iconBox
        }
      >
        <Ionicons
          name="lock-closed-outline"
          size={20}
          color={
            COLORS.navy
          }
        />
      </View>

      <View
        style={
          styles.content
        }
      >
        <Text
          style={
            styles.title
          }
        >
          Change Password
        </Text>

        <Text
          style={
            styles.description
          }
        >
          Update your password and sign out other StyleHub sessions.
        </Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={20}
        color={
          COLORS.textLight
        }
      />
    </TouchableOpacity>
  );
}

const styles =
  StyleSheet.create({
    card: {
      minHeight:
        72,

      flexDirection:
        'row',

      alignItems:
        'center',

      paddingHorizontal:
        14,

      paddingVertical:
        12,

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      borderRadius:
        17,

      backgroundColor:
        COLORS.surface,
    },

    iconBox: {
      width:
        40,

      height:
        40,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius:
        12,

      backgroundColor:
        COLORS.accentSoft,
    },

    content: {
      flex:
        1,

      marginLeft:
        12,

      marginRight:
        10,
    },

    title: {
      color:
        COLORS.navy,

      fontSize:
        11,

      lineHeight:
        15,

      fontWeight:
        '700',
    },

    description: {
      marginTop:
        4,

      color:
        COLORS.textMuted,

      fontSize:
        8.5,

      lineHeight:
        13,
    },
  });