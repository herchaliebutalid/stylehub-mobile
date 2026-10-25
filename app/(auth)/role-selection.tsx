
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

/* ==========================================================
   STYLEHUB ROLE SELECTION
   Dark Navy + Warm Orange + White
   ========================================================== */

const THEME = {
  navy: '#08131F',
  navyDark: '#06101A',
  navyLight: '#162635',

  orange: '#D99202',
  orangeDark: '#C78200',
  orangeSoft: '#F8E8CC',

  white: '#FFFFFF',
  offWhite: '#F7F8FA',

  text: '#152432',
  muted: '#6B7A89',
  mutedLight: '#B7C2CE',

  border: '#E7EBF0',
  customerSoft: '#EEF3F8',
};

export default function RoleSelectionScreen() {
  const router = useRouter();

  const { width, height } = useWindowDimensions();

  /* RESPONSIVE SETTINGS */

  const isSmallPhone = width < 360;
  const isShortScreen = height < 700;
  const isTablet = width >= 720;

  const horizontalPadding = isTablet
    ? 32
    : isSmallPhone
      ? 16
      : 22;

  const logoSize = isTablet
    ? 105
    : isSmallPhone
      ? 80
      : isShortScreen
        ? 85
        : 95;

  /* NAVIGATION */

  function openCustomerLogin() {
    router.push('/(auth)/customer-login');
  }

  function openShopOwnerLogin() {
    router.push('/(auth)/shop-owner-login');
  }

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={styles.safeArea}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor={THEME.navyDark}
        translucent={false}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        <View
          style={[
            styles.screen,
            {
              paddingHorizontal: horizontalPadding,
              paddingTop: isShortScreen ? 42 : 60,
            },
          ]}
        >
          {/* ============================================
              BRAND SECTION
              ============================================ */}

          <View
            style={[
              styles.brandSection,
              isShortScreen && styles.brandSectionCompact,
            ]}
          >
            {/* ORIGINAL STYLEHUB LOGO */}

            <View style={styles.logoOuter}>
              <View style={styles.logoFrame}>
                <Image
                  source={require('../../assets/images/stylehub-splash.png')}
                  resizeMode="contain"
                  style={{
                    width: logoSize,
                    height: logoSize,
                  }}
                />
              </View>
            </View>

            {/* BRAND BADGE */}

            <View style={styles.brandBadge}>
              <View style={styles.brandBadgeDot} />

              <Text style={styles.brandBadgeText}>
                BEAUTY & GROOMING
              </Text>
            </View>

            {/* WELCOME TITLE */}

            <Text
              style={[
                styles.title,
                isSmallPhone && styles.titleSmall,
              ]}
            >
              Welcome to{' '}
              <Text style={styles.titleAccent}>
                StyleHub
              </Text>
            </Text>

            <Text style={styles.subtitle}>
              Your beauty experience starts here.
              {'\n'}
              Choose how you'd like to continue.
            </Text>

            <View style={styles.brandAccentLine} />
          </View>

          {/* ============================================
              ROLE SECTION
              ============================================ */}

          <View style={styles.roleSection}>
            <View style={styles.sectionHeading}>
              <View style={styles.sectionLabelRow}>
                <View style={styles.sectionLabelLine} />

                <Text style={styles.sectionEyebrow}>
                  CHOOSE YOUR EXPERIENCE
                </Text>
              </View>

              <Text style={styles.sectionDescription}>
                Select your account type to get started
              </Text>
            </View>

            <View
              style={[
                styles.roleCards,
                isTablet && styles.roleCardsTablet,
              ]}
            >
              {/* ========================================
                  CUSTOMER CARD
                  ======================================== */}

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Continue as Customer"
                accessibilityHint="Sign in or create a StyleHub customer account"
                onPress={openCustomerLogin}
                style={({ pressed }) => [
                  styles.roleCard,
                  isTablet && styles.roleCardTablet,
                  pressed && styles.roleCardPressed,
                ]}
              >
                <View style={styles.customerAccent} />

                <View style={styles.cardInner}>
                  {/* CUSTOMER ICON AND ARROW */}

                  <View style={styles.roleCardTop}>
                    <View
                      style={[
                        styles.roleIcon,
                        styles.customerIcon,
                      ]}
                    >
                      <Ionicons
                        name="person-outline"
                        size={24}
                        color={THEME.navy}
                      />
                    </View>

                    <View style={styles.arrowButton}>
                      <Ionicons
                        name="arrow-forward"
                        size={20}
                        color={THEME.orangeDark}
                      />
                    </View>
                  </View>

                  {/* CUSTOMER DETAILS */}

                  <View style={styles.roleCopy}>
                    <Text style={styles.roleTitle}>
                      Customer
                    </Text>

                    <Text style={styles.roleDescription}>
                      Discover nearby beauty shops, book
                      services and manage your appointments
                      effortlessly.
                    </Text>
                  </View>

                  {/* CUSTOMER FEATURES */}

                  <View style={styles.roleFeatureRow}>
                    <View style={styles.roleFeature}>
                      <Ionicons
                        name="search-outline"
                        size={14}
                        color={THEME.orangeDark}
                      />

                      <Text style={styles.roleFeatureText}>
                        Find shops
                      </Text>
                    </View>

                    <View style={styles.featureDot} />

                    <View style={styles.roleFeature}>
                      <Ionicons
                        name="calendar-outline"
                        size={14}
                        color={THEME.orangeDark}
                      />

                      <Text style={styles.roleFeatureText}>
                        Book services
                      </Text>
                    </View>
                  </View>
                </View>
              </Pressable>

              {/* ========================================
                  SHOP OWNER CARD
                  ======================================== */}

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Continue as Shop Owner"
                accessibilityHint="Sign in or create a StyleHub shop owner account"
                onPress={openShopOwnerLogin}
                style={({ pressed }) => [
                  styles.roleCard,
                  styles.shopOwnerCard,
                  isTablet && styles.roleCardTablet,
                  pressed && styles.roleCardPressed,
                ]}
              >
                <View style={styles.ownerAccent} />

                <View style={styles.cardInner}>
                  {/* SHOP OWNER ICON AND ARROW */}

                  <View style={styles.roleCardTop}>
                    <View
                      style={[
                        styles.roleIcon,
                        styles.shopOwnerIcon,
                      ]}
                    >
                      <Ionicons
                        name="storefront-outline"
                        size={24}
                        color={THEME.orangeDark}
                      />
                    </View>

                    <View style={styles.arrowButton}>
                      <Ionicons
                        name="arrow-forward"
                        size={20}
                        color={THEME.orangeDark}
                      />
                    </View>
                  </View>

                  {/* SHOP OWNER DETAILS */}

                  <View style={styles.roleCopy}>
                    <View style={styles.shopOwnerTitleRow}>
                      <Text style={styles.roleTitle}>
                        Shop Owner
                      </Text>

                      <View style={styles.businessBadge}>
                        <Text style={styles.businessBadgeText}>
                          BUSINESS
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.roleDescription}>
                      Grow your business, manage services,
                      organize schedules and handle customer
                      bookings.
                    </Text>
                  </View>

                  {/* SHOP OWNER FEATURES */}

                  <View style={styles.roleFeatureRow}>
                    <View style={styles.roleFeature}>
                      <Ionicons
                        name="cut-outline"
                        size={14}
                        color={THEME.orangeDark}
                      />

                      <Text style={styles.roleFeatureText}>
                        Services
                      </Text>
                    </View>

                    <View style={styles.featureDot} />

                    <View style={styles.roleFeature}>
                      <Ionicons
                        name="calendar-outline"
                        size={14}
                        color={THEME.orangeDark}
                      />

                      <Text style={styles.roleFeatureText}>
                        Bookings
                      </Text>
                    </View>
                  </View>
                </View>
              </Pressable>
            </View>
          </View>

          {/* ============================================
              FOOTER
              ============================================ */}

          <View style={styles.footer}>
            <View style={styles.footerLine} />

            <View style={styles.footerContent}>
              <View style={styles.footerDot} />

              <Text style={styles.footerText}>
                STYLEHUB
              </Text>

              <View style={styles.footerDot} />
            </View>

            <View style={styles.footerLine} />
          </View>

          <Text style={styles.footerCaption}>
            Beauty made simple.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ==========================================================
   STYLES
   ========================================================== */

