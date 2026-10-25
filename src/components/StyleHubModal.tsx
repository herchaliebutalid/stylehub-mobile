
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import { COLORS } from '@/src/constants/colors';

type IconName = ComponentProps<typeof Ionicons>['name'];

type ModalTone =
  | 'neutral'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger';

type ActionVariant =
  | 'primary'
  | 'secondary'
  | 'danger';

export type StyleHubModalAction = {
  label: string;
  onPress: () => void | Promise<void>;
  variant?: ActionVariant;
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
};

type StyleHubModalProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  message?: string;
  tone?: ModalTone;
  icon?: IconName;
  actions?: StyleHubModalAction[];
  children?: ReactNode;
  dismissOnBackdrop?: boolean;
  testID?: string;
};

const toneStyles: Record<
  ModalTone,
  {
    icon: IconName;
    background: string;
    color: string;
  }
> = {
  neutral: {
    icon: 'information-circle-outline',
    background: COLORS.accentSoft,
    color: COLORS.navy,
  },

  info: {
    icon: 'information-circle-outline',
    background: COLORS.blueSoft,
    color: COLORS.blue,
  },

  success: {
    icon: 'checkmark-circle-outline',
    background: COLORS.greenSoft,
    color: COLORS.green,
  },

  warning: {
    icon: 'alert-circle-outline',
    background: COLORS.warningSoft,
    color: COLORS.warning,
  },

  danger: {
    icon: 'alert-circle-outline',
    background: COLORS.dangerSoft,
    color: COLORS.danger,
  },
};

/*
|--------------------------------------------------------------------------
| STYLEHUB MODAL
|--------------------------------------------------------------------------
|
| One reusable modal for quick mobile interactions.
|
| Features:
| - Compact centered layout
| - Consistent colors and typography
| - Support for one or two action buttons
| - Loading and disabled states
| - Android Back button support
| - Keyboard-aware layout
| - Scrollable content when necessary
| - Optional custom content
| - No native Alert.alert
|
*/

export default function StyleHubModal({
  visible,
  onClose,
  title,
  message,
  tone = 'neutral',
  icon,
  actions,
  children,
  dismissOnBackdrop = true,
  testID,
}: StyleHubModalProps) {
  const appearance = toneStyles[tone];

  const buttons: StyleHubModalAction[] =
    actions ?? [
      {
        label: 'OK',
        onPress: onClose,
        variant: 'primary',
      },
    ];

  const busy = buttons.some(
    (button) => button.loading,
  );

  function closeIfAllowed() {
    if (!busy) {
      onClose();
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={closeIfAllowed}
      testID={testID}
    >
      <KeyboardAvoidingView
        style={styles.root}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >
        {/* Background overlay */}

        <Pressable
          style={StyleSheet.absoluteFill}
          accessible={false}
          onPress={() => {
            if (dismissOnBackdrop) {
              closeIfAllowed();
            }
          }}
        />

        {/* Modal card */}

        <View
          style={styles.card}
          accessibilityViewIsModal
        >
          <ScrollView
            style={styles.bodyScroll}
            contentContainerStyle={styles.bodyContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* Modal icon */}

            <View
              style={[
                styles.iconBox,
                {
                  backgroundColor:
                    appearance.background,
                },
              ]}
            >
              <Ionicons
                name={icon ?? appearance.icon}
                size={23}
                color={appearance.color}
              />
            </View>

            {/* Title */}

            <Text style={styles.title}>
              {title}
            </Text>

            {/* Description */}

            {message ? (
              <Text style={styles.message}>
                {message}
              </Text>
            ) : null}

            {/* Optional custom content */}

            {children ? (
              <View style={styles.extraContent}>
                {children}
              </View>
            ) : null}
          </ScrollView>

          {/* Action buttons */}

          {buttons.length > 0 ? (
            <View style={styles.actionRow}>
              {buttons.map((button, index) => {
                const variant =
                  button.variant ??
                  (
                    index === buttons.length - 1
                      ? 'primary'
                      : 'secondary'
                  );

                const disabled = Boolean(
                  button.disabled || busy,
                );

                const danger =
                  variant === 'danger';

                const outlined =
                  variant === 'secondary';

                const foreground = outlined
                  ? COLORS.navy
                  : COLORS.white;

                return (
                  <Pressable
                    key={`${button.label}-${index}`}
                    accessibilityRole="button"
                    accessibilityLabel={
                      button.label
                    }
                    disabled={disabled}
                    onPress={button.onPress}
                    style={({ pressed }) => [
                      styles.button,

                      outlined
                        ? styles.secondaryButton
                        : danger
                          ? styles.dangerButton
                          : styles.primaryButton,

                      pressed &&
                        !disabled &&
                        styles.pressed,

                      disabled &&
                        styles.disabled,
                    ]}
                  >
                    {/* Button loading / icon */}

                    {button.loading ? (
                      <ActivityIndicator
                        size="small"
                        color={foreground}
                      />
                    ) : button.icon ? (
                      <Ionicons
                        name={button.icon}
                        size={17}
                        color={foreground}
                      />
                    ) : null}

                    {/* Button label */}

                    <Text
                      numberOfLines={2}
                      style={[
                        styles.buttonText,

                        outlined &&
                          styles.secondaryButtonText,
                      ]}
                    >
                      {button.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/*
|--------------------------------------------------------------------------
| CONSISTENT MINIMALIST DESIGN
|--------------------------------------------------------------------------
*/

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',

    paddingHorizontal: 24,
    paddingVertical: 36,

    backgroundColor:
      'rgba(12, 20, 30, 0.58)',
  },

  card: {
    width: '100%',
    maxWidth: 356,
    maxHeight: '86%',

    backgroundColor: COLORS.white,

    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,

    overflow: 'hidden',

    shadowColor: COLORS.black,
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.16,
    shadowRadius: 22,
    elevation: 14,
  },

  bodyScroll: {
    flexGrow: 0,
  },

  bodyContent: {
    alignItems: 'center',

    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 18,
  },

  iconBox: {
    width: 46,
    height: 46,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 14,
    marginBottom: 14,
  },

  title: {
    color: COLORS.text,

    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,

    textAlign: 'center',
  },

  message: {
    marginTop: 8,

    color: COLORS.textMuted,

    fontSize: 13,
    lineHeight: 19,

    textAlign: 'center',
  },

  extraContent: {
    width: '100%',
    marginTop: 16,
  },

  actionRow: {
    flexDirection: 'row',
    gap: 10,

    paddingHorizontal: 20,
    paddingBottom: 20,
  },

  button: {
    flex: 1,
    minHeight: 44,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,

    paddingHorizontal: 10,
    paddingVertical: 11,

    borderRadius: 11,
  },

  primaryButton: {
    backgroundColor: COLORS.navy,
  },

  dangerButton: {
    backgroundColor: COLORS.danger,
  },

  secondaryButton: {
    backgroundColor:
      COLORS.surfaceSoft,

    borderWidth: 1,
    borderColor: COLORS.border,
  },

  buttonText: {
    color: COLORS.white,

    fontSize: 12,
    fontWeight: '700',

    textAlign: 'center',
  },

  secondaryButtonText: {
    color: COLORS.navy,
  },

  pressed: {
    opacity: 0.84,
  },

  disabled: {
    opacity: 0.55,
  },
});
