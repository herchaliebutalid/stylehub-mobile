import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
  createShopOwnerPromo,
  getShopOwnerServices,
} from '@/src/services/shop-owner-api';
import type {
  ShopOwnerPromoDiscountType,
  ShopOwnerService,
} from '@/src/types/shop-owner';

export default function CreateShopOwnerPromoScreen() {
  const {
    token,
  } = useAuth();

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
    isLoadingServices,
    setIsLoadingServices,
  ] = useState(true);

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState('');

  const loadServices =
    useCallback(
      async (): Promise<void> => {
        if (!token) {
          setIsLoadingServices(false);
          return;
        }

        setIsLoadingServices(true);
        setErrorMessage('');

        try {
          const response =
            await getShopOwnerServices(
              token,
            );

          setServices(
            response.data.services,
          );
        } catch (error) {
          setErrorMessage(
            error instanceof ApiError
              ? error.message
              : 'Unable to load your shop services.',
          );
        } finally {
          setIsLoadingServices(false);
        }
      },
      [
        token,
      ],
    );

  useEffect(
    () => {
      void loadServices();
    },
    [
      loadServices,
    ],
  );

  function handleBack(): void {
    router.replace(
      '/(shop-owner)/shop-owner/promos',
    );
  }

  async function handleSubmit(): Promise<void> {
    if (
      !token
      ||
      isSubmitting
    ) {
      if (!token) {
        setErrorMessage(
          'Your authenticated session is unavailable.',
        );
      }

      return;
    }

    setErrorMessage('');

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

    setIsSubmitting(true);

    try {
      const response =
        await createShopOwnerPromo(
          token,
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

      router.replace({
        pathname:
          '/(shop-owner)/promo/[promoId]',

        params: {
          promoId:
            String(
              response.data.promo.id,
            ),

          created:
            '1',
        },
      });
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : 'Unable to create the promotion.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

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
                handleBack
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
                Create promotion
              </Text>

              <Text
                style={
                  styles.topBarCaption
                }
              >
                Build a customer offer
              </Text>
            </View>

            <View
              style={
                styles.topBarSpacer
              }
            />
          </View>

          <View style={styles.header}>
            <Text style={styles.eyebrow}>
              NEW PROMOTION
            </Text>

            <Text style={styles.title}>
              Build a clear offer for the right customers
            </Text>

            <Text style={styles.subtitle}>
              Choose the target, discount, campaign period, and whether the
              promotion should be enabled.
            </Text>
          </View>

          <View style={styles.tipCard}>
            <View style={styles.tipIcon}>
              <Ionicons
                name="information-circle-outline"
                size={20}
                color={COLORS.blue}
              />
            </View>

            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>
                Customer visibility is automatic
              </Text>

              <Text style={styles.tipText}>
                An enabled promotion only becomes visible when its date range
                is current and the existing promo rules allow it.
              </Text>
            </View>
          </View>

          {errorMessage ? (
            <View style={styles.errorBox}>
              <View style={styles.errorIcon}>
                <Ionicons
                  name="alert-circle-outline"
                  size={19}
                  color={COLORS.danger}
                />
              </View>

              <View
                style={
                  styles.errorContent
                }
              >
                <Text style={styles.errorTitle}>
                  Check promotion details
                </Text>

                <Text style={styles.errorText}>
                  {errorMessage}
                </Text>
              </View>
            </View>
          ) : null}

          <View style={styles.formWrap}>
            <ShopOwnerPromoForm
              services={services}
              isLoadingServices={
                isLoadingServices
              }
              serviceId={serviceId}
              title={title}
              description={description}
              discountType={discountType}
              discountValue={discountValue}
              startsAt={startsAt}
              endsAt={endsAt}
              isActive={isActive}
              disabled={isSubmitting}
              onServiceIdChange={
                setServiceId
              }
              onTitleChange={
                setTitle
              }
              onDescriptionChange={
                setDescription
              }
              onDiscountTypeChange={
                setDiscountType
              }
              onDiscountValueChange={
                setDiscountValue
              }
              onStartsAtChange={
                setStartsAt
              }
              onEndsAtChange={
                setEndsAt
              }
              onActiveChange={
                setIsActive
              }
            />
          </View>

          <View style={styles.saveCard}>
            <View style={styles.saveHeader}>
              <View style={styles.saveIcon}>
                <Ionicons
                  name="sparkles-outline"
                  size={20}
                  color={COLORS.navy}
                />
              </View>

              <View style={styles.saveCopy}>
                <Text style={styles.saveTitle}>
                  Ready to publish the campaign?
                </Text>

                <Text style={styles.saveText}>
                  You can edit the promotion, change its schedule, or disable
                  it later without deleting it.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.84}
              disabled={
                isSubmitting
              }
              accessibilityRole="button"
              accessibilityLabel="Create promotion"
              onPress={
                () =>
                  void handleSubmit()
              }
              style={[
                styles.primaryButton,

                isSubmitting &&
                  styles.disabledButton,
              ]}
            >
              {isSubmitting ? (
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
                {isSubmitting
                  ? 'Creating promotion...'
                  : 'Create promotion'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
    marginLeft: -10,
    borderRadius: RADII.pill,
  },

  topBarTitleBlock: {
    flex: 1,
    marginLeft: 4,
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

  topBarSpacer: {
    width: LAYOUT.iconButtonSize,
    height: LAYOUT.iconButtonSize,
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
    maxWidth: 540,
    marginTop: 5,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.title,
    lineHeight: 30,
    fontWeight: '800',
    letterSpacing: -0.6,
  },

  subtitle: {
    maxWidth: 590,
    marginTop: 8,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.body,
    lineHeight: 21,
  },

  tipCard: {
    marginTop: SPACING.xl,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.surface,
  },

  tipIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: COLORS.blueSoft,
  },

  tipContent: {
    flex: 1,
  },

  tipTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  tipText: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
  },

  errorBox: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: RADII.md,
    backgroundColor: COLORS.dangerSoft,
  },

  errorIcon: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: COLORS.surface,
  },

  errorContent: {
    flex: 1,
  },

  errorTitle: {
    color: COLORS.danger,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  errorText: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
  },

  formWrap: {
    marginTop: 14,
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
});