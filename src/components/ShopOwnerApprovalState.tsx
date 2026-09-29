import {
    Ionicons,
} from '@expo/vector-icons';

import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import {
    COLORS,
} from '@/src/constants/colors';

import type {
    ShopOwnerShop,
} from '@/src/types/shop-owner';

interface ShopOwnerApprovalStateProps {
  shop: ShopOwnerShop | null;

  isRefreshing: boolean;

  onRefresh: () => void;
}

export default function ShopOwnerApprovalState({
  shop,
  isRefreshing,
  onRefresh,
}: ShopOwnerApprovalStateProps) {
  if (
    shop === null
  ) {
    return (
      <View
        style={
          styles.container
        }
      >
        <View
          style={[
            styles.iconContainer,
            styles.warningIconContainer,
          ]}
        >
          <Ionicons
            name="alert-circle-outline"
            size={34}
            color={
              COLORS.warning
            }
          />
        </View>

        <Text
          style={
            styles.title
          }
        >
          No Shop Found
        </Text>

        <Text
          style={
            styles.description
          }
        >
          No shop is currently associated with this Shop Owner account.
          Management tools cannot be accessed until a valid shop is
          associated with the account.
        </Text>

        <RefreshButton
          isRefreshing={
            isRefreshing
          }
          onRefresh={
            onRefresh
          }
        />
      </View>
    );
  }

  if (
    shop.approval_status ===
    'rejected'
  ) {
    return (
      <View
        style={
          styles.container
        }
      >
        <View
          style={[
            styles.iconContainer,
            styles.rejectedIconContainer,
          ]}
        >
          <Ionicons
            name="close-circle-outline"
            size={34}
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
          SHOP REGISTRATION
        </Text>

        <Text
          style={
            styles.title
          }
        >
          Registration Rejected
        </Text>

        <Text
          style={
            styles.shopName
          }
        >
          {shop.name}
        </Text>

        <Text
          style={
            styles.description
          }
        >
          Your shop registration was reviewed by the StyleHub Administrator
          and was not approved.
        </Text>

        {shop.rejection_reason ? (
          <View
            style={
              styles.reasonCard
            }
          >
            <Text
              style={
                styles.reasonLabel
              }
            >
              REJECTION REASON
            </Text>

            <Text
              style={
                styles.reasonText
              }
            >
              {shop.rejection_reason}
            </Text>
          </View>
        ) : null}

        {shop.reviewed_at ? (
          <Text
            style={
              styles.reviewedText
            }
          >
            Administrator review completed.
          </Text>
        ) : null}

        <RefreshButton
          isRefreshing={
            isRefreshing
          }
          onRefresh={
            onRefresh
          }
        />
      </View>
    );
  }

  return (
    <View
      style={
        styles.container
      }
    >
      <View
        style={[
          styles.iconContainer,
          styles.pendingIconContainer,
        ]}
      >
        <Ionicons
          name="time-outline"
          size={34}
          color={
            COLORS.warning
          }
        />
      </View>

      <Text
        style={
          styles.eyebrow
        }
      >
        SHOP REGISTRATION
      </Text>

      <Text
        style={
          styles.title
        }
      >
        Awaiting Approval
      </Text>

      <Text
        style={
          styles.shopName
        }
      >
        {shop.name}
      </Text>

      <Text
        style={
          styles.description
        }
      >
        Your shop registration has been submitted successfully and is
        waiting for Administrator review.
      </Text>

      <View
        style={
          styles.pendingCard
        }
      >
        <View
          style={
            styles.pendingRow
          }
        >
          <Ionicons
            name="shield-checkmark-outline"
            size={19}
            color={
              COLORS.warning
            }
          />

          <View
            style={
              styles.pendingContent
            }
          >
            <Text
              style={
                styles.pendingTitle
              }
            >
              Management is temporarily locked
            </Text>

            <Text
              style={
                styles.pendingDescription
              }
            >
              Services, schedules, availability, appointments, promotions,
              and reschedule management become available only after
              Administrator approval.
            </Text>
          </View>
        </View>
      </View>

      <View
        style={
          styles.shopInfo
        }
      >
        <InfoRow
          label="Shop Type"
          value={
            shop.type_label
          }
        />

        <InfoRow
          label="Location"
          value={`${shop.city}, ${shop.province}`}
        />

        <InfoRow
          label="Approval Status"
          value={
            shop.approval_status_label
          }
        />

        <InfoRow
          label="Availability"
          value={
            shop.availability_status_label
          }
        />
      </View>

      <RefreshButton
        isRefreshing={
          isRefreshing
        }
        onRefresh={
          onRefresh
        }
      />
    </View>
  );
}

