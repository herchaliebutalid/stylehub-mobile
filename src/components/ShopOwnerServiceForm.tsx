import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import {
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

type IoniconName =
  ComponentProps<typeof Ionicons>['name'];


const DURATION_PRESETS = [
  15,
  30,
  45,
  60,
  90,
  120,
] as const;


interface ShopOwnerServiceFormProps {
  name: string;

  description: string;

  price: string;

  duration: string;

  isActive: boolean;

  disabled?: boolean;

  onNameChange:
    (value: string) => void;

  onDescriptionChange:
    (value: string) => void;

  onPriceChange:
    (value: string) => void;

  onDurationChange:
    (value: string) => void;

  onActiveChange:
    (value: boolean) => void;
}


export default function ShopOwnerServiceForm({
  name,
  description,
  price,
  duration,
  isActive,
  disabled = false,
  onNameChange,
  onDescriptionChange,
  onPriceChange,
  onDurationChange,
  onActiveChange,
}: ShopOwnerServiceFormProps) {
  const displayName =
    name.trim()
    ||
    'New service';


  const displayPrice =
    price.trim()
      ? `₱${price.trim()}`
      : '₱0.00';


  const displayDuration =
    duration.trim()
      ? `${duration.trim()} min`
      : 'Duration not set';


  return (
    <>

      {/* ================================================================
          SERVICE PREVIEW
          ================================================================ */}

      <View
        style={
          styles.previewCard
        }
      >
        <View
          style={
            styles.previewTopRow
          }
        >
          <View
            style={
              styles.previewIcon
            }
          >
            <Ionicons
              name="cut-outline"
              size={
                22
              }
              color={
                COLORS.white
              }
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
                ? 'Active'
                : 'Inactive'}
            </Text>
          </View>
        </View>


        <Text
          style={
            styles.previewName
          }
          numberOfLines={
            2
          }
        >
          {displayName}
        </Text>


        <View
          style={
            styles.previewMetaRow
          }
        >
          <Text
            style={
              styles.previewPrice
            }
          >
            {displayPrice}
          </Text>

          <View
            style={
              styles.previewDot
            }
          />

          <Text
            style={
              styles.previewDuration
            }
          >
            {displayDuration}
          </Text>
        </View>


        <Text
          style={
            styles.previewHint
          }
        >
          Preview of how this service information is presented in StyleHub.
        </Text>
      </View>


      {/* ================================================================
          SERVICE INFORMATION
          ================================================================ */}

      <FormSection
        icon="information-circle-outline"
        title="Service details"
        subtitle="Give customers a clear name and useful description."
      >
        <FieldLabel
          label="Service name"
          hint={`${name.length}/120`}
        />


        <TextInput
          value={
            name
          }
          onChangeText={
            (
              value,
            ) => {
              if (
                value.length <=
                120
              ) {
                onNameChange(
                  value,
                );
              }
            }
          }
          editable={
            !disabled
          }
          autoCapitalize="words"
          autoCorrect={
            false
          }
          placeholder="Example: Classic Haircut"
          placeholderTextColor={
            COLORS.textLight
          }
          style={
            styles.input
          }
        />


        <View
          style={
            styles.fieldSpacer
          }
        />


        <FieldLabel
          label="Description"
          optional
          hint={`${description.length}/2000`}
        />


        <TextInput
          value={
            description
          }
          onChangeText={
            (
              value,
            ) => {
              if (
                value.length <=
                2000
              ) {
                onDescriptionChange(
                  value,
                );
              }
            }
          }
          editable={
            !disabled
          }
          multiline
          textAlignVertical="top"
          placeholder="Tell customers what is included in this service."
          placeholderTextColor={
            COLORS.textLight
          }
          style={
            styles.textArea
          }
        />
      </FormSection>


      {/* ================================================================
          PRICE + DURATION
          ================================================================ */}

      <FormSection
        icon="cash-outline"
        title="Price and duration"
        subtitle="Set the amount customers will see and how long the service takes."
      >
        <FieldLabel
          label="Price"
        />


        <View
          style={
            styles.priceInputShell
          }
        >
          <View
            style={
              styles.pricePrefix
            }
          >
            <Text
              style={
                styles.pricePrefixText
              }
            >
              ₱
            </Text>
          </View>


          <TextInput
            value={
              price
            }
            onChangeText={
              onPriceChange
            }
            editable={
              !disabled
            }
            keyboardType="decimal-pad"
            placeholder="250.00"
            placeholderTextColor={
              COLORS.textLight
            }
            style={
              styles.priceInput
            }
          />
        </View>


        <Text
          style={
            styles.fieldHelp
          }
        >
          Enter the regular price customers should expect to pay.
        </Text>


        <View
          style={
            styles.fieldSpacer
          }
        />


        <FieldLabel
          label="Duration"
        />


        <View
          style={
            styles.durationInputShell
          }
        >
          <Ionicons
            name="time-outline"
            size={
              19
            }
            color={
              COLORS.textMuted
            }
          />


          <TextInput
            value={
              duration
            }
            onChangeText={
              onDurationChange
            }
            editable={
              !disabled
            }
            keyboardType="number-pad"
            placeholder="30"
            placeholderTextColor={
              COLORS.textLight
            }
            style={
              styles.durationInput
            }
          />


          <Text
            style={
              styles.durationSuffix
            }
          >
            minutes
          </Text>
        </View>


        {/* QUICK DURATION OPTIONS */}

        <View
          style={
            styles.durationPresets
          }
        >
          {DURATION_PRESETS.map(
            (
              minutes,
            ) => {
              const selected =
                duration.trim() ===
                String(
                  minutes,
                );


              return (
                <TouchableOpacity
                  key={
                    minutes
                  }
                  activeOpacity={
                    0.78
                  }
                  disabled={
                    disabled
                  }
                  accessibilityRole="button"
                  accessibilityState={{
                    selected,
                    disabled,
                  }}
                  onPress={
                    () =>
                      onDurationChange(
                        String(
                          minutes,
                        ),
                      )
                  }
                  style={[
                    styles.durationChip,

                    selected
                    &&
                      styles.durationChipSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.durationChipText,

                      selected
                      &&
                        styles.durationChipTextSelected,
                    ]}
                  >
                    {minutes}m
                  </Text>
                </TouchableOpacity>
              );
            },
          )}
        </View>
      </FormSection>


      {/* ================================================================
          CUSTOMER VISIBILITY
          ================================================================ */}

      <FormSection
        icon="eye-outline"
        title="Customer visibility"
        subtitle="Control whether customers can discover and book this service."
      >
        <View
          style={
            styles.visibilityRow
          }
        >
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
              size={
                21
              }
              color={
                isActive
                  ? COLORS.green
                  : COLORS.textMuted
              }
            />
          </View>


          <View
            style={
              styles.visibilityTextBlock
            }
          >
            <Text
              style={
                styles.visibilityTitle
              }
            >
              {isActive
                ? 'Active and bookable'
                : 'Inactive and hidden'}
            </Text>


            <Text
              style={
                styles.visibilityText
              }
            >
              {isActive
                ? 'Customers can see this service and select it when booking.'
                : 'Customers cannot select this service for a new booking.'}
            </Text>
          </View>


          <Switch
            value={
              isActive
            }
            disabled={
              disabled
            }
            onValueChange={
              onActiveChange
            }
            trackColor={{
              false:
                COLORS.border,

              true:
                COLORS.green,
            }}
            thumbColor={
              COLORS.white
            }
            ios_backgroundColor={
              COLORS.border
            }
          />
        </View>
      </FormSection>
    </>
  );
}