const styles = StyleSheet.create({
  /* ROOT */

  safeArea: {
    flex: 1,
    backgroundColor: THEME.navyDark,
  },

  scrollView: {
    flex: 1,
    backgroundColor: THEME.navy,
  },

  scrollContent: {
    flexGrow: 1,
  },

  screen: {
    width: '100%',
    maxWidth: 760,
    flexGrow: 1,
    alignSelf: 'center',
    paddingBottom: 36,
  },

  /* BRAND SECTION */

  brandSection: {
    alignItems: 'center',
    paddingBottom: 35,
  },

  brandSectionCompact: {
    paddingBottom: 25,
  },

  /* ORIGINAL LOGO */

  logoOuter: {
    padding: 7,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 34,
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginBottom: 20,
  },

  logoFrame: {
    minWidth: 110,
    minHeight: 110,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 27,
    backgroundColor: THEME.white,

    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: {
          width: 0,
          height: 8,
        },
        shadowOpacity: 0.18,
        shadowRadius: 20,
      },
      android: {
        elevation: 7,
      },
      default: {
        elevation: 3,
      },
    }),
  },

  /* BRAND BADGE */

  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(217,146,2,0.32)',
    borderRadius: 999,
    backgroundColor: 'rgba(217,146,2,0.10)',
    marginBottom: 15,
  },

  brandBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.orange,
  },

  brandBadgeText: {
    color: THEME.orange,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
  },

  /* WELCOME */

  title: {
    color: THEME.white,
    fontSize: 29,
    lineHeight: 37,
    fontWeight: '800',
    letterSpacing: -0.9,
    textAlign: 'center',
  },

  titleAccent: {
    color: THEME.orange,
  },

  titleSmall: {
    fontSize: 25,
    lineHeight: 33,
  },

  subtitle: {
    maxWidth: 400,
    marginTop: 10,
    color: THEME.mutedLight,
    fontSize: 13,
    lineHeight: 21,
    textAlign: 'center',
  },

  brandAccentLine: {
    width: 35,
    height: 3,
    marginTop: 21,
    borderRadius: 999,
    backgroundColor: THEME.orange,
  },

  /* ROLE SECTION */

  roleSection: {
    width: '100%',
  },

  sectionHeading: {
    marginBottom: 17,
  },

  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },

  sectionLabelLine: {
    width: 19,
    height: 2,
    borderRadius: 999,
    backgroundColor: THEME.orange,
  },

  sectionEyebrow: {
    color: THEME.white,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.7,
  },

  sectionDescription: {
    marginTop: 7,
    color: THEME.mutedLight,
    fontSize: 12,
    lineHeight: 18,
  },

  roleCards: {
    width: '100%',
    gap: 14,
  },

  roleCardsTablet: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },

  /* WHITE RECTANGULAR CARDS */

  roleCard: {
    width: '100%',
    minHeight: 194,
    overflow: 'hidden',
    borderRadius: 17,
    backgroundColor: THEME.white,

    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: {
          width: 0,
          height: 7,
        },
        shadowOpacity: 0.16,
        shadowRadius: 18,
      },
      android: {
        elevation: 5,
      },
      default: {
        elevation: 3,
      },
    }),
  },

  roleCardTablet: {
    flex: 1,
    width: 'auto',
    minWidth: 0,
  },

  shopOwnerCard: {
    backgroundColor: THEME.white,
  },

  roleCardPressed: {
    opacity: 0.93,
    transform: [
      {
        scale: 0.985,
      },
    ],
  },

  cardInner: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 17,
    paddingBottom: 15,
  },

  /* CARD ACCENTS */

  customerAccent: {
    position: 'absolute',
    top: 17,
    bottom: 17,
    left: 0,
    width: 4,
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
    backgroundColor: THEME.navyLight,
  },

  ownerAccent: {
    position: 'absolute',
    top: 17,
    bottom: 17,
    left: 0,
    width: 4,
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
    backgroundColor: THEME.orange,
  },

  /* ICONS */

  roleCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  roleIcon: {
    width: 45,
    height: 45,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
  },

  customerIcon: {
    backgroundColor: THEME.customerSoft,
  },

  shopOwnerIcon: {
    backgroundColor: THEME.orangeSoft,
  },

  arrowButton: {
    width: 37,
    height: 37,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: THEME.orangeSoft,
  },

  /* CARD CONTENT */

  roleCopy: {
    marginTop: 13,
  },

  roleTitle: {
    color: THEME.text,
    fontSize: 19,
    lineHeight: 25,
    fontWeight: '800',
    letterSpacing: -0.4,
  },

  shopOwnerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },

  businessBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: THEME.orangeSoft,
  },

  businessBadgeText: {
    color: THEME.orangeDark,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.7,
  },

  roleDescription: {
    maxWidth: 450,
    marginTop: 5,
    color: THEME.muted,
    fontSize: 12,
    lineHeight: 18,
  },

  /* CARD FEATURES */

  roleFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 9,
    marginTop: 15,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
  },

  roleFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  roleFeatureText: {
    color: THEME.muted,
    fontSize: 10,
    fontWeight: '700',
  },

  featureDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: THEME.mutedLight,
  },

  /* FOOTER */

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 33,
  },

  footerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },

  footerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  footerDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: THEME.orange,
  },

  footerText: {
    color: THEME.mutedLight,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 2,
  },

  footerCaption: {
    marginTop: 10,
    color: THEME.mutedLight,
    fontSize: 10,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
});
