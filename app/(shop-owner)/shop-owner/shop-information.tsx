
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import type { ComponentProps } from 'react';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
  getShopOwnerShopProfile,
  updateShopOwnerShopProfile,
} from '@/src/services/shop-owner-shop-api';
import type { ShopType } from '@/src/types/auth';
import type { ShopOwnerShop } from '@/src/types/shop-owner';

type IconName = ComponentProps<typeof Ionicons>['name'];

type ShopFormState = {
  name: string;
  type: ShopType;
  description: string;
  phoneNumber: string;
  email: string;
  address: string;
  city: string;
  province: string;
};

const EMPTY_FORM: ShopFormState = {
  name: '',
  type: 'barber_shop',
  description: '',
  phoneNumber: '',
  email: '',
  address: '',
  city: '',
  province: '',
};

function phoneForInput(
  value: string | null | undefined,
): string {
  const cleaned = value?.trim() ?? '';

  if (/^\+639\d{9}$/.test(cleaned)) {
    return `0${cleaned.slice(3)}`;
  }

  return cleaned;
}

function shopToForm(shop: ShopOwnerShop): ShopFormState {
  return {
    name: shop.name,
    type: shop.type,
    description: shop.description ?? '',
    phoneNumber: phoneForInput(shop.phone_number),
    email: shop.email ?? '',
    address: shop.address,
    city: shop.city,
    province: shop.province,
  };
}

function formFingerprint(form: ShopFormState): string {
  return JSON.stringify({
    name: form.name.trim(),
    type: form.type,
    description: form.description.trim(),
    phoneNumber: form.phoneNumber.trim(),
    email: form.email.trim().toLowerCase(),
    address: form.address.trim(),
    city: form.city.trim(),
    province: form.province.trim(),
  });
}

function formatDate(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  try {
    return new Intl.DateTimeFormat('en-PH', {
      dateStyle: 'medium',
      timeZone: 'Asia/Manila',
    }).format(date);
  } catch {
    return null;
  }
}

function approvalPresentation(shop: ShopOwnerShop): {
  icon: IconName;
  background: string;
  color: string;
} {
  switch (shop.approval_status) {
    case 'approved':
      return {
        icon: 'checkmark-circle-outline',
        background: COLORS.greenSoft,
        color: COLORS.green,
      };

    case 'rejected':
      return {
        icon: 'close-circle-outline',
        background: COLORS.dangerSoft,
        color: COLORS.danger,
      };

    default:
      return {
        icon: 'time-outline',
        background: COLORS.warningSoft,
        color: COLORS.warning,
      };
  }
}

