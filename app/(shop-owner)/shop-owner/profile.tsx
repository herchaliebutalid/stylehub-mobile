
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect } from 'expo-router';
import type { ComponentProps, ReactNode } from 'react';
import { useCallback, useMemo, useState } from 'react';
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
import { getShopOwnerAccount } from '@/src/services/shop-owner-api';
import {
  removeShopOwnerProfilePhoto,
  uploadShopOwnerProfilePhoto,
} from '@/src/services/shop-owner-profile-api';
import type { AuthUser } from '@/src/types/auth';
import type { ShopOwnerShop } from '@/src/types/shop-owner';

type IconName = ComponentProps<typeof Ionicons>['name'];
type ProfileModal =
  | 'photoOptions'
  | 'photoPermission'
  | 'removePhoto'
  | 'logout'
  | null;

function resolveProfilePhotoUrl(
  value: string | null | undefined,
): string | null {
  const cleanValue = value?.trim();

  if (!cleanValue) return null;

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
    `stylehub-owner-profile-${Date.now()}.jpg`;

  const mimeType =
    asset.mimeType?.trim() || 'image/jpeg';

  const webAsset =
    asset as ImagePicker.ImagePickerAsset & {
      file?: Blob | null;
    };

  if (Platform.OS === 'web' && webAsset.file) {
    formData.append('photo', webAsset.file, fileName);
    return formData;
  }

  formData.append(
    'photo',
    {
      uri: asset.uri,
      name: fileName,
      type: mimeType,
    } as unknown as Blob,
  );

  return formData;
}

function formatDateTime(
  value: string | null | undefined,
): string {
  if (!value) return 'Not available';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  try {
    return new Intl.DateTimeFormat('en-PH', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Manila',
    }).format(date);
  } catch {
    return value;
  }
}

function approvalPresentation(
  shop: ShopOwnerShop | null,
): {
  label: string;
  icon: IconName;
  color: string;
  background: string;
} {
  if (!shop) {
    return {
      label: 'No shop linked',
      icon: 'storefront-outline',
      color: COLORS.textMuted,
      background: COLORS.surfaceSoft,
    };
  }

  switch (shop.approval_status) {
    case 'approved':
      return {
        label: shop.approval_status_label,
        icon: 'checkmark-circle-outline',
        color: COLORS.green,
        background: COLORS.greenSoft,
      };

    case 'rejected':
      return {
        label: shop.approval_status_label,
        icon: 'close-circle-outline',
        color: COLORS.danger,
        background: COLORS.dangerSoft,
      };

    default:
      return {
        label: shop.approval_status_label,
        icon: 'time-outline',
        color: COLORS.warning,
        background: COLORS.warningSoft,
      };
  }
}

