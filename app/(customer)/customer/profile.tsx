
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Href, router, useFocusEffect } from 'expo-router';
import type { ComponentProps, ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import StyleHubModal from '@/src/components/StyleHubModal';
import { API_BASE_URL } from '@/src/config/api';
import { COLORS } from '@/src/constants/colors';
import {
  LAYOUT,
  RADII,
  SHADOWS,
  SPACING,
  TYPOGRAPHY,
} from '@/src/constants/design';
import { useAuth } from '@/src/context/AuthContext';
import { ApiError } from '@/src/services/api';
import {
  getCustomerProfile,
  removeCustomerProfilePhoto,
  uploadCustomerProfilePhoto,
} from '@/src/services/customer-profile-api';
import type { AuthUser } from '@/src/types/auth';

type IconName = ComponentProps<typeof Ionicons>['name'];

type ProfileModal =
  | 'photoOptions'
  | 'photoPermission'
  | 'removePhoto'
  | 'logout'
  | null;

/* ==========================================================
   PROFILE PHOTO HELPERS
   ========================================================== */

function resolveProfilePhotoUrl(
  value: string | null | undefined,
): string | null {
  const cleanValue = value?.trim();

  if (!cleanValue) {
    return null;
  }

  if (/^https?:\/\//i.test(cleanValue)) {
    return cleanValue;
  }

  const apiOrigin = API_BASE_URL.replace(
    /\/api\/v1\/?$/i,
    '',
  );

  return `${apiOrigin}${
    cleanValue.startsWith('/') ? '' : '/'
  }${cleanValue}`;
}

function buildPhotoFormData(
  asset: ImagePicker.ImagePickerAsset,
): FormData {
  const formData = new FormData();

  const fileName =
    asset.fileName?.trim() ||
    `stylehub-profile-${Date.now()}.jpg`;

  const mimeType =
    asset.mimeType?.trim() || 'image/jpeg';

  const webAsset =
    asset as ImagePicker.ImagePickerAsset & {
      file?: Blob | null;
    };

  if (Platform.OS === 'web' && webAsset.file) {
    formData.append(
      'photo',
      webAsset.file,
      fileName,
    );

    return formData;
  }

  const nativePhoto = {
    uri: asset.uri,
    name: fileName,
    type: mimeType,
  } as unknown as Blob;

  formData.append('photo', nativePhoto);

  return formData;
}

/* ==========================================================
   ACCOUNT HELPERS
   ========================================================== */

function formatLastLogin(
  value: string | null | undefined,
): string {
  if (!value) {
    return 'Not available';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  try {
    return new Intl.DateTimeFormat('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'Asia/Manila',
    }).format(date);
  } catch {
    return value;
  }
}

function buildCustomerName(
  user: AuthUser | null,
): string {
  if (!user) {
    return 'StyleHub Customer';
  }

  const fullName = user.full_name?.trim();

  if (fullName) {
    return fullName;
  }

  const composedName = [
    user.first_name,
    user.middle_name,
    user.last_name,
  ]
    .filter(
      (value): value is string =>
        typeof value === 'string' &&
        value.trim() !== '',
    )
    .join(' ')
    .trim();

  return composedName || 'StyleHub Customer';
}

/* ==========================================================
   CUSTOMER PROFILE
   ========================================================== */

export default function CustomerProfileScreen() {
  const {
    user,
    token,
    logout,
    isSubmitting,
  } = useAuth();

  const [accountUser, setAccountUser] =
    useState<AuthUser | null>(user);

  const [isLoadingProfile, setIsLoadingProfile] =
    useState(true);

  const [isRefreshing, setIsRefreshing] =
    useState(false);

  const [isUploadingPhoto, setIsUploadingPhoto] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState('');

  const [successMessage, setSuccessMessage] =
    useState('');

  /* Only one modal is active at a time. */

  const [activeModal, setActiveModal] =
    useState<ProfileModal>(null);

  const hasLoadedOnce = useRef(false);

  /* ========================================================
     LOAD CUSTOMER PROFILE
     ======================================================== */

  const loadCustomerProfile = useCallback(
    async (
      refreshing = false,
      silent = false,
    ): Promise<void> => {
      if (!token) {
        setIsLoadingProfile(false);
        setIsRefreshing(false);
        return;
      }

      if (refreshing) {
        setIsRefreshing(true);
      } else if (!silent) {
        setIsLoadingProfile(true);
      }

      setErrorMessage('');

      try {
        const response =
          await getCustomerProfile(token);

        if (response.data.user.role !== 'customer') {
          setErrorMessage(
            'This account is not authorized as a Customer.',
          );

          return;
        }

        setAccountUser(response.data.user);

        hasLoadedOnce.current = true;
      } catch (error) {
        setErrorMessage(
          error instanceof ApiError
            ? error.message
            : 'Unable to load your profile information.',
        );
      } finally {
        setIsLoadingProfile(false);
        setIsRefreshing(false);
      }
    },
    [token],
  );

  useFocusEffect(
    useCallback(() => {
      void loadCustomerProfile(
        false,
        hasLoadedOnce.current,
      );

      return undefined;
    }, [loadCustomerProfile]),
  );

  useEffect(() => {
    if (user?.role === 'customer') {
      setAccountUser(user);
    }
  }, [user]);

  /* ========================================================
     CUSTOMER ACCOUNT INFORMATION
     ======================================================== */

  const currentUser = accountUser ?? user;

  const customerName =
    buildCustomerName(currentUser);

  const customerEmail =
    currentUser?.email || '—';

  const customerPhone =
    currentUser?.phone_number?.trim() || '—';

  const accountStatus =
    currentUser?.status === 'active'
      ? 'Active'
      : 'Suspended';

  const phoneVerified =
    currentUser?.phone_verified === true;

  const profilePhotoUrl = resolveProfilePhotoUrl(
    currentUser?.profile_photo_url ?? null,
  );

  const lastLogin = formatLastLogin(
    currentUser?.last_login_at,
  );

  /* ========================================================
     CHOOSE PROFILE PHOTO
     ======================================================== */

  async function chooseProfilePhoto(): Promise<void> {
    if (!token || isUploadingPhoto) {
      return;
    }

    setActiveModal(null);
    setErrorMessage('');
    setSuccessMessage('');

    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      setActiveModal('photoPermission');
      return;
    }

    const result =
      await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

    if (
      result.canceled ||
      result.assets.length === 0
    ) {
      return;
    }

    setIsUploadingPhoto(true);

    try {
      const response =
        await uploadCustomerProfilePhoto(
          token,
          buildPhotoFormData(result.assets[0]),
        );

      setAccountUser(response.data.user);

      setSuccessMessage(
        response.message ??
          'Your profile photo was updated.',
      );
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : 'Unable to upload your profile photo.',
      );
    } finally {
      setIsUploadingPhoto(false);
    }
  }

  /* ========================================================
     REMOVE PROFILE PHOTO
     ======================================================== */

  async function removeProfilePhoto(): Promise<void> {
    if (!token || isUploadingPhoto) {
      return;
    }

    setActiveModal(null);
    setIsUploadingPhoto(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response =
        await removeCustomerProfilePhoto(token);

      setAccountUser(response.data.user);

      setSuccessMessage(
        response.message ??
          'Your profile photo was removed.',
      );
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : 'Unable to remove your profile photo.',
      );
    } finally {
      setIsUploadingPhoto(false);
    }
  }

  /* ========================================================
     PROFILE PHOTO ACTION
     ======================================================== */

  function handleProfilePhotoPress(): void {
    if (isUploadingPhoto) {
      return;
    }

    if (!profilePhotoUrl) {
      void chooseProfilePhoto();
      return;
    }

    setActiveModal('photoOptions');
  }

  /* ========================================================
     SIGN OUT
     ======================================================== */

  async function handleLogout(): Promise<void> {
    if (isSubmitting) {
      return;
    }

    setActiveModal(null);

    await logout();

    router.replace('/(auth)/role-selection');
  }

  /* ========================================================
     RENDER PROFILE
     ======================================================== */

  return (
    <SafeAreaView
      edges={['top']}
      style={styles.safeArea}
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor={COLORS.background}
        translucent={false}
      />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() =>
              void loadCustomerProfile(true)
            }
            tintColor={COLORS.navy}
            colors={[COLORS.navy]}
          />
        }
        contentContainerStyle={styles.container}
      >
        {/* TOP BAR */}

        <View style={styles.topBar}>
          <View style={styles.topBarTitleBlock}>
            <Text style={styles.topBarTitle}>
              Profile
            </Text>

            <Text style={styles.topBarCaption}>
              Account, preferences &amp; security
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.72}
            accessibilityRole="button"
            accessibilityLabel="Refresh profile"
            disabled={
              isRefreshing ||
              isLoadingProfile
            }
            onPress={() =>
              void loadCustomerProfile(true)
            }
            style={[
              styles.topActionButton,
              (
                isRefreshing ||
                isLoadingProfile
              ) && styles.disabledButton,
            ]}
          >
            {isRefreshing ? (
              <ActivityIndicator
                size="small"
                color={COLORS.navy}
              />
            ) : (
              <Ionicons
                name="refresh-outline"
                size={21}
                color={COLORS.navy}
              />
            )}
          </TouchableOpacity>
        </View>

        {/* PAGE HEADER */}

        <View style={styles.header}>
          <Text style={styles.eyebrow}>
            YOUR ACCOUNT
          </Text>

          <Text style={styles.title}>
            Manage your StyleHub customer profile
          </Text>

          <Text style={styles.subtitle}>
            Keep your personal information,
            profile photo, saved shops, booking
            requests, and account security
            easy to access.
          </Text>
        </View>

        {/* PROFILE MESSAGES */}

        {errorMessage ? (
          <MessageBox
            type="error"
            title="Profile needs attention"
            message={errorMessage}
          />
        ) : null}

        {successMessage ? (
          <MessageBox
            type="success"
            title="Profile updated"
            message={successMessage}
          />
        ) : null}

        {/* PROFILE HERO */}

        <View style={styles.profileHero}>
          <TouchableOpacity
            activeOpacity={0.82}
            disabled={isUploadingPhoto}
            accessibilityRole="button"
            accessibilityLabel="Change profile photo"
            onPress={handleProfilePhotoPress}
            style={styles.photoWrapper}
          >
            {profilePhotoUrl ? (
              <Image
                source={{
                  uri: profilePhotoUrl,
                }}
                resizeMode="cover"
                style={styles.photo}
              />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Ionicons
                  name="person-outline"
                  size={38}
                  color={COLORS.navy}
                />
              </View>
            )}

            {isUploadingPhoto ? (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator
                  size="small"
                  color={COLORS.white}
                />
              </View>
            ) : (
              <View style={styles.photoActionBadge}>
                <Ionicons
                  name="camera-outline"
                  size={17}
                  color={COLORS.white}
                />
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.heroIdentity}>
            <Text
              numberOfLines={2}
              style={styles.heroName}
            >
              {customerName}
            </Text>

            <Text style={styles.heroRole}>
              StyleHub Customer
            </Text>

            <View style={styles.heroBadges}>
              {/* ACCOUNT STATUS */}

              <View
                style={[
                  styles.heroBadge,
                  {
                    backgroundColor:
                      currentUser?.status === 'active'
                        ? COLORS.greenSoft
                        : COLORS.dangerSoft,
                  },
                ]}
              >
                <Ionicons
                  name={
                    currentUser?.status === 'active'
                      ? 'checkmark-circle-outline'
                      : 'alert-circle-outline'
                  }
                  size={13}
                  color={
                    currentUser?.status === 'active'
                      ? COLORS.green
                      : COLORS.danger
                  }
                />

                <Text
                  style={[
                    styles.heroBadgeText,
                    {
                      color:
                        currentUser?.status === 'active'
                          ? COLORS.green
                          : COLORS.danger,
                    },
                  ]}
                >
                  {accountStatus}
                </Text>
              </View>

              {/* PHONE VERIFICATION */}

              <View
                style={[
                  styles.heroBadge,
                  {
                    backgroundColor: phoneVerified
                      ? COLORS.blueSoft
                      : COLORS.warningSoft,
                  },
                ]}
              >
                <Ionicons
                  name={
                    phoneVerified
                      ? 'shield-checkmark-outline'
                      : 'time-outline'
                  }
                  size={13}
                  color={
                    phoneVerified
                      ? COLORS.blue
                      : COLORS.warning
                  }
                />

                <Text
                  style={[
                    styles.heroBadgeText,
                    {
                      color: phoneVerified
                        ? COLORS.blue
                        : COLORS.warning,
                    },
                  ]}
                >
                  {phoneVerified
                    ? 'Phone verified'
                    : 'Verification pending'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* PROFILE HERO FOOTER */}

        <View style={styles.heroFooter}>
          <HeroStat
            icon="mail-outline"
            label="Email"
            value={customerEmail}
          />

          <View style={styles.heroFooterDivider} />

          <HeroStat
            icon="time-outline"
            label="Last sign-in"
            value={lastLogin}
          />
        </View>

        {/* ACCOUNT INFORMATION */}

        <SectionHeading
          title="Account information"
          subtitle="Personal details returned by your authenticated StyleHub account."
        />

        {isLoadingProfile ? (
          <View style={styles.loadingCard}>
            <View style={styles.loadingCardIcon}>
              <ActivityIndicator
                size="small"
                color={COLORS.navy}
              />
            </View>

            <View style={styles.loadingCardCopy}>
              <Text style={styles.loadingCardTitle}>
                Loading account information
              </Text>

              <Text style={styles.loadingCardText}>
                Getting your latest customer
                profile from Laravel.
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.infoCard}>
            <InfoRow
              icon="person-outline"
              label="Full name"
              value={customerName}
            />

            <Divider />

            <InfoRow
              icon="mail-outline"
              label="Email address"
              value={customerEmail}
            />

            <Divider />

            <InfoRow
              icon="call-outline"
              label="Mobile number"
              value={customerPhone}
              trailing={
                <VerificationBadge
                  verified={phoneVerified}
                />
              }
            />

            <Divider />

            <InfoRow
              icon="shield-checkmark-outline"
              label="Account status"
              value={accountStatus}
            />
          </View>
        )}

        {/* EDIT PERSONAL INFORMATION */}

        <TouchableOpacity
          activeOpacity={0.82}
          accessibilityRole="button"
          accessibilityLabel="Edit personal information"
          onPress={() =>
            router.push(
              '/(customer)/edit-personal-information' as Href,
            )
          }
          style={styles.primaryActionCard}
        >
          <View style={styles.primaryActionIcon}>
            <Ionicons
              name="create-outline"
              size={20}
              color={COLORS.violet}
            />
          </View>

          <View style={styles.primaryActionCopy}>
            <Text style={styles.primaryActionTitle}>
              Edit personal information
            </Text>

            <Text style={styles.primaryActionText}>
              Update your name, email address,
              or mobile number using the
              existing secure profile flow.
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={19}
            color={COLORS.textLight}
          />
        </TouchableOpacity>

        {/* YOUR STYLEHUB */}

        <SectionHeading
          title="Your StyleHub"
          subtitle="Quick access to account-related customer features."
        />

        <View style={styles.menuCard}>
          <MenuRow
            icon="bookmark-outline"
            iconBackground={COLORS.violetSoft}
            iconColor={COLORS.violet}
            title="Saved shops"
            description="Open the shops you bookmarked for quick access."
            onPress={() =>
              router.push(
                '/(customer)/saved-shops' as Href,
              )
            }
          />

          <MenuDivider />

          <MenuRow
            icon="swap-horizontal-outline"
            iconBackground={COLORS.blueSoft}
            iconColor={COLORS.blue}
            title="Reschedule requests"
            description="Track pending, approved, rejected, and withdrawn requests."
            onPress={() =>
              router.push(
                '/(customer)/reschedule-requests' as Href,
              )
            }
          />

          <MenuDivider />

          <MenuRow
            icon="notifications-outline"
            iconBackground={COLORS.orangeSoft}
            iconColor={COLORS.orange}
            title="Notifications"
            description="Review your latest StyleHub account and booking updates."
            onPress={() =>
              router.push(
                '/(customer)/customer/notifications' as Href,
              )
            }
          />
        </View>

        {/* ACCOUNT SECURITY */}

        <SectionHeading
          title="Account security"
          subtitle="Keep your account protected and manage password security."
        />

        <TouchableOpacity
          activeOpacity={0.82}
          accessibilityRole="button"
          accessibilityLabel="Open account security"
          onPress={() =>
            router.push(
              '/(customer)/customer-security' as Href,
            )
          }
          style={styles.securityCard}
        >
          <View style={styles.securityIcon}>
            <Ionicons
              name="lock-closed-outline"
              size={21}
              color={COLORS.green}
            />
          </View>

          <View style={styles.securityCopy}>
            <Text style={styles.securityTitle}>
              Password &amp; sessions
            </Text>

            <Text style={styles.securityText}>
              Change your password and use
              the existing security flow to
              sign out other StyleHub sessions.
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={19}
            color={COLORS.textLight}
          />
        </TouchableOpacity>

        {/* SECURITY NOTICE */}

        <View style={styles.securityNotice}>
          <Ionicons
            name="shield-checkmark-outline"
            size={18}
            color={COLORS.green}
          />

          <Text style={styles.securityNoticeText}>
            Your verification and account
            status come from Laravel.
            The mobile app does not mark
            an account verified or active
            on its own.
          </Text>
        </View>

        {/* SIGN OUT BUTTON */}

        <TouchableOpacity
          activeOpacity={0.82}
          disabled={isSubmitting}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          onPress={() => setActiveModal('logout')}
          style={[
            styles.logoutButton,
            isSubmitting && styles.disabledButton,
          ]}
        >
          {isSubmitting ? (
            <ActivityIndicator
              size="small"
              color={COLORS.danger}
            />
          ) : (
            <Ionicons
              name="log-out-outline"
              size={18}
              color={COLORS.danger}
            />
          )}

          <Text style={styles.logoutText}>
            {isSubmitting
              ? 'Signing out...'
              : 'Sign out'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ==================================================
          SHARED STYLEHUB MODAL

          Handles:
          - Photo options
          - Photo permission warning
          - Remove photo confirmation
          - Sign out confirmation
          ================================================== */}

      <StyleHubModal
        visible={activeModal !== null}
        onClose={() => {
          if (
            !isSubmitting &&
            !isUploadingPhoto
          ) {
            setActiveModal(null);
          }
        }}
        title={
          activeModal === 'photoOptions'
            ? 'Profile photo'
            : activeModal === 'photoPermission'
              ? 'Photo access needed'
              : activeModal === 'removePhoto'
                ? 'Remove profile photo?'
                : 'Sign out of StyleHub?'
        }
        message={
          activeModal === 'photoOptions'
            ? 'Choose what you would like to do with your photo.'
            : activeModal === 'photoPermission'
              ? 'Allow photo-library access in your phone settings to choose a profile picture.'
              : activeModal === 'removePhoto'
                ? 'Your current picture will be removed and the default profile icon will appear.'
                : 'You will return to role selection and need to sign in again.'
        }
        tone={
          activeModal === 'photoPermission'
            ? 'warning'
            : activeModal === 'removePhoto' ||
                activeModal === 'logout'
              ? 'danger'
              : 'info'
        }
        icon={
          activeModal === 'photoOptions'
            ? 'camera-outline'
            : activeModal === 'photoPermission'
              ? 'images-outline'
              : activeModal === 'removePhoto'
                ? 'trash-outline'
                : 'log-out-outline'
        }
        dismissOnBackdrop={
          activeModal !== 'removePhoto' &&
          activeModal !== 'logout' &&
          !isSubmitting &&
          !isUploadingPhoto
        }
        actions={
          activeModal === 'photoOptions'
            ? [
                {
                  label: 'Close',
                  variant: 'secondary',
                  onPress: () =>
                    setActiveModal(null),
                },
              ]
            : activeModal === 'photoPermission'
              ? [
                  {
                    label: 'Got it',
                    variant: 'primary',
                    onPress: () =>
                      setActiveModal(null),
                  },
                ]
              : activeModal === 'removePhoto'
                ? [
                    {
                      label: 'Keep photo',
                      variant: 'secondary',
                      onPress: () =>
                        setActiveModal(null),
                    },
                    {
                      label: 'Remove photo',
                      variant: 'danger',
                      icon: 'trash-outline',
                      disabled: isUploadingPhoto,
                      onPress: () =>
                        void removeProfilePhoto(),
                    },
                  ]
                : activeModal === 'logout'
                  ? [
                      {
                        label: 'Stay signed in',
                        variant: 'secondary',
                        onPress: () =>
                          setActiveModal(null),
                      },
                      {
                        label: 'Sign out',
                        variant: 'danger',
                        icon: 'log-out-outline',
                        loading: isSubmitting,
                        onPress: () =>
                          void handleLogout(),
                      },
                    ]
                  : []
        }
      >
        {activeModal === 'photoOptions' ? (
          <View style={styles.photoOptionList}>
            {/* CHOOSE NEW PHOTO */}

            <TouchableOpacity
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Choose new profile photo"
              disabled={isUploadingPhoto}
              onPress={() =>
                void chooseProfilePhoto()
              }
              style={styles.photoOption}
            >
              <View style={styles.photoOptionIcon}>
                <Ionicons
                  name="images-outline"
                  size={19}
                  color={COLORS.navy}
                />
              </View>

              <View style={styles.photoOptionTextBlock}>
                <Text style={styles.photoOptionTitle}>
                  Choose new photo
                </Text>

                <Text
                  style={styles.photoOptionDescription}
                >
                  Select a picture from your library.
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={17}
                color={COLORS.textLight}
              />
            </TouchableOpacity>

            {/* REMOVE EXISTING PHOTO */}

            <TouchableOpacity
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Remove current profile photo"
              disabled={isUploadingPhoto}
              onPress={() =>
                setActiveModal('removePhoto')
              }
              style={[
                styles.photoOption,
                styles.photoOptionDanger,
              ]}
            >
              <View
                style={[
                  styles.photoOptionIcon,
                  styles.photoOptionDangerIcon,
                ]}
              >
                <Ionicons
                  name="trash-outline"
                  size={19}
                  color={COLORS.danger}
                />
              </View>

              <View style={styles.photoOptionTextBlock}>
                <Text
                  style={[
                    styles.photoOptionTitle,
                    {
                      color: COLORS.danger,
                    },
                  ]}
                >
                  Remove current photo
                </Text>

                <Text
                  style={styles.photoOptionDescription}
                >
                  Use the default profile icon.
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={17}
                color={COLORS.danger}
              />
            </TouchableOpacity>
          </View>
        ) : null}
      </StyleHubModal>
    </SafeAreaView>
  );
}