function RefreshButton({
  isRefreshing,
  onRefresh,
}: {
  isRefreshing: boolean;
  onRefresh: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={
        0.82
      }
      disabled={
        isRefreshing
      }
      onPress={
        onRefresh
      }
      style={[
        styles.refreshButton,

        isRefreshing &&
          styles.refreshButtonDisabled,
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
            Refresh Approval Status
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View
      style={
        styles.infoRow
      }
    >
      <Text
        style={
          styles.infoLabel
        }
      >
        {label}
      </Text>

      <Text
        style={
          styles.infoValue
        }
      >
        {value}
      </Text>
    </View>
  );
}

const styles =
  StyleSheet.create({
    container: {
      alignItems:
        'center',

      marginTop:
        22,

      padding:
        22,

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      borderRadius:
        24,

      backgroundColor:
        COLORS.surface,
    },

    iconContainer: {
      width:
        72,

      height:
        72,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius:
        24,
    },

    pendingIconContainer: {
      backgroundColor:
        '#FFF4D8',
    },

    rejectedIconContainer: {
      backgroundColor:
        '#FFF1F0',
    },

    warningIconContainer: {
      backgroundColor:
        '#FFF4D8',
    },

    eyebrow: {
      marginTop:
        17,

      color:
        COLORS.accent,

      fontSize:
        8,

      fontWeight:
        '700',

      letterSpacing:
        1.4,
    },

    title: {
      marginTop:
        6,

      color:
        COLORS.text,

      fontSize:
        22,

      fontWeight:
        '700',

      textAlign:
        'center',
    },

    shopName: {
      marginTop:
        8,

      color:
        COLORS.primary,

      fontSize:
        13,

      fontWeight:
        '700',

      textAlign:
        'center',
    },

    description: {
      marginTop:
        12,

      color:
        COLORS.textMuted,

      fontSize:
        10,

      lineHeight:
        17,

      textAlign:
        'center',
    },

    pendingCard: {
      width:
        '100%',

      marginTop:
        20,

      padding:
        14,

      borderRadius:
        15,

      backgroundColor:
        '#FFF8E8',
    },

    pendingRow: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',

      gap:
        9,
    },

    pendingContent: {
      flex:
        1,
    },

    pendingTitle: {
      color:
        '#795D18',

      fontSize:
        10,

      fontWeight:
        '700',
    },

    pendingDescription: {
      marginTop:
        5,

      color:
        '#806B36',

      fontSize:
        8,

      lineHeight:
        14,
    },

    reasonCard: {
      width:
        '100%',

      marginTop:
        20,

      padding:
        15,

      borderRadius:
        15,

      backgroundColor:
        '#FFF1F0',
    },

    reasonLabel: {
      color:
        COLORS.danger,

      fontSize:
        8,

      fontWeight:
        '700',

      letterSpacing:
        0.8,
    },

    reasonText: {
      marginTop:
        7,

      color:
        COLORS.danger,

      fontSize:
        9,

      lineHeight:
        15,
    },

    reviewedText: {
      marginTop:
        12,

      color:
        COLORS.textLight,

      fontSize:
        8,
    },

    shopInfo: {
      width:
        '100%',

      marginTop:
        20,

      padding:
        15,

      borderRadius:
        15,

      backgroundColor:
        COLORS.surfaceSoft,
    },

    infoRow: {
      flexDirection:
        'row',

      justifyContent:
        'space-between',

      gap:
        14,

      paddingVertical:
        8,
    },

    infoLabel: {
      color:
        COLORS.textLight,

      fontSize:
        8,
    },

    infoValue: {
      flex:
        1,

      color:
        COLORS.text,

      fontSize:
        9,

      fontWeight:
        '600',

      textAlign:
        'right',
    },

    refreshButton: {
      minHeight:
        50,

      width:
        '100%',

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        7,

      marginTop:
        20,

      borderRadius:
        15,

      backgroundColor:
        COLORS.primary,
    },

    refreshButtonDisabled: {
      opacity:
        0.55,
    },

    refreshText: {
      color:
        COLORS.white,

      fontSize:
        10,

      fontWeight:
        '700',
    },
  });