export default function ShopOwnerShopInformationScreen() {
  const { token } = useAuth();

  const [shop, setShop] = useState<ShopOwnerShop | null>(null);
  const [form, setForm] = useState<ShopFormState>(EMPTY_FORM);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  /* LOAD SHOP INFORMATION */

  const loadShop = useCallback(
    async (refreshing = false): Promise<void> => {
      if (!token) {
        setIsLoading(false);
        setIsRefreshing(false);
        setErrorMessage('You must be signed in as a Shop Owner.');
        return;
      }

      if (refreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setErrorMessage('');
      setSuccessMessage('');

      try {
        const response = await getShopOwnerShopProfile(token);

        setShop(response.data.shop);
        setForm(shopToForm(response.data.shop));
      } catch (error) {
        setErrorMessage(
          error instanceof ApiError
            ? error.message
            : 'Unable to load your shop information.',
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
      void loadShop();
    }, [loadShop]),
  );

  /* FORM STATE */

  const savedForm = useMemo(
    () => (shop ? shopToForm(shop) : null),
    [shop],
  );

  const isDirty = useMemo(
    () =>
      Boolean(
        savedForm &&
          formFingerprint(savedForm) !== formFingerprint(form),
      ),
    [form, savedForm],
  );

  const fullAddress = useMemo(
    () =>
      [
        form.address.trim(),
        form.city.trim(),
        form.province.trim(),
      ]
        .filter(Boolean)
        .join(', '),
    [form.address, form.city, form.province],
  );

  function updateField<K extends keyof ShopFormState>(
    key: K,
    value: ShopFormState[K],
  ): void {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));

    setErrorMessage('');
    setSuccessMessage('');
  }

  function restoreSavedDetails(): void {
    if (!shop || isSaving) {
      return;
    }

    setForm(shopToForm(shop));
    setErrorMessage('');
    setSuccessMessage('');
  }

  /* VALIDATION */

  function validate(): string | null {
    if (form.name.trim().length < 2) {
      return 'Shop name must contain at least 2 characters.';
    }

    if (!form.phoneNumber.trim()) {
      return 'Enter your shop phone number.';
    }

    if (
      form.email.trim() &&
      !/^\S+@\S+\.\S+$/.test(form.email.trim())
    ) {
      return 'Enter a valid shop email address.';
    }

    if (form.address.trim().length < 5) {
      return 'Shop address must contain at least 5 characters.';
    }

    if (form.city.trim().length < 2) {
      return 'City must contain at least 2 characters.';
    }

    if (form.province.trim().length < 2) {
      return 'Province must contain at least 2 characters.';
    }

    return null;
  }

  /* SAVE SHOP INFORMATION */

  async function handleSave(): Promise<void> {
    if (!token || isSaving) {
      return;
    }

    const validationError = validate();

    if (validationError) {
      setSuccessMessage('');
      setErrorMessage(validationError);
      return;
    }

    setIsSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await updateShopOwnerShopProfile(
        token,
        {
          name: form.name,
          type: form.type,
          description: form.description,
          phoneNumber: form.phoneNumber,
          email: form.email,
          address: form.address,
          city: form.city,
          province: form.province,
        },
      );

      setShop(response.data.shop);
      setForm(shopToForm(response.data.shop));

      setSuccessMessage(
        response.message ??
          'Shop information updated successfully.',
      );
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : 'Unable to update your shop information.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  /* LOADING SCREEN */

  if (isLoading && !shop) {
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

        <View style={styles.loadingContainer}>
          <View style={styles.loadingIcon}>
            <ActivityIndicator
              size="small"
              color={COLORS.navy}
            />
          </View>

          <Text style={styles.loadingTitle}>
            Loading shop information
          </Text>

          <Text style={styles.loadingText}>
            Getting your public business profile and contact details.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  /* UNAVAILABLE SCREEN */

  if (!shop) {
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

        <View style={styles.unavailableContainer}>
          <TouchableOpacity
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={styles.topIconButton}
          >
            <Ionicons
              name="arrow-back"
              size={22}
              color={COLORS.navy}
            />
          </TouchableOpacity>

          <View style={styles.unavailableContent}>
            <View style={styles.unavailableIcon}>
              <Ionicons
                name="storefront-outline"
                size={30}
                color={COLORS.navy}
              />
            </View>

            <Text style={styles.unavailableTitle}>
              Shop information unavailable
            </Text>

            <Text style={styles.unavailableText}>
              {errorMessage ||
                'Unable to display your shop profile.'}
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const approval = approvalPresentation(shop);
  const reviewedDate = formatDate(shop.reviewed_at);
  const updatedDate = formatDate(shop.updated_at);

  /* MAIN SCREEN */

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

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => void loadShop(true)}
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
              disabled={isSaving}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              onPress={() => router.back()}
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
                Shop information
              </Text>

              <Text style={styles.topBarCaption}>
                Public business profile
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              disabled={isSaving}
              accessibilityRole="button"
              accessibilityLabel="Refresh shop information"
              onPress={() => void loadShop(true)}
              style={[
                styles.topIconButton,
                isSaving && styles.disabledButton,
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
              BUSINESS PROFILE
            </Text>

            <Text style={styles.title}>
              Keep the details customers use to recognize and
              contact your shop
            </Text>

            <Text style={styles.subtitle}>
              Update the public business name, shop type,
              description, contact information, and written address
              shown across StyleHub.
            </Text>
          </View>

          {/* MESSAGES */}

          {errorMessage ? (
            <MessageBox
              type="error"
              title="Shop information needs attention"
              message={errorMessage}
            />
          ) : null}

          {successMessage ? (
            <MessageBox
              type="success"
              title="Shop information saved"
              message={successMessage}
            />
          ) : null}

          {/* SHOP PROFILE SUMMARY */}

          <View style={styles.profileCard}>
            <View style={styles.profileTopRow}>
              <View style={styles.profileIcon}>
                <Ionicons
                  name={
                    form.type === 'beauty_parlor'
                      ? 'sparkles-outline'
                      : 'cut-outline'
                  }
                  size={24}
                  color={COLORS.white}
                />
              </View>

              <View
                style={[
                  styles.approvalBadge,
                  {
                    backgroundColor: approval.background,
                  },
                ]}
              >
                <Ionicons
                  name={approval.icon}
                  size={14}
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
                  {shop.approval_status_label}
                </Text>
              </View>
            </View>

            <Text
              numberOfLines={2}
              style={styles.profileName}
            >
              {form.name.trim() || 'Your shop'}
            </Text>

            <Text style={styles.profileType}>
              {form.type === 'barber_shop'
                ? 'Barber Shop'
                : 'Beauty Parlor'}
            </Text>

            <View style={styles.profileLocationRow}>
              <Ionicons
                name="location-outline"
                size={15}
                color="#D4DAE1"
              />

              <Text
                numberOfLines={2}
                style={styles.profileLocationText}
              >
                {fullAddress || 'Address not set'}
              </Text>
            </View>

            <View style={styles.profileStats}>
              <ProfileStat
                label="Availability"
                value={shop.availability_status_label}
              />

              <View style={styles.profileDivider} />

              <ProfileStat
                label="Approval"
                value={shop.approval_status_label}
              />

              <View style={styles.profileDivider} />

              <ProfileStat
                label="Updated"
                value={updatedDate ?? '—'}
              />
            </View>
          </View>

          {/* REJECTION NOTICE */}

          {shop.approval_status === 'rejected' &&
          shop.rejection_reason ? (
            <View style={styles.rejectionCard}>
              <View style={styles.rejectionIcon}>
                <Ionicons
                  name="alert-circle-outline"
                  size={20}
                  color={COLORS.danger}
                />
              </View>

              <View style={styles.rejectionCopy}>
                <Text style={styles.rejectionTitle}>
                  Shop review note
                </Text>

                <Text style={styles.rejectionText}>
                  {shop.rejection_reason}
                </Text>

                {reviewedDate ? (
                  <Text style={styles.rejectionDate}>
                    Reviewed {reviewedDate}
                  </Text>
                ) : null}
              </View>
            </View>
          ) : null}

          {/* UNSAVED CHANGES */}

          {isDirty ? (
            <View style={styles.unsavedCard}>
              <View style={styles.unsavedIcon}>
                <Ionicons
                  name="alert-circle-outline"
                  size={20}
                  color={COLORS.orange}
                />
              </View>

              <View style={styles.unsavedCopy}>
                <Text style={styles.unsavedTitle}>
                  You have unsaved profile changes
                </Text>

                <Text style={styles.unsavedText}>
                  Customers will keep seeing the currently saved
                  details until you save this form.
                </Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.76}
                disabled={isSaving}
                onPress={restoreSavedDetails}
                style={styles.restoreButton}
              >
                <Text style={styles.restoreButtonText}>
                  Restore
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* BUSINESS IDENTITY */}

          <SectionHeading
            title="Business identity"
            subtitle="The main information customers use to identify your shop."
          />

          <View style={styles.sectionCard}>
            <SettingHeader
              icon="storefront-outline"
              title="Public shop details"
              description="Use the business name and category customers should see in StyleHub."
            />

            <FormField
              label="Shop name"
              value={form.name}
              onChangeText={(value) =>
                updateField('name', value)
              }
              editable={!isSaving}
              placeholder="Business name"
              maxLength={150}
              hint={`${form.name.length}/150`}
            />

            <Text style={styles.fieldLabel}>
              Shop type
            </Text>

            <View style={styles.typeRow}>
              <ShopTypeButton
                icon="cut-outline"
                label="Barber Shop"
                description="Haircuts, grooming, barber services"
                selected={form.type === 'barber_shop'}
                disabled={isSaving}
                onPress={() =>
                  updateField('type', 'barber_shop')
                }
              />

              <ShopTypeButton
                icon="sparkles-outline"
                label="Beauty Parlor"
                description="Beauty, styling, and salon services"
                selected={form.type === 'beauty_parlor'}
                disabled={isSaving}
                onPress={() =>
                  updateField('type', 'beauty_parlor')
                }
              />
            </View>

            <FormField
              label="Description"
              optional
              value={form.description}
              onChangeText={(value) =>
                updateField('description', value)
              }
              editable={!isSaving}
              placeholder="Tell customers about your shop, specialties, atmosphere, or service approach."
              multiline
              maxLength={2000}
              hint={`${form.description.length}/2000`}
            />
          </View>

          {/* CONTACT INFORMATION */}

          <SectionHeading
            title="Contact information"
            subtitle="Business contact details customers may use when they need to reach the shop."
          />

          <View style={styles.sectionCard}>
            <SettingHeader
              icon="call-outline"
              title="Customer contact"
              description="Keep these details separate from your StyleHub account login and OTP number."
            />

            <FormField
              icon="call-outline"
              label="Business phone"
              value={form.phoneNumber}
              onChangeText={(value) =>
                updateField('phoneNumber', value)
              }
              editable={!isSaving}
              placeholder="09XXXXXXXXX"
              keyboardType="phone-pad"
              maxLength={24}
            />

            <View style={styles.contactHint}>
              <Ionicons
                name="information-circle-outline"
                size={16}
                color={COLORS.blue}
              />

              <Text style={styles.contactHintText}>
                This is the shop contact number customers see.
                It is not your account verification number.
              </Text>
            </View>

            <FormField
              icon="mail-outline"
              label="Business email"
              optional
              value={form.email}
              onChangeText={(value) =>
                updateField('email', value)
              }
              editable={!isSaving}
              placeholder="shop@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              maxLength={255}
            />
          </View>

          {/* BUSINESS ADDRESS */}

          <SectionHeading
            title="Business address"
            subtitle="Edit the written address customers see on your shop profile."
          />

          <View style={styles.sectionCard}>
            <SettingHeader
              icon="location-outline"
              title="Written address"
              description="Use a complete street, building, or barangay description that matches your real location."
            />

            <FormField
              icon="home-outline"
              label="Address"
              value={form.address}
              onChangeText={(value) =>
                updateField('address', value)
              }
              editable={!isSaving}
              placeholder="Street, building, barangay"
              maxLength={255}
            />

            <View style={styles.twoFieldRow}>
              <View style={styles.twoFieldColumn}>
                <FormField
                  label="City"
                  value={form.city}
                  onChangeText={(value) =>
                    updateField('city', value)
                  }
                  editable={!isSaving}
                  placeholder="City or municipality"
                  maxLength={100}
                />
              </View>

              <View style={styles.twoFieldColumn}>
                <FormField
                  label="Province"
                  value={form.province}
                  onChangeText={(value) =>
                    updateField('province', value)
                  }
                  editable={!isSaving}
                  placeholder="Province"
                  maxLength={100}
                />
              </View>
            </View>

            <View style={styles.addressPreview}>
              <View style={styles.addressPreviewIcon}>
                <Ionicons
                  name="navigate-outline"
                  size={18}
                  color={COLORS.navy}
                />
              </View>

              <View style={styles.addressPreviewCopy}>
                <Text style={styles.addressPreviewLabel}>
                  Customer-facing address
                </Text>

                <Text style={styles.addressPreviewText}>
                  {fullAddress ||
                    'Complete the address fields to preview the public address.'}
                </Text>
              </View>
            </View>
          </View>

          {/* MAP LOCATION NOTICE */}

          <View style={styles.locationCard}>
            <View style={styles.locationIcon}>
              <Ionicons
                name="map-outline"
                size={21}
                color={COLORS.orange}
              />
            </View>

            <View style={styles.locationCopy}>
              <Text style={styles.locationTitle}>
                The map pin is managed separately
              </Text>

              <Text style={styles.locationText}>
                Changing this written address does not move your
                OpenStreetMap/Leaflet marker. Update the exact
                coordinates from Shop Location.
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.78}
              accessibilityRole="button"
              accessibilityLabel="Open shop location"
              disabled={isSaving}
              onPress={() =>
                router.push(
                  '/(shop-owner)/shop-owner/location',
                )
              }
              style={styles.locationButton}
            >
              <Ionicons
                name="chevron-forward"
                size={18}
                color={COLORS.navy}
              />
            </TouchableOpacity>
          </View>

          {/* SAVE CHANGES */}

          <View style={styles.saveCard}>
            <View style={styles.saveHeader}>
              <View style={styles.saveIcon}>
                <Ionicons
                  name={
                    isDirty
                      ? 'save-outline'
                      : 'checkmark-circle-outline'
                  }
                  size={20}
                  color={COLORS.navy}
                />
              </View>

              <View style={styles.saveCopy}>
                <Text style={styles.saveTitle}>
                  {isDirty
                    ? 'Save public shop details'
                    : 'Shop information is up to date'}
                </Text>

                <Text style={styles.saveText}>
                  {isDirty
                    ? 'Review the profile preview above, then save to update the information returned by Laravel.'
                    : 'The form currently matches the shop details already stored for this account.'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.84}
              disabled={isSaving || !isDirty}
              accessibilityRole="button"
              accessibilityLabel="Save shop information"
              onPress={() => void handleSave()}
              style={[
                styles.primaryButton,
                (isSaving || !isDirty) &&
                  styles.disabledButton,
              ]}
            >
              {isSaving ? (
                <ActivityIndicator
                  size="small"
                  color={COLORS.white}
                />
              ) : (
                <Ionicons
                  name={
                    isDirty
                      ? 'save-outline'
                      : 'checkmark-circle-outline'
                  }
                  size={19}
                  color={COLORS.white}
                />
              )}

              <Text style={styles.primaryButtonText}>
                {isSaving
                  ? 'Saving shop information...'
                  : isDirty
                    ? 'Save changes'
                    : 'Information is up to date'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* SECTION HEADING */

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

/* PROFILE STAT */

function ProfileStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.profileStat}>
      <Text style={styles.profileStatLabel}>
        {label}
      </Text>

      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.72}
        style={styles.profileStatValue}
      >
        {value}
      </Text>
    </View>
  );
}

/* SETTING HEADER */

function SettingHeader({
  icon,
  title,
  description,
}: {
  icon: IconName;
  title: string;
  description: string;
}) {
  return (
    <View style={styles.settingHeader}>
      <View style={styles.settingIcon}>
        <Ionicons
          name={icon}
          size={19}
          color={COLORS.navy}
        />
      </View>

      <View style={styles.settingCopy}>
        <Text style={styles.settingTitle}>
          {title}
        </Text>

        <Text style={styles.settingDescription}>
          {description}
        </Text>
      </View>
    </View>
  );
}

/* FORM FIELD */

interface FormFieldProps {
  icon?: IconName;
  label: string;
  optional?: boolean;
  hint?: string;
  value: string;
  onChangeText: (value: string) => void;
  editable: boolean;
  placeholder: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  multiline?: boolean;
  maxLength?: number;
}

function FormField({
  icon,
  label,
  optional = false,
  hint,
  value,
  onChangeText,
  editable,
  placeholder,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  multiline = false,
  maxLength,
}: FormFieldProps) {
  return (
    <View style={styles.fieldGroup}>
      <View style={styles.fieldHeader}>
        <Text style={styles.fieldLabel}>
          {label}

          {optional ? (
            <Text style={styles.optionalText}>
              {' · Optional'}
            </Text>
          ) : null}
        </Text>

        {hint ? (
          <Text style={styles.fieldHint}>
            {hint}
          </Text>
        ) : null}
      </View>

      <View
        style={[
          styles.inputShell,
          multiline && styles.multilineShell,
          !editable && styles.disabledButton,
        ]}
      >
        {icon ? (
          <View style={styles.inputIcon}>
            <Ionicons
              name={icon}
              size={17}
              color={COLORS.navy}
            />
          </View>
        ) : null}

        <TextInput
          value={value}
          onChangeText={onChangeText}
          editable={editable}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textLight}
          selectionColor={COLORS.navy}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          multiline={multiline}
          maxLength={maxLength}
          textAlignVertical={multiline ? 'top' : 'center'}
          style={[
            styles.input,
            multiline && styles.multilineInput,
          ]}
        />
      </View>
    </View>
  );
}