/* ==========================================================
   REUSABLE PROFILE COMPONENTS
   ========================================================== */

function SectionHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.sectionTitle}>
        {title}
      </Text>

      <Text style={styles.sectionSubtitle}>
        {subtitle}
      </Text>
    </View>
  );
}

function HeroStat({
  icon,
  label,
  value,
}: {
  icon: IconName;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.heroStat}>
      <View style={styles.heroStatLabelRow}>
        <Ionicons
          name={icon}
          size={13}
          color={COLORS.textLight}
        />

        <Text style={styles.heroStatLabel}>
          {label}
        </Text>
      </View>

      <Text
        numberOfLines={2}
        style={styles.heroStatValue}
      >
        {value}
      </Text>
    </View>
  );
}

function VerificationBadge({
  verified,
}: {
  verified: boolean;
}) {
  return (
    <View
      style={[
        styles.verificationBadge,
        {
          backgroundColor: verified
            ? COLORS.greenSoft
            : COLORS.warningSoft,
        },
      ]}
    >
      <Ionicons
        name={
          verified
            ? 'checkmark-circle-outline'
            : 'time-outline'
        }
        size={12}
        color={
          verified
            ? COLORS.green
            : COLORS.warning
        }
      />

      <Text
        style={[
          styles.verificationBadgeText,
          {
            color: verified
              ? COLORS.green
              : COLORS.warning,
          },
        ]}
      >
        {verified ? 'Verified' : 'Pending'}
      </Text>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
  trailing,
}: {
  icon: IconName;
  label: string;
  value: string;
  trailing?: ReactNode;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Ionicons
          name={icon}
          size={18}
          color={COLORS.navy}
        />
      </View>

      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>
          {label}
        </Text>

        <Text
          numberOfLines={2}
          style={styles.infoValue}
        >
          {value}
        </Text>
      </View>

      {trailing ? (
        <View style={styles.infoTrailing}>
          {trailing}
        </View>
      ) : null}
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

function MenuRow({
  icon,
  iconBackground,
  iconColor,
  title,
  description,
  onPress,
}: {
  icon: IconName;
  iconBackground: string;
  iconColor: string;
  title: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      accessibilityRole="button"
      onPress={onPress}
      style={styles.menuRow}
    >
      <View
        style={[
          styles.menuIcon,
          {
            backgroundColor: iconBackground,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={20}
          color={iconColor}
        />
      </View>

      <View style={styles.menuCopy}>
        <Text style={styles.menuTitle}>
          {title}
        </Text>

        <Text style={styles.menuText}>
          {description}
        </Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={18}
        color={COLORS.textLight}
      />
    </TouchableOpacity>
  );
}

function MenuDivider() {
  return <View style={styles.menuDivider} />;
}

function MessageBox({
  type,
  title,
  message,
}: {
  type: 'success' | 'error';
  title: string;
  message: string;
}) {
  const success = type === 'success';

  return (
    <View
      style={[
        styles.messageBox,
        {
          backgroundColor: success
            ? COLORS.successSoft
            : COLORS.dangerSoft,
        },
      ]}
    >
      <View style={styles.messageIcon}>
        <Ionicons
          name={
            success
              ? 'checkmark-circle-outline'
              : 'alert-circle-outline'
          }
          size={20}
          color={
            success
              ? COLORS.success
              : COLORS.danger
          }
        />
      </View>

      <View style={styles.messageContent}>
        <Text
          style={[
            styles.messageTitle,
            {
              color: success
                ? COLORS.success
                : COLORS.danger,
            },
          ]}
        >
          {title}
        </Text>

        <Text style={styles.messageText}>
          {message}
        </Text>
      </View>
    </View>
  );
}

/* ==========================================================
   PROFILE STYLES
   ========================================================== */

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  scrollView: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  container: {
    width: '100%',
    maxWidth: LAYOUT.contentMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: LAYOUT.screenPadding,
    paddingTop: 40,
    paddingBottom: 20,
  },

  /* TOP BAR */

  topBar: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  topBarTitleBlock: {
    flex: 1,
  },

  topBarTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.cardTitle,
    fontWeight: '800',
  },

  topBarCaption: {
    marginTop: 1,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
  },

  topActionButton: {
    width: LAYOUT.iconButtonSize,
    height: LAYOUT.iconButtonSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
  },

  /* PAGE HEADER */

  header: {
    marginTop: SPACING.lg,
  },

  eyebrow: {
    color: COLORS.accent,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '800',
    letterSpacing: 1.2,
  },

  title: {
    maxWidth: 590,
    marginTop: 5,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.title,
    lineHeight: 30,
    fontWeight: '800',
    letterSpacing: -0.6,
  },

  subtitle: {
    maxWidth: 620,
    marginTop: 8,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.body,
    lineHeight: 21,
  },

  /* STATUS MESSAGES */

  messageBox: {
    marginTop: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: RADII.md,
  },

  messageIcon: {
    width: 31,
    height: 31,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: COLORS.surface,
  },

  messageContent: {
    flex: 1,
  },

  messageTitle: {
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  messageText: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
  },

  /* PROFILE HERO */

  profileHero: {
    marginTop: SPACING.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    padding: 18,
    paddingBottom: 16,
    borderTopLeftRadius: RADII.xl,
    borderTopRightRadius: RADII.xl,
    backgroundColor: COLORS.primary,
    ...SHADOWS.card,
  },

  photoWrapper: {
    width: 84,
    height: 84,
    position: 'relative',
    flexShrink: 0,
  },

  photo: {
    width: 84,
    height: 84,
    borderWidth: 3,
    borderColor: COLORS.navyMuted,
    borderRadius: 28,
  },

  photoPlaceholder: {
    width: 84,
    height: 84,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.navyMuted,
    borderRadius: 28,
    backgroundColor: COLORS.accentSoft,
  },

  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
    backgroundColor: 'rgba(23, 33, 43, 0.62)',
  },

  photoActionBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.primary,
    borderRadius: 17,
    backgroundColor: COLORS.violet,
  },

  heroIdentity: {
    flex: 1,
    minWidth: 0,
  },

  heroName: {
    color: COLORS.white,
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '800',
    letterSpacing: -0.4,
  },

  heroRole: {
    marginTop: 3,
    color: '#D4DAE1',
    fontSize: TYPOGRAPHY.caption,
    fontWeight: '600',
  },

  heroBadges: {
    marginTop: 11,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },

  heroBadge: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    borderRadius: RADII.pill,
  },

  heroBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },

  /* PROFILE HERO FOOTER */

  heroFooter: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 16,
    borderBottomLeftRadius: RADII.xl,
    borderBottomRightRadius: RADII.xl,
    backgroundColor: COLORS.primarySoft,
  },

  heroStat: {
    flex: 1,
    minWidth: 0,
  },

  heroStatLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  heroStatLabel: {
    color: '#AEB8C5',
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '600',
  },

  heroStatValue: {
    marginTop: 4,
    color: COLORS.white,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
    fontWeight: '700',
  },

  heroFooterDivider: {
    width: 1,
    marginHorizontal: 13,
    backgroundColor: COLORS.navyMuted,
  },

  /* SECTION HEADINGS */

  sectionHeading: {
    marginTop: SPACING.xxl,
    marginBottom: 12,
  },

  sectionTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.section,
    fontWeight: '800',
    letterSpacing: -0.3,
  },

  sectionSubtitle: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 17,
  },

  /* LOADING */

  loadingCard: {
    minHeight: 84,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.surface,
  },

  loadingCardIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: COLORS.accentSoft,
  },

  loadingCardCopy: {
    flex: 1,
  },

  loadingCardTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  loadingCardText: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    lineHeight: 16,
  },

  /* ACCOUNT INFORMATION */

  infoCard: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.surface,
    ...SHADOWS.card,
  },

  infoRow: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  infoIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.accentSoft,
  },

  infoContent: {
    flex: 1,
    minWidth: 0,
  },

  infoLabel: {
    color: COLORS.textLight,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '600',
  },

  infoValue: {
    marginTop: 3,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.body,
    lineHeight: 19,
    fontWeight: '700',
  },

  infoTrailing: {
    flexShrink: 0,
  },

  verificationBadge: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    borderRadius: RADII.pill,
  },

  verificationBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },

  divider: {
    height: 1,
    marginLeft: 63,
    backgroundColor: COLORS.border,
  },

  /* EDIT PERSONAL INFORMATION */

  primaryActionCard: {
    minHeight: 82,
    marginTop: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.surface,
  },

  primaryActionIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: COLORS.violetSoft,
  },

  primaryActionCopy: {
    flex: 1,
  },

  primaryActionTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  primaryActionText: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    lineHeight: 16,
  },

  /* YOUR STYLEHUB MENU */

  menuCard: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.surface,
    ...SHADOWS.card,
  },

  menuRow: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  menuIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },

  menuCopy: {
    flex: 1,
  },

  menuTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  menuText: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    lineHeight: 16,
  },

  menuDivider: {
    height: 1,
    marginLeft: 67,
    backgroundColor: COLORS.border,
  },

  /* ACCOUNT SECURITY */

  securityCard: {
    minHeight: 86,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.surface,
    ...SHADOWS.card,
  },

  securityIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: COLORS.greenSoft,
  },

  securityCopy: {
    flex: 1,
  },

  securityTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  securityText: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    lineHeight: 16,
  },

  securityNotice: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: RADII.md,
    backgroundColor: COLORS.greenSoft,
  },

  securityNoticeText: {
    flex: 1,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    lineHeight: 16,
  },

  /* SIGN OUT BUTTON */

  logoutButton: {
    minHeight: LAYOUT.buttonHeight,
    marginTop: SPACING.xxl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderWidth: 1,
    borderColor: COLORS.danger,
    borderRadius: RADII.md,
    backgroundColor: COLORS.dangerSoft,
  },

  logoutText: {
    color: COLORS.danger,
    fontSize: TYPOGRAPHY.body,
    fontWeight: '800',
  },

  /* MODAL PHOTO OPTIONS */

  photoOptionList: {
    width: '100%',
    gap: 8,
  },

  photoOption: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 11,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceSoft,
  },

  photoOptionIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: COLORS.accentSoft,
  },

  photoOptionTextBlock: {
    flex: 1,
    minWidth: 0,
  },

  photoOptionTitle: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
  },

  photoOptionDescription: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: 10,
    lineHeight: 15,
  },

  photoOptionDanger: {
    borderColor: '#F2D5D5',
    backgroundColor: '#FFF9F9',
  },

  photoOptionDangerIcon: {
    backgroundColor: COLORS.dangerSoft,
  },

  disabledButton: {
    opacity: 0.48,
  },
});
