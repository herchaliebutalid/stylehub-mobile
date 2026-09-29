import {
    ActivityIndicator,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import {
    COLORS,
} from '@/src/constants/colors';

interface CustomerLoadingStateProps {
  message?: string;
}

export default function CustomerLoadingState({
  message = 'Loading...',
}: CustomerLoadingStateProps) {
  return (
    <View
      style={
        styles.container
      }
    >
      <ActivityIndicator
        size="large"
        color={
          COLORS.primary
        }
      />

      <Text
        style={
          styles.message
        }
      >
        {message}
      </Text>
    </View>
  );
}

const styles =
  StyleSheet.create({
    container: {
      alignItems:
        'center',

      justifyContent:
        'center',

      paddingVertical:
        48,
    },

    message: {
      marginTop:
        12,

      color:
        COLORS.textMuted,

      fontSize:
        11,
    },
  });