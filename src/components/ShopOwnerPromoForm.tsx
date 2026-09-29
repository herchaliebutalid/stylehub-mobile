import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

import { COLORS } from '@/src/constants/colors';
import {
    RADII,
    SHADOWS,
    TYPOGRAPHY,
} from '@/src/constants/design';
import type {
    ShopOwnerPromoDiscountType,
    ShopOwnerService,
} from '@/src/types/shop-owner';

type IconName = ComponentProps<typeof Ionicons>['name'];

interface ShopOwnerPromoFormProps {
  services: ShopOwnerService[];
  isLoadingServices: boolean;
  serviceId: number | null;
  title: string;
  description: string;
  discountType: ShopOwnerPromoDiscountType;
  discountValue: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  disabled?: boolean;
  onServiceIdChange: (value: number | null) => void;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onDiscountTypeChange: (value: ShopOwnerPromoDiscountType) => void;
  onDiscountValueChange: (value: string) => void;
  onStartsAtChange: (value: string) => void;
  onEndsAtChange: (value: string) => void;
  onActiveChange: (value: boolean) => void;
}

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export function isValidPromoDateTime(value: string): boolean {
  const match =
    /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(
      value,
    );

  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);

  const date = new Date(
    Date.UTC(
      year,
      month - 1,
      day,
      hour,
      minute,
      second,
    ),
  );

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day &&
    date.getUTCHours() === hour &&
    date.getUTCMinutes() === minute &&
    date.getUTCSeconds() === second
  );
}

export function validatePromoDiscount(
  type: ShopOwnerPromoDiscountType,
  value: string,
): string | null {
  const clean = value.trim();

  if (!/^\d{1,8}(\.\d{1,2})?$/.test(clean)) {
    return 'Discount must be a positive number with at most 8 digits before the decimal and at most 2 decimal places.';
  }

  const amount = Number(clean);

  if (!Number.isFinite(amount) || amount <= 0) {
    return 'Discount must be greater than zero.';
  }

  if (amount > 99999999.99) {
    return 'Discount value is too large.';
  }

  if (type === 'percentage' && amount > 100) {
    return 'Percentage discount cannot exceed 100%.';
  }

  return null;
}

export function cleanPromoDiscountInput(value: string): string {
  const clean = value.replace(/[^0-9.]/g, '');
  const firstDecimal = clean.indexOf('.');

  if (firstDecimal < 0) {
    return clean.slice(0, 8);
  }

  const whole = clean.slice(0, firstDecimal).slice(0, 8);

  const decimal = clean
    .slice(firstDecimal + 1)
    .replace(/\./g, '')
    .slice(0, 2);

  return `${whole}.${decimal}`;
}