/* SHOP TYPE BUTTON */

function ShopTypeButton({
  icon,
  label,
  description,
  selected,
  disabled,
  onPress,
}: {
  icon: IconName;
  label: string;
  description: string;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{
        selected,
        disabled,
      }}
      onPress={onPress}
      style={[
        styles.typeButton,
        selected && styles.typeButtonSelected,
        disabled && styles.disabledButton,
      ]}
    >
      <View
        style={[
          styles.typeIcon,
          selected && styles.typeIconSelected,
        ]}
      >
        <Ionicons
          name={icon}
          size={20}
          color={selected ? COLORS.white : COLORS.navy}
        />
      </View>

      <Text
        style={[
          styles.typeText,
          selected && styles.typeTextSelected,
        ]}
      >
        {label}
      </Text>

      <Text
        style={[
          styles.typeDescription,
          selected && styles.typeDescriptionSelected,
        ]}
      >
        {description}
      </Text>

      <Ionicons
        name={
          selected
            ? 'radio-button-on'
            : 'radio-button-off'
        }
        size={18}
        color={
          selected
            ? COLORS.white
            : COLORS.textLight
        }
        style={styles.typeRadio}
      />
    </TouchableOpacity>
  );
}

/* MESSAGE BOX */

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
            success ? COLORS.success : COLORS.danger
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

