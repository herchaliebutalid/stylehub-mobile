import { Ionicons } from '@expo/vector-icons';
import {
  router,
  useLocalSearchParams,
} from 'expo-router';
import {
  useCallback,
  useEffect,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import ShopOwnerPromoForm, {
  isValidPromoDateTime,
  validatePromoDiscount,
} from '@/src/components/ShopOwnerPromoForm';
import { COLORS } from '@/src/constants/colors';
import {
  LAYOUT,
  RADII,
  SPACING,
  TYPOGRAPHY,
} from '@/src/constants/design';
import { useAuth } from '@/src/context/AuthContext';
import { ApiError } from '@/src/services/api';
import {
  deleteShopOwnerPromo,
  getShopOwnerPromo,
  getShopOwnerServices,
  updateShopOwnerPromo,
} from '@/src/services/shop-owner-api';
import type {
  ShopOwnerPromoDiscountType,
  ShopOwnerService,
} from '@/src/types/shop-owner';

function routeValue(
  value:
    | string
    | string[]
    | undefined,
): string | undefined {
  return Array.isArray(value)
    ? value[0]
    : value;
}

function isoToManilaInput(
  value: string | null,
): string {
  if (!value) {
    return '';
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return '';
  }

  try {
    const formatter =
      new Intl.DateTimeFormat(
        'en-CA',
        {
          timeZone:
            'Asia/Manila',

          year:
            'numeric',

          month:
            '2-digit',

          day:
            '2-digit',

          hour:
            '2-digit',

          minute:
            '2-digit',

          second:
            '2-digit',

          hourCycle:
            'h23',
        },
      );

    const parts =
      formatter.formatToParts(
        date,
      );

    const get =
      (type: string) =>
        parts.find(
          (part) =>
            part.type === type,
        )?.value ?? '';

    return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}:${get('second')}`;
  } catch {
    return value
      .slice(0, 19)
      .replace(
        'T',
        ' ',
      );
  }
}

export default function ShopOwnerPromoDetailScreen() {
  const params =
    useLocalSearchParams<{
      promoId?:
        | string
        | string[];

      created?:
        | string
        | string[];
    }>();

  const {
    token,
  } = useAuth();

  const promoId =
    Number(
      routeValue(
        params.promoId,
      ),
    );

  const createdNow =
    routeValue(
      params.created,
    ) === '1';

  const [
    services,
    setServices,
  ] = useState<ShopOwnerService[]>([]);

  const [
    serviceId,
    setServiceId,
  ] = useState<number | null>(null);

  const [
    title,
    setTitle,
  ] = useState('');

  const [
    description,
    setDescription,
  ] = useState('');

  const [
    discountType,
    setDiscountType,
  ] = useState<ShopOwnerPromoDiscountType>(
    'percentage',
  );

  const [
    discountValue,
    setDiscountValue,
  ] = useState('');

  const [
    startsAt,
    setStartsAt,
  ] = useState('');

  const [
    endsAt,
    setEndsAt,
  ] = useState('');

  const [
    isActive,
    setIsActive,
  ] = useState(true);

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    isSaving,
    setIsSaving,
  ] = useState(false);

  const [
    isDeleting,
    setIsDeleting,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState('');

  const [
    successMessage,
    setSuccessMessage,
  ] = useState(
    createdNow
      ? 'Promotion created successfully.'
      : '',
  );

  const loadPromo =
    useCallback(
      async (): Promise<void> => {
        if (
          !token
          ||
          !Number.isInteger(
            promoId,
          )
          ||
          promoId < 1
        ) {
          setIsLoading(false);

          setErrorMessage(
            'The selected promotion is invalid.',
          );

          return;
        }

        setIsLoading(true);
        setErrorMessage('');

        try {
          const [
            promoResponse,
            servicesResponse,
          ] =
            await Promise.all([
              getShopOwnerPromo(
                token,
                promoId,
              ),

              getShopOwnerServices(
                token,
              ),
            ]);

          const promo =
            promoResponse.data.promo;

          setServices(
            servicesResponse.data.services,
          );

          setServiceId(
            promo.scope === 'shop_wide'
              ? null
              : promo.service?.id ?? null,
          );

          setTitle(
            promo.title,
          );

          setDescription(
            promo.description ?? '',
          );

          setDiscountType(
            promo.discount.type,
          );

          setDiscountValue(
            String(
              promo.discount.value,
            ),
          );

          setStartsAt(
            isoToManilaInput(
              promo.starts_at,
            ),
          );

          setEndsAt(
            isoToManilaInput(
              promo.ends_at,
            ),
          );

          setIsActive(
            promo.is_active,
          );
        } catch (error) {
          setErrorMessage(
            error instanceof ApiError
              ? error.message
              : 'Unable to load the promotion.',
          );
        } finally {
          setIsLoading(false);
        }
      },
      [
        promoId,
        token,
      ],
    );

  useEffect(
    () => {
      void loadPromo();
    },
    [
      loadPromo,
    ],
  );

  function clearMessages(): void {
    setErrorMessage('');
    setSuccessMessage('');
  }

  async function handleSave(): Promise<void> {
    if (
      !token
      ||
      isSaving
      ||
      isDeleting
    ) {
      return;
    }

    clearMessages();

    const cleanTitle =
      title.trim();

    const cleanDescription =
      description.trim();

    const cleanStartsAt =
      startsAt.trim();

    const cleanEndsAt =
      endsAt.trim();

    if (
      cleanTitle.length < 2
      ||
      cleanTitle.length > 150
    ) {
      setErrorMessage(
        'Promotion title must contain between 2 and 150 characters.',
      );

      return;
    }

    if (
      cleanDescription.length > 5000
    ) {
      setErrorMessage(
        'Description may not exceed 5000 characters.',
      );

      return;
    }

    const discountError =
      validatePromoDiscount(
        discountType,
        discountValue,
      );

    if (discountError) {
      setErrorMessage(
        discountError,
      );

      return;
    }

    if (
      !isValidPromoDateTime(
        cleanStartsAt,
      )
    ) {
      setErrorMessage(
        'Start date must use YYYY-MM-DD HH:MM:SS and contain a valid date and time.',
      );

      return;
    }

    if (
      !isValidPromoDateTime(
        cleanEndsAt,
      )
    ) {
      setErrorMessage(
        'End date must use YYYY-MM-DD HH:MM:SS and contain a valid date and time.',
      );

      return;
    }

    if (
      cleanEndsAt <= cleanStartsAt
    ) {
      setErrorMessage(
        'Promotion end date must be later than its start date.',
      );

      return;
    }

    setIsSaving(true);

    try {
      const response =
        await updateShopOwnerPromo(
          token,
          promoId,
          {
            serviceId,

            title:
              cleanTitle,

            description:
              cleanDescription,

            discountType,

            discountValue,

            startsAt:
              cleanStartsAt,

            endsAt:
              cleanEndsAt,

            isActive,
          },
        );

      const updated =
        response.data.promo;

      setServiceId(
        updated.scope === 'shop_wide'
          ? null
          : updated.service?.id ?? null,
      );

      setTitle(
        updated.title,
      );

      setDescription(
        updated.description ?? '',
      );

      setDiscountType(
        updated.discount.type,
      );

      setDiscountValue(
        String(
          updated.discount.value,
        ),
      );

      setStartsAt(
        isoToManilaInput(
          updated.starts_at,
        ),
      );

      setEndsAt(
        isoToManilaInput(
          updated.ends_at,
        ),
      );

      setIsActive(
        updated.is_active,
      );

      setSuccessMessage(
        response.message
        ??
        'Promotion updated successfully.',
      );
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : 'Unable to update the promotion.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function performDelete(): Promise<void> {
    if (
      !token
      ||
      isDeleting
      ||
      isSaving
    ) {
      return;
    }

    setIsDeleting(true);

    clearMessages();

    try {
      await deleteShopOwnerPromo(
        token,
        promoId,
      );

      router.replace(
        '/(shop-owner)/shop-owner/promos',
      );
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : 'Unable to delete the promotion.',
      );

      setIsDeleting(false);
    }
  }

  function confirmDelete(): void {
    Alert.alert(
      'Delete Promotion?',
      'This permanently removes the promotion from shop management. This action cannot be undone.',
      [
        {
          text:
            'Keep Promotion',

          style:
            'cancel',
        },

        {
          text:
            'Delete',

          style:
            'destructive',

          onPress:
            () => {
              void performDelete();
            },
        },
      ],
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView
        style={styles.safeArea}
      >
        <StatusBar
          barStyle="dark-content"
          backgroundColor={
            COLORS.background
          }
        />

        <View style={styles.loadingContainer}>
          <View style={styles.loadingIcon}>
            <ActivityIndicator
              size="small"
              color={COLORS.navy}
            />
          </View>

          <Text style={styles.loadingTitle}>
            Loading promotion
          </Text>

          <Text style={styles.loadingText}>
            Getting the latest campaign details and schedule.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (
    !title
    &&
    errorMessage
  ) {
    return (
      <SafeAreaView
        style={styles.safeArea}
      >
        <StatusBar
          barStyle="dark-content"
          backgroundColor={
            COLORS.background
          }
        />

        <View
          style={
            styles.unavailableContainer
          }
        >
          <TouchableOpacity
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={
              () =>
                router.back()
            }
            style={
              styles.topIconButton
            }
          >
            <Ionicons
              name="arrow-back"
              size={22}
              color={COLORS.navy}
            />
          </TouchableOpacity>

          <View
            style={
              styles.unavailableContent
            }
          >
            <View
              style={
                styles.unavailableIcon
              }
            >
              <Ionicons
                name="pricetag-outline"
                size={30}
                color={COLORS.navy}
              />
            </View>

            <Text
              style={
                styles.unavailableTitle
              }
            >
              Promotion unavailable
            </Text>

            <Text
              style={
                styles.unavailableText
              }
            >
              {errorMessage}
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const isBusy =
    isSaving || isDeleting;

  return (
    <SafeAreaView
      style={styles.safeArea}
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor={
          COLORS.background
        }
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={
            styles.container
          }
        >
          <View style={styles.topBar}>
            <TouchableOpacity
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Back to promotions"
              onPress={
                () =>
                  router.back()
              }
              style={
                styles.topIconButton
              }
            >
              <Ionicons
                name="arrow-back"
                size={22}
                color={COLORS.navy}
              />
            </TouchableOpacity>

            <View
              style={
                styles.topBarTitleBlock
              }
            >
              <Text
                style={
                  styles.topBarTitle
                }
              >
                Promotion details
              </Text>

              <Text
                style={
                  styles.topBarCaption
                }
              >
                Edit campaign settings
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Refresh promotion"
              disabled={isBusy}
              onPress={
                () =>
                  void loadPromo()
              }
              style={
                styles.topIconButton
              }
            >
              <Ionicons
                name="refresh-outline"
                size={21}
                color={COLORS.navy}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.header}>
            <Text style={styles.eyebrow}>
              PROMOTION MANAGEMENT
            </Text>

            <Text style={styles.title}>
              Keep the offer, schedule, and customer visibility accurate
            </Text>

            <Text style={styles.subtitle}>
              Update which customers are eligible, the discount value,
              campaign dates, and whether the promotion is enabled.
            </Text>
          </View>

          {successMessage ? (
            <MessageBox
              type="success"
              title={
                createdNow
                  ? 'Promotion created'
                  : 'Changes saved'
              }
              message={
                successMessage
              }
            />
          ) : null}

          {errorMessage ? (
            <MessageBox
              type="error"
              title="Promotion needs attention"
              message={
                errorMessage
              }
            />
          ) : null}

          <View style={styles.formWrap}>
            <ShopOwnerPromoForm
              services={services}
              isLoadingServices={false}
              serviceId={serviceId}
              title={title}
              description={description}
              discountType={discountType}
              discountValue={discountValue}
              startsAt={startsAt}
              endsAt={endsAt}
              isActive={isActive}
              disabled={isBusy}
              onServiceIdChange={
                (value) => {
                  setServiceId(value);
                  clearMessages();
                }
              }
              onTitleChange={
                (value) => {
                  setTitle(value);
                  clearMessages();
                }
              }
              onDescriptionChange={
                (value) => {
                  setDescription(value);
                  clearMessages();
                }
              }
              onDiscountTypeChange={
                (value) => {
                  setDiscountType(value);
                  clearMessages();
                }
              }
              onDiscountValueChange={
                (value) => {
                  setDiscountValue(value);
                  clearMessages();
                }
              }
              onStartsAtChange={
                (value) => {
                  setStartsAt(value);
                  clearMessages();
                }
              }
              onEndsAtChange={
                (value) => {
                  setEndsAt(value);
                  clearMessages();
                }
              }
              onActiveChange={
                (value) => {
                  setIsActive(value);
                  clearMessages();
                }
              }
            />
          </View>

          <View style={styles.saveCard}>
            <View style={styles.saveHeader}>
              <View style={styles.saveIcon}>
                <Ionicons
                  name="save-outline"
                  size={20}
                  color={COLORS.navy}
                />
              </View>

              <View style={styles.saveCopy}>
                <Text style={styles.saveTitle}>
                  Save promotion changes
                </Text>

                <Text style={styles.saveText}>
                  Updated settings will be used when StyleHub decides
                  whether this promotion is visible to customers.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.84}
              disabled={isBusy}
              accessibilityRole="button"
              accessibilityLabel="Save promotion changes"
              onPress={
                () =>
                  void handleSave()
              }
              style={[
                styles.primaryButton,

                isBusy &&
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
                  name="checkmark-circle-outline"
                  size={20}
                  color={COLORS.white}
                />
              )}

              <Text
                style={
                  styles.primaryButtonText
                }
              >
                {isSaving
                  ? 'Saving changes...'
                  : 'Save changes'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.dangerCard}>
            <View style={styles.dangerHeader}>
              <View style={styles.dangerIcon}>
                <Ionicons
                  name="trash-outline"
                  size={20}
                  color={COLORS.danger}
                />
              </View>

              <View style={styles.dangerCopy}>
                <Text style={styles.dangerTitle}>
                  Delete promotion
                </Text>

                <Text style={styles.dangerText}>
                  Permanently remove this promotion. Disable it instead
                  if you may want to reuse the campaign later.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              disabled={isBusy}
              accessibilityRole="button"
              accessibilityLabel="Delete promotion"
              onPress={
                confirmDelete
              }
              style={[
                styles.deleteButton,

                isBusy &&
                  styles.disabledButton,
              ]}
            >
              {isDeleting ? (
                <ActivityIndicator
                  size="small"
                  color={COLORS.danger}
                />
              ) : (
                <Ionicons
                  name="trash-outline"
                  size={18}
                  color={COLORS.danger}
                />
              )}

              <Text style={styles.deleteButtonText}>
                {isDeleting
                  ? 'Deleting promotion...'
                  : 'Delete promotion'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function MessageBox({
  type,
  title,
  message,
}: {
  type:
    | 'success'
    | 'error';

  title:
    string;

  message:
    string;
}) {
  const success =
    type === 'success';

  return (
    <View
      style={[
        styles.messageBox,

        {
          backgroundColor:
            success
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
              color:
                success
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  flex: {
    flex: 1,
  },

  container: {
    width: '100%',
    maxWidth: LAYOUT.contentMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: LAYOUT.screenPadding,
    paddingTop: SPACING.sm,
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
    maxWidth: 560,
    marginTop: 5,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.title,
    lineHeight: 30,
    fontWeight: '800',
    letterSpacing: -0.6,
  },

  subtitle: {
    maxWidth: 600,
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

  formWrap: {
    marginTop: SPACING.xl,
  },

  saveCard: {
    marginTop: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.surface,
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
    opacity: 0.52,
  },

  dangerCard: {
    marginTop: SPACING.xxl,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.danger,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.dangerSoft,
  },

  dangerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
  },

  dangerIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: COLORS.surface,
  },

  dangerCopy: {
    flex: 1,
  },

  dangerTitle: {
    color: COLORS.danger,
    fontSize: TYPOGRAPHY.cardTitle,
    fontWeight: '800',
  },

  dangerText: {
    marginTop: 4,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
  },

  deleteButton: {
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

  deleteButtonText: {
    color: COLORS.danger,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
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
    marginTop: 5,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
    textAlign: 'center',
  },

  unavailableContainer: {
    flex: 1,
    paddingHorizontal: LAYOUT.screenPadding,
    paddingTop: SPACING.sm,
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
    maxWidth: 320,
    marginTop: 6,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.body,
    lineHeight: 20,
    textAlign: 'center',
  },
});