function formatDateTimePreview(value: string): string {
  if (!isValidPromoDateTime(value)) {
    return value.trim() || 'Not set';
  }

  const match =
    /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(
      value,
    );

  if (!match) {
    return value;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour24 = Number(match[4]);
  const minute = match[5];

  const suffix =
    hour24 >= 12
      ? 'PM'
      : 'AM';

  const hour12 =
    hour24 % 12 || 12;

  return `${MONTHS[month - 1]} ${day}, ${year} · ${hour12}:${minute} ${suffix}`;
}

function formatDiscountPreview(
  type: ShopOwnerPromoDiscountType,
  value: string,
): string {
  const clean = value.trim();

  if (!clean) {
    return type === 'percentage'
      ? '0% OFF'
      : '₱0.00 OFF';
  }

  const numeric = Number(clean);

  if (!Number.isFinite(numeric)) {
    return type === 'percentage'
      ? `${clean}% OFF`
      : `₱${clean} OFF`;
  }

  return type === 'percentage'
    ? `${numeric.toFixed(2)}% OFF`
    : `₱${numeric.toFixed(2)} OFF`;
}

export default function ShopOwnerPromoForm({
  services,
  isLoadingServices,
  serviceId,
  title,
  description,
  discountType,
  discountValue,
  startsAt,
  endsAt,
  isActive,
  disabled = false,
  onServiceIdChange,
  onTitleChange,
  onDescriptionChange,
  onDiscountTypeChange,
  onDiscountValueChange,
  onStartsAtChange,
  onEndsAtChange,
  onActiveChange,
}: ShopOwnerPromoFormProps) {
  const selectedService =
    services.find(
      (service) =>
        service.id === serviceId,
    ) ?? null;

  const targetLabel =
    serviceId === null
      ? 'Entire shop'
      : selectedService?.name ?? 'Selected service';

  return (
    <>
      {/* PROMOTION PREVIEW */}

      <View style={styles.previewCard}>
        <View style={styles.previewTopRow}>
          <View style={styles.previewIcon}>
            <Ionicons
              name="pricetag-outline"
              size={22}
              color={COLORS.white}
            />
          </View>

          <View
            style={[
              styles.previewStatus,

              isActive
                ? styles.previewStatusActive
                : styles.previewStatusInactive,
            ]}
          >
            <View
              style={[
                styles.previewStatusDot,

                {
                  backgroundColor:
                    isActive
                      ? COLORS.green
                      : COLORS.textMuted,
                },
              ]}
            />

            <Text
              style={[
                styles.previewStatusText,

                {
                  color:
                    isActive
                      ? COLORS.green
                      : COLORS.textMuted,
                },
              ]}
            >
              {isActive
                ? 'Enabled'
                : 'Disabled'}
            </Text>
          </View>
        </View>

        <Text
          style={styles.previewTitle}
          numberOfLines={2}
        >
          {title.trim() || 'New promotion'}
        </Text>

        <Text style={styles.previewDiscount}>
          {formatDiscountPreview(
            discountType,
            discountValue,
          )}
        </Text>

        <View style={styles.previewTargetRow}>
          <Ionicons
            name={
              serviceId === null
                ? 'storefront-outline'
                : 'cut-outline'
            }
            size={14}
            color="#D4DAE1"
          />

          <Text
            style={styles.previewTargetText}
            numberOfLines={1}
          >
            {targetLabel}
          </Text>
        </View>

        <View style={styles.previewPeriod}>
          <PreviewPeriodRow
            icon="play-outline"
            label="Starts"
            value={
              formatDateTimePreview(
                startsAt,
              )
            }
          />

          <View
            style={styles.previewPeriodDivider}
          />

          <PreviewPeriodRow
            icon="stop-outline"
            label="Ends"
            value={
              formatDateTimePreview(
                endsAt,
              )
            }
          />
        </View>
      </View>

      {/* TARGET */}

      <FormSection
        icon="locate-outline"
        title="Promotion target"
        subtitle="Apply the discount to your whole shop or only one service."
      >
        <TargetOption
          icon="storefront-outline"
          title="Entire shop"
          description="Customers can use this promotion across your shop."
          selected={
            serviceId === null
          }
          disabled={disabled}
          onPress={
            () =>
              onServiceIdChange(
                null,
              )
          }
        />

        <Text style={styles.targetSubheading}>
          Specific service
        </Text>

        {isLoadingServices ? (
          <View style={styles.servicesLoading}>
            <ActivityIndicator
              size="small"
              color={COLORS.navy}
            />

            <Text style={styles.servicesLoadingText}>
              Loading services...
            </Text>
          </View>
        ) : services.length === 0 ? (
          <View style={styles.servicesEmpty}>
            <Ionicons
              name="cut-outline"
              size={20}
              color={COLORS.textMuted}
            />

            <Text style={styles.servicesEmptyText}>
              No services are available yet. You can still create a
              shop-wide promotion.
            </Text>
          </View>
        ) : (
          <View style={styles.serviceList}>
            {services.map(
              (service) => (
                <TargetOption
                  key={service.id}
                  icon="cut-outline"
                  title={service.name}
                  description={
                    service.is_active
                      ? `Active · ₱${Number(service.price).toFixed(2)}`
                      : `Inactive · ₱${Number(service.price).toFixed(2)}`
                  }
                  selected={
                    serviceId === service.id
                  }
                  disabled={disabled}
                  muted={
                    !service.is_active
                  }
                  onPress={
                    () =>
                      onServiceIdChange(
                        service.id,
                      )
                  }
                />
              ),
            )}
          </View>
        )}
      </FormSection>

      {/* DETAILS */}

      <FormSection
        icon="document-text-outline"
        title="Promotion details"
        subtitle="Use a short title and an optional description customers can understand quickly."
      >
        <FieldHeader
          label="Promotion title"
          hint={`${title.length}/150`}
        />

        <TextInput
          value={title}
          onChangeText={
            (value) => {
              if (
                value.length <= 150
              ) {
                onTitleChange(
                  value,
                );
              }
            }
          }
          editable={!disabled}
          autoCapitalize="sentences"
          placeholder="Example: Back to School Special"
          placeholderTextColor={
            COLORS.textLight
          }
          style={styles.input}
        />

        <View style={styles.fieldSpacer} />

        <FieldHeader
          label="Description"
          hint={`Optional · ${description.length}/5000`}
        />

        <TextInput
          value={description}
          onChangeText={
            (value) => {
              if (
                value.length <= 5000
              ) {
                onDescriptionChange(
                  value,
                );
              }
            }
          }
          editable={!disabled}
          multiline
          textAlignVertical="top"
          placeholder="Describe the offer, who it is for, or what customers should know."
          placeholderTextColor={
            COLORS.textLight
          }
          style={styles.textArea}
        />
      </FormSection>

      {/* DISCOUNT */}

      <FormSection
        icon="cash-outline"
        title="Discount"
        subtitle="Choose how the discount is calculated and enter its value."
      >
        <View style={styles.discountTypeRow}>
          <DiscountTypeOption
            icon="pricetag-outline"
            title="Percentage"
            subtitle="Example: 20% off"
            selected={
              discountType ===
              'percentage'
            }
            disabled={disabled}
            onPress={
              () =>
                onDiscountTypeChange(
                  'percentage',
                )
            }
          />

          <DiscountTypeOption
            icon="cash-outline"
            title="Fixed amount"
            subtitle="Example: ₱100 off"
            selected={
              discountType ===
              'fixed_amount'
            }
            disabled={disabled}
            onPress={
              () =>
                onDiscountTypeChange(
                  'fixed_amount',
                )
            }
          />
        </View>

        <View style={styles.fieldSpacer} />

        <FieldHeader
          label={
            discountType === 'percentage'
              ? 'Discount percentage'
              : 'Discount amount'
          }
        />

        <View style={styles.discountInputShell}>
          <View style={styles.discountPrefix}>
            <Text style={styles.discountPrefixText}>
              {discountType === 'percentage'
                ? '%'
                : '₱'}
            </Text>
          </View>

          <TextInput
            value={discountValue}
            onChangeText={
              (value) =>
                onDiscountValueChange(
                  cleanPromoDiscountInput(
                    value,
                  ),
                )
            }
            editable={!disabled}
            keyboardType="decimal-pad"
            placeholder={
              discountType === 'percentage'
                ? '20'
                : '100.00'
            }
            placeholderTextColor={
              COLORS.textLight
            }
            style={styles.discountInput}
          />
        </View>

        <Text style={styles.fieldHelp}>
          {discountType === 'percentage'
            ? 'Percentage discounts can be greater than 0% and up to 100%.'
            : 'Enter the peso amount that should be deducted from the eligible service price.'}
        </Text>
      </FormSection>

      {/* PERIOD */}

      <FormSection
        icon="calendar-outline"
        title="Promotion period"
        subtitle="Set when the campaign starts and ends using Philippine local time."
      >
        <DateTimeField
          icon="play-outline"
          label="Starts at"
          value={startsAt}
          placeholder="2026-09-01 08:00:00"
          disabled={disabled}
          onChange={
            onStartsAtChange
          }
        />

        <View style={styles.dateConnector}>
          <View
            style={styles.dateConnectorLine}
          />

          <View
            style={styles.dateConnectorIcon}
          >
            <Ionicons
              name="arrow-down"
              size={14}
              color={COLORS.textMuted}
            />
          </View>

          <View
            style={styles.dateConnectorLine}
          />
        </View>

        <DateTimeField
          icon="stop-outline"
          label="Ends at"
          value={endsAt}
          placeholder="2026-09-30 23:59:59"
          disabled={disabled}
          onChange={
            onEndsAtChange
          }
        />

        <View style={styles.formatHint}>
          <Ionicons
            name="information-circle-outline"
            size={17}
            color={COLORS.blue}
          />

          <Text style={styles.formatHintText}>
            Required format: YYYY-MM-DD HH:MM:SS. Example:
            2026-09-30 23:59:59.
          </Text>
        </View>
      </FormSection>

      {/* VISIBILITY */}

      <FormSection
        icon="eye-outline"
        title="Customer visibility"
        subtitle="Disable a campaign without deleting its promotion record."
      >
        <View style={styles.visibilityRow}>
          <View
            style={[
              styles.visibilityIcon,

              {
                backgroundColor:
                  isActive
                    ? COLORS.greenSoft
                    : COLORS.surfaceSoft,
              },
            ]}
          >
            <Ionicons
              name={
                isActive
                  ? 'checkmark-circle-outline'
                  : 'eye-off-outline'
              }
              size={21}
              color={
                isActive
                  ? COLORS.green
                  : COLORS.textMuted
              }
            />
          </View>

          <View style={styles.visibilityContent}>
            <Text style={styles.visibilityTitle}>
              {isActive
                ? 'Promotion enabled'
                : 'Promotion disabled'}
            </Text>

            <Text style={styles.visibilityText}>
              {isActive
                ? 'The campaign can become customer-visible when its schedule is current and all other promo rules are satisfied.'
                : 'Customers will not see this promotion while it is disabled.'}
            </Text>
          </View>

          <Switch
            value={isActive}
            disabled={disabled}
            onValueChange={
              onActiveChange
            }
            trackColor={{
              false: COLORS.border,
              true: COLORS.green,
            }}
            thumbColor={COLORS.white}
            ios_backgroundColor={
              COLORS.border
            }
          />
        </View>
      </FormSection>
    </>
  );
}

function FormSection({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: IconName;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIcon}>
          <Ionicons
            name={icon}
            size={20}
            color={COLORS.navy}
          />
        </View>

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>
            {title}
          </Text>

          <Text style={styles.sectionSubtitle}>
            {subtitle}
          </Text>
        </View>
      </View>

      <View style={styles.sectionBody}>
        {children}
      </View>
    </View>
  );
}