/* STYLES */

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  flex: {
    flex: 1,
  },

  // UPDATED: Same 40px top spacing as the other
  // Shop Owner screens, below the safe area.
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
    maxWidth: 580,
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

  profileCard: {
    marginTop: SPACING.xl,
    padding: 18,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.primary,
    ...SHADOWS.card,
  },

  profileTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },

  profileIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: COLORS.navyMuted,
  },

  approvalBadge: {
    minHeight: 31,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    borderRadius: RADII.pill,
  },

  approvalBadgeText: {
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '800',
  },

  profileName: {
    marginTop: 17,
    color: COLORS.white,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
  },

  profileType: {
    marginTop: 4,
    color: '#D4DAE1',
    fontSize: TYPOGRAPHY.caption,
    fontWeight: '700',
  },

  profileLocationRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },

  profileLocationText: {
    flex: 1,
    color: '#D4DAE1',
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
  },

  profileStats: {
    marginTop: 17,
    paddingTop: 15,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.navyMuted,
  },

  profileStat: {
    flex: 1,
    minWidth: 0,
  },

  profileStatLabel: {
    color: '#AEB8C5',
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '600',
  },

  profileStatValue: {
    marginTop: 3,
    color: COLORS.white,
    fontSize: TYPOGRAPHY.caption,
    fontWeight: '800',
  },

  profileDivider: {
    width: 1,
    height: 34,
    marginHorizontal: 12,
    backgroundColor: COLORS.navyMuted,
  },

  rejectionCard: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.dangerSoft,
  },

  rejectionIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.surface,
  },

  rejectionCopy: {
    flex: 1,
  },

  rejectionTitle: {
    color: COLORS.danger,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  rejectionText: {
    marginTop: 4,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
  },

  rejectionDate: {
    marginTop: 6,
    color: COLORS.textLight,
    fontSize: TYPOGRAPHY.micro,
  },

  unsavedCard: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.surface,
  },

  unsavedIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.orangeSoft,
  },

  unsavedCopy: {
    flex: 1,
    minWidth: 0,
  },

  unsavedTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  unsavedText: {
    marginTop: 2,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    lineHeight: 16,
  },

  restoreButton: {
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surfaceSoft,
  },

  restoreButtonText: {
    color: COLORS.navy,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '800',
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

  sectionCard: {
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.surface,
    ...SHADOWS.card,
  },

  settingHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
  },

  settingIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: COLORS.accentSoft,
  },

  settingCopy: {
    flex: 1,
  },

  settingTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.cardTitle,
    fontWeight: '800',
  },

  settingDescription: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
  },

  fieldGroup: {
    marginTop: 17,
  },

  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 8,
  },

  fieldLabel: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  optionalText: {
    color: COLORS.textLight,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '600',
  },

  fieldHint: {
    color: COLORS.textLight,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '600',
  },

  inputShell: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surfaceSoft,
  },

  multilineShell: {
    minHeight: 126,
    alignItems: 'flex-start',
  },

  inputIcon: {
    width: 44,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    backgroundColor: COLORS.accentSoft,
  },

  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 50,
    paddingHorizontal: 14,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.body,
  },

  multilineInput: {
    minHeight: 124,
    paddingTop: 13,
    paddingBottom: 13,
    lineHeight: 20,
  },

  typeRow: {
    marginTop: 9,
    flexDirection: 'row',
    gap: 10,
  },

  typeButton: {
    flex: 1,
    minHeight: 140,
    position: 'relative',
    padding: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.surfaceSoft,
  },

  typeButtonSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },

  typeIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: COLORS.surface,
  },

  typeIconSelected: {
    backgroundColor: COLORS.navyMuted,
  },

  typeText: {
    marginTop: 10,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  typeTextSelected: {
    color: COLORS.white,
  },

  typeDescription: {
    marginTop: 4,
    paddingRight: 20,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    lineHeight: 15,
  },

  typeDescriptionSelected: {
    color: '#D4DAE1',
  },

  typeRadio: {
    position: 'absolute',
    right: 12,
    top: 13,
  },

  contactHint: {
    marginTop: 9,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    padding: 10,
    borderRadius: RADII.md,
    backgroundColor: COLORS.blueSoft,
  },

  contactHintText: {
    flex: 1,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    lineHeight: 16,
  },

  twoFieldRow: {
    flexDirection: 'row',
    gap: 10,
  },

  twoFieldColumn: {
    flex: 1,
    minWidth: 0,
  },

  addressPreview: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: RADII.md,
    backgroundColor: COLORS.accentSoft,
  },

  addressPreviewIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: COLORS.surface,
  },

  addressPreviewCopy: {
    flex: 1,
  },

  addressPreviewLabel: {
    color: COLORS.textLight,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '700',
  },

  addressPreviewText: {
    marginTop: 3,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
    fontWeight: '700',
  },

  locationCard: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.surface,
  },

  locationIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: COLORS.orangeSoft,
  },

  locationCopy: {
    flex: 1,
  },

  locationTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  locationText: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    lineHeight: 16,
  },

  locationButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceSoft,
  },

  saveCard: {
    marginTop: SPACING.xxl,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.surface,
    ...SHADOWS.card,
  },

  saveHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
  },

  saveIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: COLORS.accentSoft,
  },

  saveCopy: {
    flex: 1,
  },

  saveTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.cardTitle,
    fontWeight: '800',
  },

  saveText: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
  },

  primaryButton: {
    minHeight: LAYOUT.buttonHeight,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    borderRadius: RADII.md,
    backgroundColor: COLORS.primary,
  },

  primaryButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.body,
    fontWeight: '800',
  },

  disabledButton: {
    opacity: 0.48,
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  loadingIcon: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: COLORS.surface,
  },

  loadingTitle: {
    marginTop: 14,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.cardTitle,
    fontWeight: '800',
  },

  loadingText: {
    maxWidth: 330,
    marginTop: 5,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
    textAlign: 'center',
  },

  unavailableContainer: {
    flex: 1,
    paddingHorizontal: LAYOUT.screenPadding,
    paddingTop: 40,
  },

  unavailableContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 70,
  },

  unavailableIcon: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: COLORS.accentSoft,
  },

  unavailableTitle: {
    marginTop: 15,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.section,
    fontWeight: '800',
  },

  unavailableText: {
    maxWidth: 330,
    marginTop: 6,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.body,
    lineHeight: 20,
    textAlign: 'center',
  },
});