/* ==========================================================================
   FORM SECTION
   ========================================================================== */

function FormSection({
  icon,
  title,
  subtitle,
  children,
}: {
  icon:
    IoniconName;

  title:
    string;

  subtitle:
    string;

  children:
    React.ReactNode;
}) {
  return (
    <View
      style={
        styles.sectionCard
      }
    >
      <View
        style={
          styles.sectionHeader
        }
      >
        <View
          style={
            styles.sectionIcon
          }
        >
          <Ionicons
            name={
              icon
            }
            size={
              20
            }
            color={
              COLORS.navy
            }
          />
        </View>


        <View
          style={
            styles.sectionHeading
          }
        >
          <Text
            style={
              styles.sectionTitle
            }
          >
            {title}
          </Text>

          <Text
            style={
              styles.sectionSubtitle
            }
          >
            {subtitle}
          </Text>
        </View>
      </View>


      <View
        style={
          styles.sectionBody
        }
      >
        {children}
      </View>
    </View>
  );
}


/* ==========================================================================
   FIELD LABEL
   ========================================================================== */

function FieldLabel({
  label,
  optional = false,
  hint,
}: {
  label:
    string;

  optional?:
    boolean;

  hint?:
    string;
}) {
  return (
    <View
      style={
        styles.labelRow
      }
    >
      <View
        style={
          styles.labelTitleRow
        }
      >
        <Text
          style={
            styles.label
          }
        >
          {label}
        </Text>


        {optional ? (
          <Text
            style={
              styles.optional
            }
          >
            Optional
          </Text>
        ) : null}
      </View>


      {hint ? (
        <Text
          style={
            styles.labelHint
          }
        >
          {hint}
        </Text>
      ) : null}
    </View>
  );
}


