import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import {
  Image,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { COLORS } from '@/src/constants/colors';


/* ==========================================================================
   STYLEHUB ROLE SELECTION
   ========================================================================== */

export default function RoleSelectionScreen() {
  const router =
    useRouter();

  const {
    width,
    height,
  } =
    useWindowDimensions();


  /* ==========================================================================
     RESPONSIVE STATE
     ========================================================================== */

  const isSmallPhone =
    width < 360;

  const isShortScreen =
    height < 700;

  const isTablet =
    width >= 720;


  const horizontalPadding =
    isTablet
      ? 32
      : isSmallPhone
        ? 16
        : 20;


  const logoSize =
    isSmallPhone
      ? 84
      : isShortScreen
        ? 94
        : isTablet
          ? 124
          : 108;


  /* ==========================================================================
     NAVIGATION
     ========================================================================== */

  function openCustomerLogin() {
    router.push(
      '/(auth)/customer-login',
    );
  }


  function openShopOwnerLogin() {
    router.push(
      '/(auth)/shop-owner-login',
    );
  }


  /* ==========================================================================
     RENDER
     ========================================================================== */

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
        style={
          styles.scrollView
        }
        contentContainerStyle={
          styles.scrollContent
        }
        showsVerticalScrollIndicator={
          false
        }
        keyboardShouldPersistTaps="handled"
        bounces={
          false
        }
      >
        <View
          style={[
            styles.screen,

            {
              paddingHorizontal:
                horizontalPadding,
            },
          ]}
        >
          {/* ================================================================
              BRAND
              ================================================================ */}

          <View
            style={[
              styles.brandSection,

              isShortScreen &&
                styles.brandSectionCompact,
            ]}
          >
            <View
              style={
                styles.logoGlow
              }
            >
              <View
                style={
                  styles.logoFrame
                }
              >
                <Image
                  source={
                    require(
                      '../../assets/images/stylehub-splash.png'
                    )
                  }
                  resizeMode="contain"
                  style={{
                    width:
                      logoSize,

                    height:
                      logoSize,
                  }}
                />
              </View>
            </View>


            <View
              style={
                styles.brandBadge
              }
            >
              <View
                style={
                  styles.brandBadgeDot
                }
              />

              <Text
                style={
                  styles.brandBadgeText
                }
              >
                BEAUTY & GROOMING
              </Text>
            </View>


            <Text
              style={[
                styles.title,

                isSmallPhone &&
                  styles.titleSmall,
              ]}
            >
              Welcome to StyleHub
            </Text>


            <Text
              style={
                styles.subtitle
              }
            >
              Choose how you want to use StyleHub
              and we&apos;ll take you to the right
              workspace.
            </Text>
          </View>


          {/* ================================================================
              ROLE CONTENT
              ================================================================ */}

          <View
            style={
              styles.roleSection
            }
          >
            <View
              style={
                styles.sectionHeading
              }
            >
              <Text
                style={
                  styles.sectionEyebrow
                }
              >
                CONTINUE AS
              </Text>

              <Text
                style={
                  styles.sectionDescription
                }
              >
                Select your account type
              </Text>
            </View>


            <View
              style={[
                styles.roleCards,

                isTablet &&
                  styles.roleCardsTablet,
              ]}
            >
              {/* ============================================================
                  CUSTOMER
                  ============================================================ */}

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Continue as Customer"
                accessibilityHint="Sign in or create a StyleHub customer account"
                onPress={
                  openCustomerLogin
                }
                style={({
                  pressed,
                }) => [
                  styles.roleCard,

                  isTablet &&
                    styles.roleCardTablet,

                  pressed &&
                    styles.roleCardPressed,
                ]}
              >
                <View
                  style={
                    styles.roleCardTop
                  }
                >
                  <View
                    style={[
                      styles.roleIcon,

                      styles.customerIcon,
                    ]}
                  >
                    <Ionicons
                      name="person-outline"
                      size={25}
                      color={
                        COLORS.blue
                      }
                    />
                  </View>


                  <View
                    style={
                      styles.arrowButton
                    }
                  >
                    <Ionicons
                      name="arrow-forward"
                      size={18}
                      color={
                        COLORS.navy
                      }
                    />
                  </View>
                </View>


                <View
                  style={
                    styles.roleCopy
                  }
                >
                  <Text
                    style={
                      styles.roleTitle
                    }
                  >
                    Customer
                  </Text>

                  <Text
                    style={
                      styles.roleDescription
                    }
                  >
                    Discover nearby shops, book
                    services and manage your
                    appointments.
                  </Text>
                </View>


                <View
                  style={
                    styles.roleFeatureRow
                  }
                >
                  <View
                    style={
                      styles.roleFeature
                    }
                  >
                    <Ionicons
                      name="search-outline"
                      size={13}
                      color={
                        COLORS.textMuted
                      }
                    />

                    <Text
                      style={
                        styles.roleFeatureText
                      }
                    >
                      Find shops
                    </Text>
                  </View>


                  <View
                    style={
                      styles.featureDot
                    }
                  />


                  <View
                    style={
                      styles.roleFeature
                    }
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={13}
                      color={
                        COLORS.textMuted
                      }
                    />

                    <Text
                      style={
                        styles.roleFeatureText
                      }
                    >
                      Book services
                    </Text>
                  </View>
                </View>
              </Pressable>


              {/* ============================================================
                  SHOP OWNER
                  ============================================================ */}

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Continue as Shop Owner"
                accessibilityHint="Sign in or create a StyleHub shop owner account"
                onPress={
                  openShopOwnerLogin
                }
                style={({
                  pressed,
                }) => [
                  styles.roleCard,

                  styles.shopOwnerCard,

                  isTablet &&
                    styles.roleCardTablet,

                  pressed &&
                    styles.roleCardPressed,
                ]}
              >
                <View
                  style={
                    styles.roleCardTop
                  }
                >
                  <View
                    style={[
                      styles.roleIcon,

                      styles.shopOwnerIcon,
                    ]}
                  >
                    <Ionicons
                      name="storefront-outline"
                      size={25}
                      color={
                        COLORS.orange
                      }
                    />
                  </View>


                  <View
                    style={
                      styles.arrowButton
                    }
                  >
                    <Ionicons
                      name="arrow-forward"
                      size={18}
                      color={
                        COLORS.navy
                      }
                    />
                  </View>
                </View>


                <View
                  style={
                    styles.roleCopy
                  }
                >
                  <View
                    style={
                      styles.shopOwnerTitleRow
                    }
                  >
                    <Text
                      style={
                        styles.roleTitle
                      }
                    >
                      Shop Owner
                    </Text>


                    <View
                      style={
                        styles.businessBadge
                      }
                    >
                      <Text
                        style={
                          styles.businessBadgeText
                        }
                      >
                        BUSINESS
                      </Text>
                    </View>
                  </View>


                  <Text
                    style={
                      styles.roleDescription
                    }
                  >
                    Manage your shop, services,
                    schedules and customer bookings.
                  </Text>
                </View>


                <View
                  style={
                    styles.roleFeatureRow
                  }
                >
                  <View
                    style={
                      styles.roleFeature
                    }
                  >
                    <Ionicons
                      name="cut-outline"
                      size={13}
                      color={
                        COLORS.textMuted
                      }
                    />

                    <Text
                      style={
                        styles.roleFeatureText
                      }
                    >
                      Services
                    </Text>
                  </View>


                  <View
                    style={
                      styles.featureDot
                    }
                  />


                  <View
                    style={
                      styles.roleFeature
                    }
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={13}
                      color={
                        COLORS.textMuted
                      }
                    />

                    <Text
                      style={
                        styles.roleFeatureText
                      }
                    >
                      Bookings
                    </Text>
                  </View>
                </View>
              </Pressable>
            </View>
          </View>


          {/* ================================================================
              FOOTER
              ================================================================ */}

          <View
            style={
              styles.footer
            }
          >
            <View
              style={
                styles.footerLine
              }
            />

            <Text
              style={
                styles.footerText
              }
            >
              STYLEHUB
            </Text>

            <View
              style={
                styles.footerLine
              }
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}


/* ==========================================================================
   STYLES
   ========================================================================== */

const styles =
  StyleSheet.create({
    /* ======================================================================
       ROOT
       ====================================================================== */

    safeArea: {
      flex: 1,

      backgroundColor:
        COLORS.background,
    },


    scrollView: {
      flex: 1,

      backgroundColor:
        COLORS.background,
    },


    scrollContent: {
      flexGrow: 1,
    },


    screen: {
      width: '100%',

      maxWidth: 760,

      flexGrow: 1,

      alignSelf: 'center',

      paddingTop: 18,

      paddingBottom: 28,
    },


    /* ======================================================================
       BRAND
       ====================================================================== */

    brandSection: {
      alignItems: 'center',

      paddingTop: 12,

      paddingBottom: 32,
    },


    brandSectionCompact: {
      paddingTop: 4,

      paddingBottom: 22,
    },


    logoGlow: {
      alignItems: 'center',

      justifyContent: 'center',

      padding: 9,

      borderRadius: 32,

      backgroundColor:
        'rgba(96, 115, 139, 0.05)',

      marginBottom: 16,
    },


    logoFrame: {
      minWidth: 112,

      minHeight: 112,

      alignItems: 'center',

      justifyContent: 'center',

      borderWidth: 1,

      borderColor:
        COLORS.border,

      borderRadius: 28,

      backgroundColor:
        COLORS.white,

      ...Platform.select({
        ios: {
          shadowColor:
            COLORS.black,

          shadowOffset: {
            width: 0,

            height: 8,
          },

          shadowOpacity: 0.06,

          shadowRadius: 20,
        },

        android: {
          elevation: 3,
        },

        default: {
          shadowColor:
            COLORS.black,

          shadowOffset: {
            width: 0,

            height: 8,
          },

          shadowOpacity: 0.06,

          shadowRadius: 20,
        },
      }),
    },


    brandBadge: {
      flexDirection: 'row',

      alignItems: 'center',

      gap: 7,

      paddingHorizontal: 10,

      paddingVertical: 6,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      borderRadius: 999,

      backgroundColor:
        COLORS.surface,

      marginBottom: 13,
    },


    brandBadgeDot: {
      width: 6,

      height: 6,

      borderRadius: 3,

      backgroundColor:
        COLORS.green,
    },


    brandBadgeText: {
      color:
        COLORS.textMuted,

      fontSize: 9,

      fontWeight: '700',

      letterSpacing: 1.2,
    },


    title: {
      color:
        COLORS.text,

      fontSize: 29,

      lineHeight: 36,

      fontWeight: '800',

      letterSpacing: -0.8,

      textAlign: 'center',
    },


    titleSmall: {
      fontSize: 25,

      lineHeight: 31,
    },


    subtitle: {
      maxWidth: 440,

      marginTop: 8,

      color:
        COLORS.textMuted,

      fontSize: 13,

      lineHeight: 20,

      textAlign: 'center',
    },


    /* ======================================================================
       ROLE SECTION
       ====================================================================== */

    roleSection: {
      width: '100%',
    },


    sectionHeading: {
      marginBottom: 12,
    },


    sectionEyebrow: {
      color:
        COLORS.navy,

      fontSize: 10,

      fontWeight: '800',

      letterSpacing: 1.5,
    },


    sectionDescription: {
      marginTop: 3,

      color:
        COLORS.textMuted,

      fontSize: 12,
    },


    roleCards: {
      width: '100%',

      gap: 12,
    },


    roleCardsTablet: {
      flexDirection: 'row',

      alignItems: 'stretch',
    },


    /* ======================================================================
       ROLE CARDS
       ====================================================================== */

    roleCard: {
      width: '100%',

      minHeight: 184,

      padding: 17,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      borderRadius: 20,

      backgroundColor:
        COLORS.surface,

      ...Platform.select({
        ios: {
          shadowColor:
            COLORS.black,

          shadowOffset: {
            width: 0,

            height: 4,
          },

          shadowOpacity: 0.045,

          shadowRadius: 14,
        },

        android: {
          elevation: 2,
        },

        default: {
          shadowColor:
            COLORS.black,

          shadowOffset: {
            width: 0,

            height: 4,
          },

          shadowOpacity: 0.045,

          shadowRadius: 14,
        },
      }),
    },


    roleCardTablet: {
      flex: 1,

      minWidth: 0,
    },


    shopOwnerCard: {
      borderColor:
        '#E4E8ED',
    },


    roleCardPressed: {
      opacity: 0.86,

      transform: [
        {
          scale: 0.99,
        },
      ],
    },


    roleCardTop: {
      flexDirection: 'row',

      alignItems: 'center',

      justifyContent:
        'space-between',
    },


    roleIcon: {
      width: 48,

      height: 48,

      alignItems: 'center',

      justifyContent: 'center',

      borderRadius: 14,
    },


    customerIcon: {
      backgroundColor:
        COLORS.blueSoft,
    },


    shopOwnerIcon: {
      backgroundColor:
        COLORS.orangeSoft,
    },


    arrowButton: {
      width: 35,

      height: 35,

      alignItems: 'center',

      justifyContent: 'center',

      borderWidth: 1,

      borderColor:
        COLORS.border,

      borderRadius: 11,

      backgroundColor:
        COLORS.surfaceSoft,
    },


    roleCopy: {
      marginTop: 14,
    },


    shopOwnerTitleRow: {
      flexDirection: 'row',

      alignItems: 'center',

      flexWrap: 'wrap',

      gap: 7,
    },


    roleTitle: {
      color:
        COLORS.text,

      fontSize: 18,

      lineHeight: 24,

      fontWeight: '800',

      letterSpacing: -0.25,
    },


    businessBadge: {
      paddingHorizontal: 7,

      paddingVertical: 3,

      borderRadius: 999,

      backgroundColor:
        COLORS.orangeSoft,
    },


    businessBadgeText: {
      color:
        COLORS.orange,

      fontSize: 8,

      fontWeight: '800',

      letterSpacing: 0.65,
    },


    roleDescription: {
      marginTop: 5,

      color:
        COLORS.textMuted,

      fontSize: 12,

      lineHeight: 18,
    },


    roleFeatureRow: {
      flexDirection: 'row',

      alignItems: 'center',

      flexWrap: 'wrap',

      gap: 8,

      marginTop: 16,

      paddingTop: 13,

      borderTopWidth: 1,

      borderTopColor:
        COLORS.border,
    },


    roleFeature: {
      flexDirection: 'row',

      alignItems: 'center',

      gap: 5,
    },


    roleFeatureText: {
      color:
        COLORS.textMuted,

      fontSize: 10,

      fontWeight: '600',
    },


    featureDot: {
      width: 3,

      height: 3,

      borderRadius: 2,

      backgroundColor:
        COLORS.textLight,
    },


    /* ======================================================================
       FOOTER
       ====================================================================== */

    footer: {
      flexDirection: 'row',

      alignItems: 'center',

      gap: 12,

      marginTop: 36,

      paddingBottom: 8,
    },


    footerLine: {
      flex: 1,

      height: 1,

      backgroundColor:
        COLORS.border,
    },


    footerText: {
      color:
        COLORS.textLight,

      fontSize: 8,

      fontWeight: '700',

      letterSpacing: 1.8,
    },
  });