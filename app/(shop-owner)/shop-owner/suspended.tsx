import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
    ActivityIndicator,
    Alert,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import { COLORS } from '@/src/constants/colors';
import { useAuth } from '@/src/context/AuthContext';
import { useShopOwnerAccess } from '@/src/context/ShopOwnerAccessContext';

function formatSuspendedAt(
  value: string | null | undefined,
): string | null {
  if (!value) {
    return null;
  }

  const parsed =
    new Date(value);

  if (
    Number.isNaN(
      parsed.getTime(),
    )
  ) {
    return null;
  }

  return new Intl.DateTimeFormat(
    'en-PH',
    {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'Asia/Manila',
    },
  ).format(parsed);
}

export default function ShopOwnerSuspendedScreen() {
  const {
    logout,
    isSubmitting,
  } =
    useAuth();

  const {
    shop,
    isRefreshing,
    errorMessage,
    refreshAccess,
  } =
    useShopOwnerAccess();

  const suspendedAt =
    formatSuspendedAt(
      shop?.suspension
        .suspended_at,
    );

  const handleLogout =
    async (): Promise<void> => {
      try {
        await logout();
      } catch {
        Alert.alert(
          'Unable to Sign Out',
          'Please try again.',
        );
      }
    };

  return (
    <SafeAreaView
      style={
        styles.safeArea
      }
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor={
          COLORS.background
        }
      />

      <ScrollView
        contentContainerStyle={
          styles.container
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        <View
          style={
            styles.statusIcon
          }
        >
          <Ionicons
            name="ban-outline"
            size={38}
            color={
              COLORS.danger
            }
          />
        </View>

        <Text
          style={
            styles.eyebrow
          }
        >
          ADMINISTRATIVE STATUS
        </Text>

        <Text
          style={
            styles.title
          }
        >
          Shop Suspended
        </Text>

        <Text
          style={
            styles.shopName
          }
        >
          {shop?.name ?? 'StyleHub Shop'}
        </Text>

        <Text
          style={
            styles.description
          }
        >
          Your Shop Owner account remains active, but this shop has been
          suspended by a StyleHub Administrator. Shop management is locked
          and customers cannot discover or book the shop until reactivation.
        </Text>

        <View
          style={
            styles.reasonCard
          }
        >
          <View
            style={
              styles.reasonHeading
            }
          >
            <Ionicons
              name="information-circle-outline"
              size={19}
              color={
                COLORS.danger
              }
            />

            <Text
              style={
                styles.reasonLabel
              }
            >
              SUSPENSION REASON
            </Text>
          </View>

          <Text
            style={
              styles.reasonText
            }
          >
            {shop?.suspension.reason
              ||
              'No suspension reason is currently available.'}
          </Text>

          {suspendedAt ? (
            <Text
              style={
                styles.suspendedAt
              }
            >
              Suspended {suspendedAt}
            </Text>
          ) : null}
        </View>

        <View
          style={
            styles.accountCard
          }
        >
          <View
            style={
              styles.accountIcon
            }
          >
            <Ionicons
              name="person-circle-outline"
              size={22}
              color={
                COLORS.green
              }
            />
          </View>

          <View
            style={
              styles.accountContent
            }
          >
            <Text
              style={
                styles.accountTitle
              }
            >
              Your account is still active
            </Text>

            <Text
              style={
                styles.accountDescription
              }
            >
              Suspension applies only to the shop. Your login is not revoked,
              and existing appointment records remain preserved.
            </Text>
          </View>
        </View>

        <View
          style={
            styles.lockedCard
          }
        >
          <Text
            style={
              styles.lockedTitle
            }
          >
            While suspended
          </Text>

          <LockedRow
            icon="search-outline"
            text="Customers cannot discover this shop."
          />

          <LockedRow
            icon="calendar-outline"
            text="New bookings and reschedule requests are blocked."
          />

          <LockedRow
            icon="lock-closed-outline"
            text="Shop management tools are temporarily unavailable."
          />

          <LockedRow
            icon="document-text-outline"
            text="Existing appointment and business history is preserved."
          />
        </View>

        {errorMessage ? (
          <View
            style={
              styles.errorBox
            }
          >
            <Ionicons
              name="alert-circle-outline"
              size={18}
              color={
                COLORS.danger
              }
            />

            <Text
              style={
                styles.errorText
              }
            >
              {errorMessage}
            </Text>
          </View>
        ) : null}

        <TouchableOpacity
          activeOpacity={0.82}
          disabled={
            isRefreshing
          }
          onPress={() =>
            void refreshAccess()
          }
          style={[
            styles.refreshButton,
            isRefreshing
              &&
              styles.disabledButton,
          ]}
        >
          {isRefreshing ? (
            <ActivityIndicator
              size="small"
              color={
                COLORS.white
              }
            />
          ) : (
            <>
              <Ionicons
                name="refresh-outline"
                size={18}
                color={
                  COLORS.white
                }
              />

              <Text
                style={
                  styles.refreshText
                }
              >
                Refresh Shop Status
              </Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.82}
          onPress={() =>
            router.push(
              '/(shop-owner)/shop-owner-security',
            )
          }
          style={
            styles.securityButton
          }
        >
          <Ionicons
            name="shield-checkmark-outline"
            size={18}
            color={
              COLORS.primary
            }
          />

          <Text
            style={
              styles.securityText
            }
          >
            Account Security
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.82}
          disabled={
            isSubmitting
          }
          onPress={() =>
            void handleLogout()
          }
          style={[
            styles.logoutButton,
            isSubmitting
              &&
              styles.disabledButton,
          ]}
        >
          {isSubmitting ? (
            <ActivityIndicator
              size="small"
              color={
                COLORS.danger
              }
            />
          ) : (
            <>
              <Ionicons
                name="log-out-outline"
                size={18}
                color={
                  COLORS.danger
                }
              />

              <Text
                style={
                  styles.logoutText
                }
              >
                Sign Out
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function LockedRow({
  icon,
  text,
}: {
  icon:
    | 'search-outline'
    | 'calendar-outline'
    | 'lock-closed-outline'
    | 'document-text-outline';
  text: string;
}) {
  return (
    <View
      style={
        styles.lockedRow
      }
    >
      <Ionicons
        name={icon}
        size={17}
        color={
          COLORS.textMuted
        }
      />

      <Text
        style={
          styles.lockedText
        }
      >
        {text}
      </Text>
    </View>
  );
}

const styles =
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor:
        COLORS.background,
    },

    container: {
      flexGrow: 1,
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 42,
      paddingBottom: 40,
      backgroundColor:
        COLORS.background,
    },

    statusIcon: {
      width: 78,
      height: 78,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 25,
      backgroundColor:
        COLORS.dangerSoft,
    },

    eyebrow: {
      marginTop: 20,
      color:
        COLORS.danger,
      fontSize: 8,
      fontWeight: '700',
      letterSpacing: 1.5,
    },

    title: {
      marginTop: 7,
      color:
        COLORS.text,
      fontSize: 25,
      fontWeight: '800',
      textAlign: 'center',
    },

    shopName: {
      marginTop: 8,
      color:
        COLORS.primary,
      fontSize: 13,
      fontWeight: '700',
      textAlign: 'center',
    },

    description: {
      maxWidth: 520,
      marginTop: 13,
      color:
        COLORS.textMuted,
      fontSize: 10,
      lineHeight: 17,
      textAlign: 'center',
    },

    reasonCard: {
      width: '100%',
      marginTop: 22,
      padding: 16,
      borderWidth: 1,
      borderColor: '#F2CCCC',
      borderRadius: 17,
      backgroundColor:
        COLORS.dangerSoft,
    },

    reasonHeading: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
    },

    reasonLabel: {
      color:
        COLORS.danger,
      fontSize: 8,
      fontWeight: '800',
      letterSpacing: 0.8,
    },

    reasonText: {
      marginTop: 9,
      color:
        '#874747',
      fontSize: 10,
      lineHeight: 16,
    },

    suspendedAt: {
      marginTop: 10,
      color:
        '#A46D6D',
      fontSize: 8,
      fontWeight: '500',
    },

    accountCard: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      marginTop: 12,
      padding: 15,
      borderRadius: 17,
      backgroundColor:
        COLORS.greenSoft,
    },

    accountIcon: {
      width: 34,
      height: 34,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 11,
      backgroundColor:
        COLORS.white,
    },

    accountContent: {
      flex: 1,
    },

    accountTitle: {
      color:
        COLORS.green,
      fontSize: 10,
      fontWeight: '700',
    },

    accountDescription: {
      marginTop: 5,
      color:
        '#527A68',
      fontSize: 8,
      lineHeight: 14,
    },

    lockedCard: {
      width: '100%',
      marginTop: 12,
      padding: 16,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderRadius: 17,
      backgroundColor:
        COLORS.surface,
    },

    lockedTitle: {
      marginBottom: 3,
      color:
        COLORS.text,
      fontSize: 11,
      fontWeight: '700',
    },

    lockedRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 9,
      paddingVertical: 8,
    },

    lockedText: {
      flex: 1,
      color:
        COLORS.textMuted,
      fontSize: 9,
      lineHeight: 15,
    },

    errorBox: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      marginTop: 12,
      padding: 13,
      borderWidth: 1,
      borderColor: '#F2CCCC',
      borderRadius: 14,
      backgroundColor:
        COLORS.dangerSoft,
    },

    errorText: {
      flex: 1,
      color:
        COLORS.danger,
      fontSize: 9,
      lineHeight: 15,
    },

    refreshButton: {
      width: '100%',
      minHeight: 52,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 18,
      borderRadius: 16,
      backgroundColor:
        COLORS.primary,
    },

    refreshText: {
      color:
        COLORS.white,
      fontSize: 10,
      fontWeight: '700',
    },

    securityButton: {
      width: '100%',
      minHeight: 50,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 10,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderRadius: 16,
      backgroundColor:
        COLORS.surface,
    },

    securityText: {
      color:
        COLORS.primary,
      fontSize: 10,
      fontWeight: '700',
    },

    logoutButton: {
      width: '100%',
      minHeight: 50,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 10,
      borderWidth: 1,
      borderColor: '#F2CCCC',
      borderRadius: 16,
      backgroundColor:
        '#FFF7F7',
    },

    logoutText: {
      color:
        COLORS.danger,
      fontSize: 10,
      fontWeight: '700',
    },

    disabledButton: {
      opacity: 0.55,
    },
  });