function FieldHeader({
  label,
  hint,
}: {
  label: string;
  hint?: string;
}) {
  return (
    <View style={styles.fieldHeader}>
      <Text style={styles.fieldLabel}>
        {label}
      </Text>

      {hint ? (
        <Text style={styles.fieldHint}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

function TargetOption({
  icon,
  title,
  description,
  selected,
  disabled,
  muted = false,
  onPress,
}: {
  icon: IconName;
  title: string;
  description: string;
  selected: boolean;
  disabled: boolean;
  muted?: boolean;
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
        styles.targetOption,

        selected &&
          styles.targetOptionSelected,

        muted &&
          styles.targetOptionMuted,
      ]}
    >
      <View
        style={[
          styles.targetOptionIcon,

          selected &&
            styles.targetOptionIconSelected,
        ]}
      >
        <Ionicons
          name={icon}
          size={19}
          color={
            selected
              ? COLORS.white
              : COLORS.navy
          }
        />
      </View>

      <View style={styles.targetOptionContent}>
        <Text
          style={styles.targetOptionTitle}
          numberOfLines={1}
        >
          {title}
        </Text>

        <Text
          style={styles.targetOptionDescription}
          numberOfLines={2}
        >
          {description}
        </Text>
      </View>

      <Ionicons
        name={
          selected
            ? 'radio-button-on'
            : 'radio-button-off'
        }
        size={20}
        color={
          selected
            ? COLORS.navy
            : COLORS.textLight
        }
      />
    </TouchableOpacity>
  );
}

function DiscountTypeOption({
  icon,
  title,
  subtitle,
  selected,
  disabled,
  onPress,
}: {
  icon: IconName;
  title: string;
  subtitle: string;
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
        styles.discountTypeOption,

        selected &&
          styles.discountTypeOptionSelected,
      ]}
    >
      <View
        style={[
          styles.discountTypeIcon,

          selected &&
            styles.discountTypeIconSelected,
        ]}
      >
        <Ionicons
          name={icon}
          size={19}
          color={
            selected
              ? COLORS.white
              : COLORS.navy
          }
        />
      </View>

      <Text
        style={[
          styles.discountTypeTitle,

          selected &&
            styles.discountTypeTitleSelected,
        ]}
      >
        {title}
      </Text>

      <Text
        style={[
          styles.discountTypeSubtitle,

          selected &&
            styles.discountTypeSubtitleSelected,
        ]}
      >
        {subtitle}
      </Text>
    </TouchableOpacity>
  );
}