export default function ShopOwnerProfileScreen() {
  const { user, token, logout, isSubmitting } =
    useAuth();

  const [accountUser, setAccountUser] =
    useState<AuthUser | null>(user);

  const [shop, setShop] =
    useState<ShopOwnerShop | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] =
    useState(false);

  const [isUploadingPhoto, setIsUploadingPhoto] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState('');

  const [successMessage, setSuccessMessage] =
    useState('');

  // One reusable modal for all profile dialogs.
  const [activeModal, setActiveModal] =
    useState<ProfileModal>(null);

  const [photoModalError, setPhotoModalError] =
    useState('');

  const loadAccount = useCallback(
    async (refreshing = false): Promise<void> => {
      if (!token) {
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      if (refreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setErrorMessage('');

      try {
        const response =
          await getShopOwnerAccount(token);

        if (response.data.user.role !== 'shop_owner') {
          setAccountUser(null);
          setShop(null);
          setErrorMessage(
            'This account is not authorized as a Shop Owner.',
          );
          return;
        }

        setAccountUser(response.data.user);
        setShop(response.data.shop);
      } catch (error) {
        setErrorMessage(
          error instanceof ApiError
            ? error.message
            : 'Unable to load owner information.',
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [token],
  );

  useFocusEffect(
    useCallback(() => {
      void loadAccount();
    }, [loadAccount]),
  );

  const currentUser = accountUser ?? user;

  const ownerName = useMemo(() => {
    const fullName = currentUser?.full_name?.trim();

    if (fullName) return fullName;

    const builtName = [
      currentUser?.first_name,
      currentUser?.middle_name,
      currentUser?.last_name,
    ]
      .filter(
        (value): value is string =>
          typeof value === 'string' &&
          value.trim() !== '',
      )
      .join(' ')
      .trim();

    return builtName || 'Shop Owner';
  }, [currentUser]);

  const ownerInitial =
    ownerName.charAt(0).toUpperCase();

  const ownerEmail =
    currentUser?.email || 'Not available';

  const ownerPhone =
    currentUser?.phone_number?.trim() ||
    'Not available';

  const shopPhone =
    shop?.phone_number?.trim() || 'Not available';

  const shopEmail =
    shop?.email?.trim() || 'Not available';

  const profilePhotoUrl = resolveProfilePhotoUrl(
    currentUser?.profile_photo_url,
  );

  const approval = approvalPresentation(shop);

  const shopAddress = useMemo(
    () =>
      shop
        ? [shop.address, shop.city, shop.province]
            .map((part) => part?.trim())
            .filter(Boolean)
            .join(', ')
        : 'No shop profile available',
    [shop],
  );

  // Choose a new profile photo.

  async function chooseProfilePhoto(): Promise<void> {
    if (!token || isUploadingPhoto) return;

    setActiveModal(null);
    setPhotoModalError('');

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
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response =
        await uploadShopOwnerProfilePhoto(
          token,
          buildPhotoFormData(result.assets[0]),
        );

      setAccountUser(response.data.user);
      setSuccessMessage(
        response.message ??
          'Profile photo updated successfully.',
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

  // Remove a profile photo after confirmation.

  async function removeProfilePhoto(): Promise<void> {
    if (!token || isUploadingPhoto) return;

    setIsUploadingPhoto(true);
    setPhotoModalError('');
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response =
        await removeShopOwnerProfilePhoto(token);

      setAccountUser(response.data.user);
      setSuccessMessage(
        response.message ??
          'Profile photo removed successfully.',
      );

      setActiveModal(null);
    } catch (error) {
      setPhotoModalError(
        error instanceof ApiError
          ? error.message
          : 'Unable to remove your profile photo.',
      );
    } finally {
      setIsUploadingPhoto(false);
    }
  }

  function handleProfilePhotoPress(): void {
    if (isUploadingPhoto) return;

    if (!profilePhotoUrl) {
      void chooseProfilePhoto();
      return;
    }

    setPhotoModalError('');
    setActiveModal('photoOptions');
  }

  async function performLogout(): Promise<void> {
    if (isSubmitting) return;

    setActiveModal(null);
    await logout();
    router.replace('/(auth)/role-selection');
  }

  function confirmLogout(): void {
    if (isSubmitting) return;
    setActiveModal('logout');
  }

  function closeProfileModal(): void {
    if (isSubmitting || isUploadingPhoto) return;
    setActiveModal(null);
    setPhotoModalError('');
  }

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={styles.safeArea}
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor={COLORS.background}
        translucent={false}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void loadAccount(true)}
            tintColor={COLORS.navy}
            colors={[COLORS.navy]}
          />
        }
        contentContainerStyle={styles.container}
      >
        {/* TOP NAVIGATION */}

        <View style={styles.topBar}>
          <TouchableOpacity
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Back to shop owner home"
            onPress={() =>
              router.replace(
                '/(shop-owner)/shop-owner',
              )
            }
            style={styles.topIconButton}
          >
            <Ionicons
              name="arrow-back"
              size={22}
              color={COLORS.navy}
            />
          </TouchableOpacity>

          <View style={styles.topBarTitleBlock}>
            <Text style={styles.topBarTitle}>
              Owner profile
            </Text>

            <Text style={styles.topBarCaption}>
              Account, security & sign out
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Refresh owner profile"
            disabled={
              isLoading ||
              isRefreshing ||
              isUploadingPhoto
            }
            onPress={() => void loadAccount(true)}
            style={[
              styles.topIconButton,
              (isLoading ||
                isRefreshing ||
                isUploadingPhoto) &&
                styles.disabledButton,
            ]}
          >
            <Ionicons
              name="refresh-outline"
              size={21}
              color={COLORS.navy}
            />
          </TouchableOpacity>
        </View>

        {/* PAGE HEADER */}

        <View style={styles.header}>
          <Text style={styles.eyebrow}>
            OWNER ACCOUNT
          </Text>

          <Text style={styles.title}>
            Manage your identity, profile photo,
            and account security
          </Text>

          <Text style={styles.subtitle}>
            Your Shop Owner account is separate from
            the public business information customers
            see for your shop.
          </Text>
        </View>

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

        {isLoading && !currentUser ? (
          <View style={styles.loadingCard}>
            <View style={styles.loadingIcon}>
              <ActivityIndicator
                size="small"
                color={COLORS.navy}
              />
            </View>

            <Text style={styles.loadingTitle}>
              Loading owner profile
            </Text>

            <Text style={styles.loadingText}>
              Getting your account, verification,
              and linked shop information.
            </Text>
          </View>
        ) : null}

        {currentUser ? (
          <>
            {/* PROFILE HERO */}

            <View style={styles.profileHero}>
              <View style={styles.profileHeroTopRow}>
                <TouchableOpacity
                  activeOpacity={0.82}
                  disabled={isUploadingPhoto}
                  accessibilityRole="button"
                  accessibilityLabel="Manage Shop Owner profile photo"
                  onPress={handleProfilePhotoPress}
                  style={styles.photoButton}
                >
                  {profilePhotoUrl ? (
                    <Image
                      source={{ uri: profilePhotoUrl }}
                      resizeMode="cover"
                      style={styles.photo}
                    />
                  ) : (
                    <View style={styles.photoPlaceholder}>
                      <Text style={styles.photoInitial}>
                        {ownerInitial}
                      </Text>
                    </View>
                  )}

                  <View style={styles.photoEditBadge}>
                    {isUploadingPhoto ? (
                      <ActivityIndicator
                        size="small"
                        color={COLORS.white}
                      />
                    ) : (
                      <Ionicons
                        name="camera-outline"
                        size={16}
                        color={COLORS.white}
                      />
                    )}
                  </View>
                </TouchableOpacity>

                <View style={styles.profileHeroBadges}>
                  <View
                    style={[
                      styles.heroBadge,
                      {
                        backgroundColor:
                          currentUser.phone_verified
                            ? COLORS.greenSoft
                            : COLORS.warningSoft,
                      },
                    ]}
                  >
                    <Ionicons
                      name={
                        currentUser.phone_verified
                          ? 'checkmark-circle-outline'
                          : 'alert-circle-outline'
                      }
                      size={14}
                      color={
                        currentUser.phone_verified
                          ? COLORS.green
                          : COLORS.warning
                      }
                    />

                    <Text
                      style={[
                        styles.heroBadgeText,
                        {
                          color:
                            currentUser.phone_verified
                              ? COLORS.green
                              : COLORS.warning,
                        },
                      ]}
                    >
                      {currentUser.phone_verified
                        ? 'Phone verified'
                        : 'Phone unverified'}
                    </Text>
                  </View>

                  <View style={styles.roleBadge}>
                    <Ionicons
                      name="briefcase-outline"
                      size={14}
                      color={COLORS.white}
                    />

                    <Text style={styles.roleBadgeText}>
                      Shop Owner
                    </Text>
                  </View>
                </View>
              </View>

              <Text
                numberOfLines={2}
                style={styles.profileName}
              >
                {ownerName}
              </Text>

              <Text style={styles.profileEmail}>
                {ownerEmail}
              </Text>

              <View style={styles.heroStats}>
                <HeroStat
                  label="Account"
                  value={
                    currentUser.status === 'active'
                      ? 'Active'
                      : 'Suspended'
                  }
                />

                <View style={styles.heroDivider} />

                <HeroStat
                  label="Phone"
                  value={
                    currentUser.phone_verified
                      ? 'Verified'
                      : 'Unverified'
                  }
                />

                <View style={styles.heroDivider} />

                <HeroStat
                  label="Shop"
                  value={
                    shop?.approval_status_label ??
                    'Not linked'
                  }
                />
              </View>
            </View>

            {/* PROFILE PHOTO INFORMATION */}

            <View style={styles.photoHelpCard}>
              <View style={styles.photoHelpIcon}>
                <Ionicons
                  name="image-outline"
                  size={20}
                  color={COLORS.blue}
                />
              </View>

              <View style={styles.photoHelpCopy}>
                <Text style={styles.photoHelpTitle}>
                  Profile photo
                </Text>

                <Text style={styles.photoHelpText}>
                  Tap your photo to choose a new image
                  or remove the current one. This photo
                  belongs to your owner account, not
                  your shop gallery.
                </Text>
              </View>
            </View>

            {/* OWNER INFORMATION */}

            <SectionHeading
              title="Owner information"
              subtitle="Identity and login contact information returned by your authenticated account."
            />

            <View style={styles.infoCard}>
              <InfoRow
                icon="person-outline"
                label="Full name"
                value={ownerName}
              />

              <Divider />

              <InfoRow
                icon="mail-outline"
                label="Login email"
                value={ownerEmail}
                selectable
              />

              <Divider />

              <InfoRow
                icon="call-outline"
                label="Account mobile number"
                value={ownerPhone}
                selectable
                trailing={
                  <StatusPill
                    label={
                      currentUser.phone_verified
                        ? 'Verified'
                        : 'Unverified'
                    }
                    success={
                      currentUser.phone_verified
                    }
                  />
                }
              />

              <Divider />

              <InfoRow
                icon="time-outline"
                label="Last login"
                value={formatDateTime(
                  currentUser.last_login_at,
                )}
              />
            </View>

            {/* LINKED SHOP */}

            <SectionHeading
              title="Linked shop"
              subtitle="Your owner account and public shop profile are separate records in StyleHub."
            />

            <View style={styles.shopCard}>
              <View style={styles.shopCardHeader}>
                <View style={styles.shopIcon}>
                  <Ionicons
                    name={
                      shop?.type === 'beauty_parlor'
                        ? 'sparkles-outline'
                        : 'storefront-outline'
                    }
                    size={21}
                    color={COLORS.navy}
                  />
                </View>

                <View style={styles.shopHeaderCopy}>
                  <Text
                    numberOfLines={1}
                    style={styles.shopName}
                  >
                    {shop?.name ??
                      'No shop profile linked'}
                  </Text>

                  <Text style={styles.shopType}>
                    {shop?.type_label ??
                      'Shop information unavailable'}
                  </Text>
                </View>

                <View
                  style={[
                    styles.approvalBadge,
                    {
                      backgroundColor:
                        approval.background,
                    },
                  ]}
                >
                  <Ionicons
                    name={approval.icon}
                    size={13}
                    color={approval.color}
                  />

                  <Text
                    style={[
                      styles.approvalBadgeText,
                      {
                        color: approval.color,
                      },
                    ]}
                  >
                    {approval.label}
                  </Text>
                </View>
              </View>

              <View style={styles.shopDetailArea}>
                <ShopDetailRow
                  icon="location-outline"
                  label="Address"
                  value={shopAddress}
                />

                <ShopDetailRow
                  icon="call-outline"
                  label="Business phone"
                  value={shopPhone}
                />

                <ShopDetailRow
                  icon="mail-outline"
                  label="Business email"
                  value={shopEmail}
                />
              </View>

              <TouchableOpacity
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Open shop information"
                onPress={() =>
                  router.push(
                    '/(shop-owner)/shop-owner/shop-information',
                  )
                }
                style={styles.manageShopButton}
              >
                <View style={styles.manageShopButtonCopy}>
                  <Text style={styles.manageShopButtonTitle}>
                    Manage public shop information
                  </Text>

                  <Text style={styles.manageShopButtonText}>
                    Edit the business name, contact
                    details, description, and
                    written address.
                  </Text>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={19}
                  color={COLORS.navy}
                />
              </TouchableOpacity>
            </View>

            {/* ACCOUNT SECURITY */}

            <SectionHeading
              title="Account security"
              subtitle="Password and session controls for your Shop Owner account."
            />

            <TouchableOpacity
              activeOpacity={0.82}
              accessibilityRole="button"
              accessibilityLabel="Open account security"
              onPress={() =>
                router.push(
                  '/(shop-owner)/shop-owner-security',
                )
              }
              style={styles.securityCard}
            >
              <View style={styles.securityIcon}>
                <Ionicons
                  name="lock-closed-outline"
                  size={21}
                  color={COLORS.navy}
                />
              </View>

              <View style={styles.securityCopy}>
                <Text style={styles.securityTitle}>
                  Change password
                </Text>

                <Text style={styles.securityText}>
                  Update your password and use the
                  existing security flow to sign out
                  other StyleHub sessions.
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={19}
                color={COLORS.textLight}
              />
            </TouchableOpacity>

            {/* ACCOUNT SEPARATION INFORMATION */}

            <View style={styles.accountSeparationCard}>
              <View style={styles.accountSeparationIcon}>
                <Ionicons
                  name="information-circle-outline"
                  size={20}
                  color={COLORS.blue}
                />
              </View>

              <View style={styles.accountSeparationCopy}>
                <Text style={styles.accountSeparationTitle}>
                  Account vs. business details
                </Text>

                <Text style={styles.accountSeparationText}>
                  Your login email, account mobile
                  number, password, and profile photo
                  belong to your Shop Owner account.
                  Shop phone, business email, address,
                  gallery, and map pin belong to the
                  public shop profile.
                </Text>
              </View>
            </View>

            {/* SESSION */}

            <SectionHeading
              title="Session"
              subtitle="End the current authenticated session on this device."
            />

            <View style={styles.signOutCard}>
              <View style={styles.signOutHeader}>
                <View style={styles.signOutIcon}>
                  <Ionicons
                    name="log-out-outline"
                    size={20}
                    color={COLORS.danger}
                  />
                </View>

                <View style={styles.signOutCopy}>
                  <Text style={styles.signOutTitle}>
                    Sign out of StyleHub
                  </Text>

                  <Text style={styles.signOutText}>
                    Your local session will be cleared
                    and you will return to role selection.
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                activeOpacity={0.82}
                disabled={isSubmitting}
                accessibilityRole="button"
                accessibilityLabel="Sign out of StyleHub"
                onPress={confirmLogout}
                style={[
                  styles.signOutButton,
                  isSubmitting &&
                    styles.disabledButton,
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

                <Text style={styles.signOutButtonText}>
                  {isSubmitting
                    ? 'Signing out...'
                    : 'Sign out'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        ) : null}
      </ScrollView>

      {/* SHARED STYLEHUB PROFILE MODAL */}

      <StyleHubModal
        visible={activeModal !== null}
        onClose={closeProfileModal}
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
                ? 'Your current picture will be removed and the default profile initial will appear.'
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
          activeModal === 'photoOptions' ||
          activeModal === 'photoPermission'
        }
        actions={
          activeModal === 'photoOptions'
            ? [
                {
                  label: 'Close',
                  variant: 'secondary',
                  onPress: closeProfileModal,
                },
              ]
            : activeModal === 'photoPermission'
              ? [
                  {
                    label: 'Got it',
                    variant: 'primary',
                    onPress: closeProfileModal,
                  },
                ]
              : activeModal === 'removePhoto'
                ? [
                    {
                      label: 'Keep photo',
                      variant: 'secondary',
                      onPress: closeProfileModal,
                    },
                    {
                      label: 'Remove photo',
                      variant: 'danger',
                      icon: 'trash-outline',
                      loading: isUploadingPhoto,
                      onPress: () =>
                        void removeProfilePhoto(),
                    },
                  ]
                : activeModal === 'logout'
                  ? [
                      {
                        label: 'Stay signed in',
                        variant: 'secondary',
                        onPress: closeProfileModal,
                      },
                      {
                        label: 'Sign out',
                        variant: 'danger',
                        icon: 'log-out-outline',
                        loading: isSubmitting,
                        onPress: () =>
                          void performLogout(),
                      },
                    ]
                  : []
        }
      >
        {activeModal === 'photoOptions' ? (
          <View style={styles.photoOptionList}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Choose new profile photo"
              activeOpacity={0.8}
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

                <Text style={styles.photoOptionDescription}>
                  Select a picture from your library.
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={17}
                color={COLORS.textLight}
              />
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Remove current profile photo"
              activeOpacity={0.8}
              disabled={isUploadingPhoto}
              onPress={() => {
                setPhotoModalError('');
                setActiveModal('removePhoto');
              }}
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
                    { color: COLORS.danger },
                  ]}
                >
                  Remove current photo
                </Text>

                <Text style={styles.photoOptionDescription}>
                  Use the default profile initial.
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

        {activeModal === 'removePhoto' &&
        photoModalError ? (
          <View style={styles.photoModalError}>
            <Ionicons
              name="alert-circle-outline"
              size={16}
              color={COLORS.danger}
            />

            <Text style={styles.photoModalErrorText}>
              {photoModalError}
            </Text>
          </View>
        ) : null}
      </StyleHubModal>
    </SafeAreaView>
  );
}

/* ==========================================================
   REUSABLE SCREEN COMPONENTS
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
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.heroStat}>
      <Text style={styles.heroStatLabel}>
        {label}
      </Text>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.72}
        style={styles.heroStatValue}
      >
        {value}
      </Text>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
  selectable = false,
  trailing,
}: {
  icon: IconName;
  label: string;
  value: string;
  selectable?: boolean;
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
          selectable={selectable}
          style={styles.infoValue}
        >
          {value}
        </Text>
      </View>

      {trailing ?? null}
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

function StatusPill({
  label,
  success,
}: {
  label: string;
  success: boolean;
}) {
  return (
    <View
      style={[
        styles.statusPill,
        {
          backgroundColor: success
            ? COLORS.greenSoft
            : COLORS.warningSoft,
        },
      ]}
    >
      <Text
        style={[
          styles.statusPillText,
          {
            color: success
              ? COLORS.green
              : COLORS.warning,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function ShopDetailRow({
  icon,
  label,
  value,
}: {
  icon: IconName;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.shopDetailRow}>
      <Ionicons
        name={icon}
        size={16}
        color={COLORS.textMuted}
      />
      <View style={styles.shopDetailCopy}>
        <Text style={styles.shopDetailLabel}>
          {label}
        </Text>
        <Text style={styles.shopDetailValue}>
          {value}
        </Text>
      </View>
    </View>
  );
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
   STYLES — EXISTING PAGE DESIGN PRESERVED
   ========================================================== */

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  container: {
    width: '100%',
    maxWidth: LAYOUT.contentMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: LAYOUT.screenPadding,
    paddingTop: 40,
    paddingBottom: 48,
  },

  topBar: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
  },

  topIconButton: {
    width: LAYOUT.iconButtonSize,
    height: LAYOUT.iconButtonSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADII.pill,
  },

  topBarTitleBlock: {
    flex: 1,
    marginHorizontal: 6,
  },

  topBarTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.cardTitle,
    fontWeight: '800',
    textAlign: 'center',
  },

  topBarCaption: {
    marginTop: 1,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    textAlign: 'center',
  },

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

  loadingCard: {
    marginTop: SPACING.xl,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 36,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.surface,
  },

  loadingIcon: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: COLORS.surfaceSoft,
  },

  loadingTitle: {
    marginTop: 14,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.cardTitle,
    fontWeight: '800',
  },

  loadingText: {
    maxWidth: 340,
    marginTop: 5,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
    textAlign: 'center',
  },

  profileHero: {
    marginTop: SPACING.xl,
    padding: 18,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.primary,
    ...SHADOWS.card,
  },

  profileHeroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },

  photoButton: {
    width: 86,
    height: 86,
    position: 'relative',
  },

  photo: {
    width: 86,
    height: 86,
    borderWidth: 3,
    borderColor: COLORS.navyMuted,
    borderRadius: 43,
  },

  photoPlaceholder: {
    width: 86,
    height: 86,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.navyMuted,
    borderRadius: 43,
    backgroundColor: COLORS.navySoft,
  },

  photoInitial: {
    color: COLORS.white,
    fontSize: 31,
    fontWeight: '800',
  },

  photoEditBadge: {
    position: 'absolute',
    right: 0,
    bottom: 1,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: 16,
    backgroundColor: COLORS.navyMuted,
  },

  profileHeroBadges: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 7,
  },

  heroBadge: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    borderRadius: RADII.pill,
  },

  heroBadgeText: {
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '800',
  },

  roleBadge: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.navyMuted,
  },

  roleBadgeText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '800',
  },

  profileName: {
    marginTop: 16,
    color: COLORS.white,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
  },

  profileEmail: {
    marginTop: 4,
    color: '#D4DAE1',
    fontSize: TYPOGRAPHY.caption,
  },

  heroStats: {
    marginTop: 17,
    paddingTop: 15,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.navyMuted,
  },

  heroStat: {
    flex: 1,
    minWidth: 0,
  },

  heroStatLabel: {
    color: '#AEB8C5',
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '600',
  },

  heroStatValue: {
    marginTop: 3,
    color: COLORS.white,
    fontSize: TYPOGRAPHY.caption,
    fontWeight: '800',
  },

  heroDivider: {
    width: 1,
    height: 34,
    marginHorizontal: 12,
    backgroundColor: COLORS.navyMuted,
  },

  photoHelpCard: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.surface,
  },

  photoHelpIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: COLORS.blueSoft,
  },

  photoHelpCopy: {
    flex: 1,
  },

  photoHelpTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  photoHelpText: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
  },

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

  infoCard: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.surface,
    ...SHADOWS.card,
  },

  infoRow: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },

  infoIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
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
    lineHeight: 20,
    fontWeight: '700',
  },

  divider: {
    height: 1,
    marginLeft: 65,
    backgroundColor: COLORS.border,
  },

  statusPill: {
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 9,
    borderRadius: RADII.pill,
  },

  statusPillText: {
    fontSize: 9,
    fontWeight: '800',
  },

  shopCard: {
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.surface,
    ...SHADOWS.card,
  },

  shopCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },

  shopIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: COLORS.accentSoft,
  },

  shopHeaderCopy: {
    flex: 1,
    minWidth: 0,
  },

  shopName: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.cardTitle,
    fontWeight: '800',
  },

  shopType: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
  },

  approvalBadge: {
    minHeight: 29,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    borderRadius: RADII.pill,
  },

  approvalBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },

  shopDetailArea: {
    marginTop: 15,
    gap: 11,
    padding: 13,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surfaceSoft,
  },

  shopDetailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },

  shopDetailCopy: {
    flex: 1,
  },

  shopDetailLabel: {
    color: COLORS.textLight,
    fontSize: 9,
    fontWeight: '700',
  },

  shopDetailValue: {
    marginTop: 2,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
    fontWeight: '600',
  },

  manageShopButton: {
    minHeight: 64,
    marginTop: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surface,
  },

  manageShopButtonCopy: {
    flex: 1,
  },

  manageShopButtonTitle: {
    color: COLORS.navy,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  manageShopButtonText: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    lineHeight: 16,
  },

  securityCard: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.surface,
    ...SHADOWS.card,
  },

  securityIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: COLORS.accentSoft,
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
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
  },

  accountSeparationCard: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
    padding: 14,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.blueSoft,
  },

  accountSeparationIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: COLORS.surface,
  },

  accountSeparationCopy: {
    flex: 1,
  },

  accountSeparationTitle: {
    color: COLORS.blue,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  accountSeparationText: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
  },

  signOutCard: {
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.danger,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.dangerSoft,
  },

  signOutHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
  },

  signOutIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: COLORS.surface,
  },

  signOutCopy: {
    flex: 1,
  },

  signOutTitle: {
    color: COLORS.danger,
    fontSize: TYPOGRAPHY.cardTitle,
    fontWeight: '800',
  },

  signOutText: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
  },

  signOutButton: {
    minHeight: LAYOUT.compactButtonHeight,
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: COLORS.danger,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surface,
  },

  signOutButtonText: {
    color: COLORS.danger,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  // Custom content within our shared compact modal.

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

  photoModalError: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    padding: 10,
    borderRadius: 10,
    backgroundColor: COLORS.dangerSoft,
  },

  photoModalErrorText: {
    flex: 1,
    color: COLORS.danger,
    fontSize: 11,
    lineHeight: 16,
  },

  disabledButton: {
    opacity: 0.48,
  },
});
