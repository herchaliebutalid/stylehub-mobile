import {
    Ionicons,
} from '@expo/vector-icons';

import {
    StyleSheet,
    Text,
    View,
} from 'react-native';

import {
    COLORS,
} from '@/src/constants/colors';

interface CustomerEmptyStateProps {
  icon?:
    | 'storefront-outline'
    | 'calendar-outline'
    | 'search-outline';

  title: string;

  description: string;
}

export default function CustomerEmptyState({
  icon = 'search-outline',
  title,
  description,
}: CustomerEmptyStateProps) {
  return (
    <View
      style={
        styles.container
      }
    >
      <View
        style={
          styles.iconContainer
        }
      >
        <Ionicons
          name={icon}
          size={27}
          color={
            COLORS.textMuted
          }
        />
      </View>

      <Text
        style={
          styles.title
        }
      >
        {title}
      </Text>

      <Text
        style={
          styles.description
        }
      >
        {description}
      </Text>
    </View>
  );
}

const styles =
  StyleSheet.create({
    container: {
      alignItems:
        'center',

      paddingHorizontal:
        30,

      paddingVertical:
        48,
    },

    iconContainer: {
      width:
        58,

      height:
        58,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius:
        18,

      backgroundColor:
        COLORS.surfaceSoft,
    },

    title: {
      marginTop:
        15,

      color:
        COLORS.text,

      fontSize:
        15,

      fontWeight:
        '700',

      textAlign:
        'center',
    },

    description: {
      marginTop:
        7,

      color:
        COLORS.textMuted,

      fontSize:
        10,

      lineHeight:
        16,

      textAlign:
        'center',
    },
  });