function DateTimeField({
  icon,
  label,
  value,
  placeholder,
  disabled,
  onChange,
}: {
  icon: IconName;
  label: string;
  value: string;
  placeholder: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const valid =
    isValidPromoDateTime(
      value.trim(),
    );

  return (
    <View>
      <FieldHeader
        label={label}
        hint="Philippine time"
      />

      <View style={styles.dateTimeInputShell}>
        <View style={styles.dateTimeIcon}>
          <Ionicons
            name={icon}
            size={17}
            color={COLORS.navy}
          />
        </View>

        <TextInput
          value={value}
          onChangeText={onChange}
          editable={!disabled}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={19}
          keyboardType="numbers-and-punctuation"
          placeholder={placeholder}
          placeholderTextColor={
            COLORS.textLight
          }
          style={styles.dateTimeInput}
        />
      </View>

      {value.trim() ? (
        <View style={styles.datePreviewRow}>
          <Ionicons
            name={
              valid
                ? 'checkmark-circle-outline'
                : 'alert-circle-outline'
            }
            size={15}
            color={
              valid
                ? COLORS.green
                : COLORS.warning
            }
          />

          <Text
            style={[
              styles.datePreviewText,

              {
                color:
                  valid
                    ? COLORS.green
                    : COLORS.warning,
              },
            ]}
          >
            {valid
              ? formatDateTimePreview(
                  value.trim(),
                )
              : 'Enter a complete date and time in the required format.'}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function PreviewPeriodRow({
  icon,
  label,
  value,
}: {
  icon: IconName;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.previewPeriodRow}>
      <Ionicons
        name={icon}
        size={14}
        color="#D4DAE1"
      />

      <Text style={styles.previewPeriodLabel}>
        {label}
      </Text>

      <Text
        style={styles.previewPeriodValue}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  previewCard: {
    padding: 18,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.primary,
    ...SHADOWS.card,
  },

  previewTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  previewIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: COLORS.navyMuted,
  },

  previewStatus: {
    minHeight: 29,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    borderRadius: RADII.pill,
  },

  previewStatusActive: {
    backgroundColor: COLORS.greenSoft,
  },

  previewStatusInactive: {
    backgroundColor: COLORS.surfaceSoft,
  },

  previewStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  previewStatusText: {
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '800',
  },

  previewTitle: {
    marginTop: 18,
    color: COLORS.white,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },

  previewDiscount: {
    marginTop: 6,
    color: COLORS.white,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    letterSpacing: -0.6,
  },

  previewTargetRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  previewTargetText: {
    flex: 1,
    color: '#D4DAE1',
    fontSize: TYPOGRAPHY.caption,
    fontWeight: '600',
  },

  previewPeriod: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.navyMuted,
  },

  previewPeriodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  previewPeriodLabel: {
    width: 42,
    color: '#AEB8C5',
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '700',
  },

  previewPeriodValue: {
    flex: 1,
    color: COLORS.white,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '700',
    textAlign: 'right',
  },

  previewPeriodDivider: {
    height: 1,
    marginVertical: 9,
    marginLeft: 63,
    backgroundColor: COLORS.navyMuted,
  },

  sectionCard: {
    marginTop: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.surface,
    ...SHADOWS.card,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
  },

  sectionIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: COLORS.accentSoft,
  },

  sectionHeading: {
    flex: 1,
  },

  sectionTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.cardTitle,
    fontWeight: '800',
  },

  sectionSubtitle: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 17,
  },

  sectionBody: {
    marginTop: 18,
  },

  targetOption: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.surfaceSoft,
  },

  targetOptionSelected: {
    borderColor: COLORS.navy,
    backgroundColor: COLORS.accentSoft,
  },

  targetOptionMuted: {
    opacity: 0.72,
  },

  targetOptionIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: COLORS.surface,
  },

  targetOptionIconSelected: {
    backgroundColor: COLORS.primary,
  },

  targetOptionContent: {
    flex: 1,
    minWidth: 0,
  },

  targetOptionTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  targetOptionDescription: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    lineHeight: 16,
  },

  targetSubheading: {
    marginTop: 16,
    marginBottom: 9,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '800',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },

  servicesLoading: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surfaceSoft,
  },

  servicesLoadingText: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
  },

  servicesEmpty: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    padding: 12,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surfaceSoft,
  },

  servicesEmptyText: {
    flex: 1,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 17,
  },

  serviceList: {
    gap: 8,
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

  fieldHint: {
    color: COLORS.textLight,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '600',
  },

  input: {
    minHeight: 50,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.md,
    color: COLORS.text,
    backgroundColor: COLORS.surfaceSoft,
    fontSize: TYPOGRAPHY.body,
  },

  textArea: {
    minHeight: 118,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.md,
    color: COLORS.text,
    backgroundColor: COLORS.surfaceSoft,
    fontSize: TYPOGRAPHY.body,
    lineHeight: 20,
  },

  fieldSpacer: {
    height: 18,
  },

  discountTypeRow: {
    flexDirection: 'row',
    gap: 10,
  },

  discountTypeOption: {
    flex: 1,
    minHeight: 116,
    padding: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.surfaceSoft,
  },

  discountTypeOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },

  discountTypeIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.surface,
  },

  discountTypeIconSelected: {
    backgroundColor: COLORS.navyMuted,
  },

  discountTypeTitle: {
    marginTop: 10,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  discountTypeTitleSelected: {
    color: COLORS.white,
  },

  discountTypeSubtitle: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    lineHeight: 15,
  },

  discountTypeSubtitleSelected: {
    color: '#D4DAE1',
  },

  discountInputShell: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surfaceSoft,
  },

  discountPrefix: {
    alignSelf: 'stretch',
    justifyContent: 'center',
    paddingHorizontal: 15,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    backgroundColor: COLORS.accentSoft,
  },

  discountPrefixText: {
    color: COLORS.navy,
    fontSize: TYPOGRAPHY.cardTitle,
    fontWeight: '800',
  },

  discountInput: {
    flex: 1,
    minHeight: 50,
    paddingHorizontal: 13,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.body,
    fontWeight: '700',
  },

  fieldHelp: {
    marginTop: 7,
    color: COLORS.textLight,
    fontSize: TYPOGRAPHY.micro,
    lineHeight: 16,
  },

  dateTimeInputShell: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surfaceSoft,
  },

  dateTimeIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: COLORS.surface,
  },

  dateTimeInput: {
    flex: 1,
    minWidth: 0,
    minHeight: 52,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '700',
  },

  datePreviewRow: {
    marginTop: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  datePreviewText: {
    flex: 1,
    fontSize: TYPOGRAPHY.micro,
    lineHeight: 16,
    fontWeight: '600',
  },

  dateConnector: {
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },

  dateConnectorLine: {
    width: 1,
    flex: 1,
    backgroundColor: COLORS.border,
  },

  dateConnectorIcon: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.surface,
  },

  formatHint: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 11,
    borderRadius: RADII.md,
    backgroundColor: COLORS.blueSoft,
  },

  formatHintText: {
    flex: 1,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    lineHeight: 16,
  },

  visibilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },

  visibilityIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },

  visibilityContent: {
    flex: 1,
  },

  visibilityTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  visibilityText: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    lineHeight: 16,
  },
});