/* ==========================================================================
   STYLES
   ========================================================================== */

const styles =
  StyleSheet.create({
    previewCard: {
      padding:
        18,

      borderRadius:
        RADII.xl,

      backgroundColor:
        COLORS.primary,

      ...SHADOWS.card,
    },

    previewTopRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',
    },

    previewIcon: {
      width:
        44,

      height:
        44,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius:
        14,

      backgroundColor:
        COLORS.navyMuted,
    },

    previewStatus: {
      minHeight:
        29,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        6,

      paddingHorizontal:
        10,

      borderRadius:
        RADII.pill,
    },

    previewStatusActive: {
      backgroundColor:
        COLORS.greenSoft,
    },

    previewStatusInactive: {
      backgroundColor:
        COLORS.surfaceSoft,
    },

    previewStatusDot: {
      width:
        6,

      height:
        6,

      borderRadius:
        3,
    },

    previewStatusText: {
      fontSize:
        TYPOGRAPHY.micro,

      fontWeight:
        '800',
    },

    previewName: {
      marginTop:
        18,

      color:
        COLORS.white,

      fontSize:
        22,

      lineHeight:
        28,

      fontWeight:
        '800',

      letterSpacing:
        -0.5,
    },

    previewMetaRow: {
      marginTop:
        8,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        8,
    },

    previewPrice: {
      color:
        COLORS.white,

      fontSize:
        TYPOGRAPHY.body,

      fontWeight:
        '800',
    },

    previewDot: {
      width:
        4,

      height:
        4,

      borderRadius:
        2,

      backgroundColor:
        COLORS.textLight,
    },

    previewDuration: {
      color:
        '#D4DAE1',

      fontSize:
        TYPOGRAPHY.caption,

      fontWeight:
        '600',
    },

    previewHint: {
      marginTop:
        14,

      color:
        '#AEB8C5',

      fontSize:
        TYPOGRAPHY.micro,

      lineHeight:
        16,
    },

    sectionCard: {
      marginTop:
        14,

      padding:
        16,

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      borderRadius:
        RADII.xl,

      backgroundColor:
        COLORS.surface,

      ...SHADOWS.card,
    },

    sectionHeader: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',

      gap:
        11,
    },

    sectionIcon: {
      width:
        40,

      height:
        40,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius:
        13,

      backgroundColor:
        COLORS.accentSoft,
    },

    sectionHeading: {
      flex:
        1,
    },

    sectionTitle: {
      color:
        COLORS.text,

      fontSize:
        TYPOGRAPHY.cardTitle,

      fontWeight:
        '800',
    },

    sectionSubtitle: {
      marginTop:
        3,

      color:
        COLORS.textMuted,

      fontSize:
        TYPOGRAPHY.caption,

      lineHeight:
        17,
    },

    sectionBody: {
      marginTop:
        18,
    },

    labelRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      gap:
        10,

      marginBottom:
        8,
    },

    labelTitleRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        7,
    },

    label: {
      color:
        COLORS.text,

      fontSize:
        TYPOGRAPHY.secondary,

      fontWeight:
        '800',
    },

    optional: {
      color:
        COLORS.textLight,

      fontSize:
        TYPOGRAPHY.micro,

      fontWeight:
        '600',
    },

    labelHint: {
      color:
        COLORS.textLight,

      fontSize:
        TYPOGRAPHY.micro,

      fontWeight:
        '600',
    },

    input: {
      minHeight:
        50,

      paddingHorizontal:
        14,

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      borderRadius:
        RADII.md,

      color:
        COLORS.text,

      backgroundColor:
        COLORS.surfaceSoft,

      fontSize:
        TYPOGRAPHY.body,
    },

    textArea: {
      minHeight:
        118,

      paddingHorizontal:
        14,

      paddingVertical:
        13,

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      borderRadius:
        RADII.md,

      color:
        COLORS.text,

      backgroundColor:
        COLORS.surfaceSoft,

      fontSize:
        TYPOGRAPHY.body,

      lineHeight:
        20,
    },

    fieldSpacer: {
      height:
        18,
    },

    priceInputShell: {
      minHeight:
        52,

      flexDirection:
        'row',

      alignItems:
        'center',

      overflow:
        'hidden',

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      borderRadius:
        RADII.md,

      backgroundColor:
        COLORS.surfaceSoft,
    },

    pricePrefix: {
      alignSelf:
        'stretch',

      justifyContent:
        'center',

      paddingHorizontal:
        15,

      borderRightWidth:
        1,

      borderRightColor:
        COLORS.border,

      backgroundColor:
        COLORS.accentSoft,
    },

    pricePrefixText: {
      color:
        COLORS.navy,

      fontSize:
        TYPOGRAPHY.cardTitle,

      fontWeight:
        '800',
    },

    priceInput: {
      flex:
        1,

      minHeight:
        50,

      paddingHorizontal:
        13,

      color:
        COLORS.text,

      fontSize:
        TYPOGRAPHY.body,

      fontWeight:
        '700',
    },

    fieldHelp: {
      marginTop:
        7,

      color:
        COLORS.textLight,

      fontSize:
        TYPOGRAPHY.micro,

      lineHeight:
        16,
    },

    durationInputShell: {
      minHeight:
        52,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        9,

      paddingHorizontal:
        13,

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      borderRadius:
        RADII.md,

      backgroundColor:
        COLORS.surfaceSoft,
    },

    durationInput: {
      flex:
        1,

      minHeight:
        50,

      color:
        COLORS.text,

      fontSize:
        TYPOGRAPHY.body,

      fontWeight:
        '700',
    },

    durationSuffix: {
      color:
        COLORS.textMuted,

      fontSize:
        TYPOGRAPHY.caption,

      fontWeight:
        '600',
    },

    durationPresets: {
      marginTop:
        10,

      flexDirection:
        'row',

      flexWrap:
        'wrap',

      gap:
        8,
    },

    durationChip: {
      minWidth:
        50,

      minHeight:
        36,

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingHorizontal:
        10,

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      borderRadius:
        RADII.pill,

      backgroundColor:
        COLORS.surface,
    },

    durationChipSelected: {
      borderColor:
        COLORS.primary,

      backgroundColor:
        COLORS.primary,
    },

    durationChipText: {
      color:
        COLORS.textMuted,

      fontSize:
        TYPOGRAPHY.micro,

      fontWeight:
        '800',
    },

    durationChipTextSelected: {
      color:
        COLORS.white,
    },

    visibilityRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        11,
    },

    visibilityIcon: {
      width:
        42,

      height:
        42,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius:
        14,
    },

    visibilityTextBlock: {
      flex:
        1,
    },

    visibilityTitle: {
      color:
        COLORS.text,

      fontSize:
        TYPOGRAPHY.secondary,

      fontWeight:
        '800',
    },

    visibilityText: {
      marginTop:
        3,

      color:
        COLORS.textMuted,

      fontSize:
        TYPOGRAPHY.micro,

      lineHeight:
        16,
    },
  });