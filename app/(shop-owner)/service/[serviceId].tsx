import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';

import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  Image,
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

import ShopOwnerServiceForm from '@/src/components/ShopOwnerServiceForm';

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
  deleteShopOwnerService,
  getShopOwnerService,
  updateShopOwnerService,
} from '@/src/services/shop-owner-api';

import {
  deleteShopOwnerServiceImage,
  uploadShopOwnerServiceImage,
} from '@/src/services/shop-owner-media-api';

import type {
  ShopMediaImageState,
  ShopOwnerServiceWithImage,
} from '@/src/types/shop-media';

import {
  resolveApiAssetUrl,
} from '@/src/utils/api-asset-url';


/* ==========================================================================
   IMAGE RULES
   ========================================================================== */

const MAX_UPLOAD_BYTES =
  5 * 1024 * 1024;


const MAX_IMAGE_DIMENSION =
  4096;


const ALLOWED_MIME_TYPES =
  new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
  ]);


/* ==========================================================================
   HELPERS
   ========================================================================== */

function getRouteValue(
  value:
    | string
    | string[]
    | undefined,
): string | undefined {
  return Array.isArray(
    value,
  )
    ? value[0]
    : value;
}


function cleanPriceInput(
  value: string,
): string {
  const cleaned =
    value.replace(
      /[^0-9.]/g,
      '',
    );


  const decimalIndex =
    cleaned.indexOf('.');


  if (
    decimalIndex ===
    -1
  ) {
    return cleaned;
  }


  const beforeDecimal =
    cleaned.slice(
      0,
      decimalIndex,
    );


  const afterDecimal =
    cleaned
      .slice(
        decimalIndex + 1,
      )
      .replace(
        /\./g,
        '',
      )
      .slice(
        0,
        2,
      );


  return `${beforeDecimal}.${afterDecimal}`;
}


function validatePrice(
  value: string,
): string | null {
  const trimmed =
    value.trim();


  if (
    !trimmed
  ) {
    return 'Enter the service price.';
  }


  if (
    !/^\d+(\.\d{1,2})?$/.test(
      trimmed,
    )
  ) {
    return 'Price must be a valid number with at most 2 decimal places.';
  }


  const numeric =
    Number(
      trimmed,
    );


  if (
    !Number.isFinite(
      numeric,
    )
    ||
    numeric <=
      0
  ) {
    return 'The service price must be greater than zero.';
  }


  if (
    numeric >
    99999999.99
  ) {
    return 'The service price is too large.';
  }


  return null;
}


function imageMimeType(
  asset:
    ImagePicker.ImagePickerAsset,
): string {
  const supplied =
    asset
      .mimeType
      ?.trim()
      .toLowerCase();


  if (
    supplied
  ) {
    return supplied;
  }


  const fileName =
    asset
      .fileName
      ?.toLowerCase()
    ??
    '';


  if (
    fileName.endsWith(
      '.png',
    )
  ) {
    return 'image/png';
  }


  if (
    fileName.endsWith(
      '.webp',
    )
  ) {
    return 'image/webp';
  }


  return 'image/jpeg';
}


function buildServiceImageFormData(
  asset:
    ImagePicker.ImagePickerAsset,
): FormData {
  const formData =
    new FormData();


  const mimeType =
    imageMimeType(
      asset,
    );


  const extension =
    mimeType ===
    'image/png'
      ? 'png'
      : mimeType ===
        'image/webp'
        ? 'webp'
        : 'jpg';


  const fileName =
    asset
      .fileName
      ?.trim()
    ||
    `stylehub-service-${Date.now()}.${extension}`;


  const webAsset =
    asset as
      ImagePicker.ImagePickerAsset
      & {
        file?:
          Blob
          | null;
      };


  if (
    Platform.OS ===
      'web'
    &&
    webAsset.file
  ) {
    formData.append(
      'image',
      webAsset.file,
      fileName,
    );


    return formData;
  }


  const nativeFile = {
    uri:
      asset.uri,

    name:
      fileName,

    type:
      mimeType,
  } as unknown as Blob;


  formData.append(
    'image',
    nativeFile,
  );


  return formData;
}


/* ==========================================================================
   SCREEN
   ========================================================================== */

export default function ShopOwnerServiceDetailScreen() {
  const params =
    useLocalSearchParams<{
      serviceId?:
        | string
        | string[];

      created?:
        | string
        | string[];
    }>();


  const {
    token,
  } =
    useAuth();


  const serviceId =
    Number(
      getRouteValue(
        params.serviceId,
      ),
    );


  const createdNow =
    getRouteValue(
      params.created,
    ) ===
    '1';


  /* ==========================================================================
     SERVICE FORM
     ========================================================================== */

  const [
    name,
    setName,
  ] =
    useState('');


  const [
    description,
    setDescription,
  ] =
    useState('');


  const [
    price,
    setPrice,
  ] =
    useState('');


  const [
    duration,
    setDuration,
  ] =
    useState('');


  const [
    isActive,
    setIsActive,
  ] =
    useState(
      true,
    );


  /* ==========================================================================
     PHOTO
     ========================================================================== */

  const [
    serviceImage,
    setServiceImage,
  ] =
    useState<ShopMediaImageState>({
      has_image:
        false,

      image_url:
        null,
    });


  /* ==========================================================================
     SCREEN STATE
     ========================================================================== */

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(
      true,
    );


  const [
    isSubmitting,
    setIsSubmitting,
  ] =
    useState(
      false,
    );


  const [
    isDeleting,
    setIsDeleting,
  ] =
    useState(
      false,
    );


  const [
    isPhotoUploading,
    setIsPhotoUploading,
  ] =
    useState(
      false,
    );


  const [
    isPhotoDeleting,
    setIsPhotoDeleting,
  ] =
    useState(
      false,
    );


  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState('');


  const [
    successMessage,
    setSuccessMessage,
  ] =
    useState(
      createdNow
        ? 'Service created successfully. Add a photo or make any final adjustments below.'
        : '',
    );


  /* ==========================================================================
     LOAD SERVICE
     ========================================================================== */

  const loadService =
    useCallback(
      async () => {
        if (
          !token
          ||
          !Number.isInteger(
            serviceId,
          )
          ||
          serviceId <
            1
        ) {
          setIsLoading(
            false,
          );


          setErrorMessage(
            'The selected service is invalid.',
          );


          return;
        }


        setIsLoading(
          true,
        );


        setErrorMessage('');


        try {
          const response =
            await getShopOwnerService(
              token,
              serviceId,
            );


          const service =
            response
              .data
              .service;


          const serviceWithImage =
            service as
              ShopOwnerServiceWithImage;


          setName(
            service.name,
          );


          setDescription(
            service.description
            ??
            '',
          );


          setPrice(
            String(
              service.price,
            ),
          );


          setDuration(
            String(
              service.duration_minutes,
            ),
          );


          setIsActive(
            service.is_active,
          );


          setServiceImage(
            serviceWithImage.image
            ??
            {
              has_image:
                false,

              image_url:
                null,
            },
          );
        } catch (
          error
        ) {
          setErrorMessage(
            error instanceof
            ApiError
              ? error.message
              : 'Unable to load the service.',
          );
        } finally {
          setIsLoading(
            false,
          );
        }
      },
      [
        serviceId,
        token,
      ],
    );


  useEffect(
    () => {
      void loadService();
    },
    [
      loadService,
    ],
  );


  /* ==========================================================================
     INPUT HELPERS
     ========================================================================== */

  function handlePriceChange(
    value: string,
  ) {
    setPrice(
      cleanPriceInput(
        value,
      ),
    );
  }


  function handleDurationChange(
    value: string,
  ) {
    setDuration(
      value.replace(
        /[^0-9]/g,
        '',
      ),
    );
  }


  /* ==========================================================================
     CHOOSE PHOTO
     ========================================================================== */

  async function chooseServicePhoto(): Promise<void> {
    if (
      !token
      ||
      isPhotoUploading
      ||
      isPhotoDeleting
      ||
      isSubmitting
      ||
      isDeleting
    ) {
      return;
    }


    const permissionResult =
      await ImagePicker
        .requestMediaLibraryPermissionsAsync();


    if (
      !permissionResult.granted
    ) {
      Alert.alert(
        'Photo Permission Required',
        'StyleHub needs permission to access your photos so you can choose a service image.',
      );


      return;
    }


    const result =
      await ImagePicker
        .launchImageLibraryAsync({
          mediaTypes: [
            'images',
          ],

          allowsEditing:
            true,

          aspect: [
            4,
            3,
          ],

          quality:
            0.85,
        });


    if (
      result.canceled
      ||
      result.assets.length ===
        0
    ) {
      return;
    }


    const asset =
      result.assets[0];


    if (
      typeof asset.fileSize ===
        'number'
      &&
      asset.fileSize >
        MAX_UPLOAD_BYTES
    ) {
      Alert.alert(
        'Image Too Large',
        'Please choose an image no larger than 5 MB.',
      );


      return;
    }


    if (
      asset.width >
        MAX_IMAGE_DIMENSION
      ||
      asset.height >
        MAX_IMAGE_DIMENSION
    ) {
      Alert.alert(
        'Image Dimensions Too Large',
        'Please choose an image no larger than 4096 × 4096 pixels.',
      );


      return;
    }


    const mimeType =
      imageMimeType(
        asset,
      );


    if (
      !ALLOWED_MIME_TYPES.has(
        mimeType,
      )
    ) {
      Alert.alert(
        'Unsupported Image',
        'StyleHub accepts JPG, JPEG, PNG, and WebP images only.',
      );


      return;
    }


    setIsPhotoUploading(
      true,
    );


    setErrorMessage('');


    setSuccessMessage('');


    try {
      const response =
        await uploadShopOwnerServiceImage(
          token,
          serviceId,
          buildServiceImageFormData(
            asset,
          ),
        );


      setServiceImage(
        response
          .data
          .service
          .image,
      );


      setSuccessMessage(
        response.message
        ??
        'Service photo updated successfully.',
      );
    } catch (
      error
    ) {
      setErrorMessage(
        error instanceof
        ApiError
          ? error.message
          : 'Unable to upload the service photo.',
      );
    } finally {
      setIsPhotoUploading(
        false,
      );
    }
  }


  /* ==========================================================================
     REMOVE PHOTO
     ========================================================================== */

  async function removeServicePhoto(): Promise<void> {
    if (
      !token
      ||
      isPhotoUploading
      ||
      isPhotoDeleting
      ||
      isSubmitting
      ||
      isDeleting
    ) {
      return;
    }


    setIsPhotoDeleting(
      true,
    );


    setErrorMessage('');


    setSuccessMessage('');


    try {
      const response =
        await deleteShopOwnerServiceImage(
          token,
          serviceId,
        );


      setServiceImage(
        response
          .data
          .service
          .image,
      );


      setSuccessMessage(
        response.message
        ??
        'Service photo removed successfully.',
      );
    } catch (
      error
    ) {
      setErrorMessage(
        error instanceof
        ApiError
          ? error.message
          : 'Unable to remove the service photo.',
      );
    } finally {
      setIsPhotoDeleting(
        false,
      );
    }
  }


  function confirmRemoveServicePhoto() {
    Alert.alert(
      'Remove Service Photo?',
      'Customers will no longer see this image for the service.',
      [
        {
          text:
            'Keep Photo',

          style:
            'cancel',
        },

        {
          text:
            'Remove',

          style:
            'destructive',

          onPress:
            () => {
              void removeServicePhoto();
            },
        },
      ],
    );
  }


  /* ==========================================================================
     SAVE SERVICE
     ========================================================================== */

  async function handleSave(): Promise<void> {
    if (
      !token
      ||
      isSubmitting
    ) {
      return;
    }


    setErrorMessage('');


    setSuccessMessage('');


    const cleanName =
      name.trim();


    const cleanDescription =
      description.trim();


    if (
      cleanName.length <
        2
      ||
      cleanName.length >
        120
    ) {
      setErrorMessage(
        'Service name must contain between 2 and 120 characters.',
      );


      return;
    }


    if (
      cleanDescription.length >
      2000
    ) {
      setErrorMessage(
        'Description may not exceed 2000 characters.',
      );


      return;
    }


    const priceError =
      validatePrice(
        price,
      );


    if (
      priceError
    ) {
      setErrorMessage(
        priceError,
      );


      return;
    }


    const durationMinutes =
      Number(
        duration.trim(),
      );


    if (
      !Number.isInteger(
        durationMinutes,
      )
      ||
      durationMinutes <
        5
      ||
      durationMinutes >
        1440
    ) {
      setErrorMessage(
        'Duration must be a whole number between 5 and 1440 minutes.',
      );


      return;
    }


    setIsSubmitting(
      true,
    );


    try {
      const response =
        await updateShopOwnerService(
          token,
          serviceId,
          {
            name:
              cleanName,

            description:
              cleanDescription,

            price:
              Number(
                price,
              ).toFixed(
                2,
              ),

            durationMinutes,

            isActive,
          },
        );


      const updated =
        response
          .data
          .service;


      const updatedWithImage =
        updated as
          ShopOwnerServiceWithImage;


      setName(
        updated.name,
      );


      setDescription(
        updated.description
        ??
        '',
      );


      setPrice(
        String(
          updated.price,
        ),
      );


      setDuration(
        String(
          updated.duration_minutes,
        ),
      );


      setIsActive(
        updated.is_active,
      );


      if (
        updatedWithImage.image
      ) {
        setServiceImage(
          updatedWithImage.image,
        );
      }


      setSuccessMessage(
        response.message
        ??
        'Service changes saved successfully.',
      );
    } catch (
      error
    ) {
      setErrorMessage(
        error instanceof
        ApiError
          ? error.message
          : 'Unable to update the service.',
      );
    } finally {
      setIsSubmitting(
        false,
      );
    }
  }


  /* ==========================================================================
     DELETE SERVICE
     ========================================================================== */

  async function performDelete(): Promise<void> {
    if (
      !token
      ||
      isDeleting
    ) {
      return;
    }


    setIsDeleting(
      true,
    );


    setErrorMessage('');


    setSuccessMessage('');


    try {
      await deleteShopOwnerService(
        token,
        serviceId,
      );


      router.replace(
        '/(shop-owner)/shop-owner/services',
      );
    } catch (
      error
    ) {
      setErrorMessage(
        error instanceof
        ApiError
          ? error.message
          : 'Unable to delete the service.',
      );


      setIsDeleting(
        false,
      );
    }
  }


  function confirmDelete() {
    Alert.alert(
      'Delete Service?',
      'This removes the service from your shop management. This action cannot be undone.',
      [
        {
          text:
            'Keep Service',

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


  /* ==========================================================================
     LOADING
     ========================================================================== */

  if (
    isLoading
  ) {
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


        <View
          style={
            styles.loadingContainer
          }
        >
          <View
            style={
              styles.loadingIcon
            }
          >
            <ActivityIndicator
              size="small"
              color={
                COLORS.navy
              }
            />
          </View>


          <Text
            style={
              styles.loadingTitle
            }
          >
            Loading service
          </Text>


          <Text
            style={
              styles.loadingText
            }
          >
            Getting the latest service details and photo.
          </Text>
        </View>
      </SafeAreaView>
    );
  }


  /* ==========================================================================
     FAILED LOAD
     ========================================================================== */

  if (
    !name
    &&
    errorMessage
  ) {
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


        <View
          style={
            styles.unavailableContainer
          }
        >
          <TouchableOpacity
            activeOpacity={
              0.7
            }
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
              size={
                22
              }
              color={
                COLORS.navy
              }
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
                name="cut-outline"
                size={
                  30
                }
                color={
                  COLORS.navy
                }
              />
            </View>


            <Text
              style={
                styles.unavailableTitle
              }
            >
              Service unavailable
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


  const servicePhotoUrl =
    resolveApiAssetUrl(
      serviceImage.image_url,
    );


  const isMediaBusy =
    isPhotoUploading
    ||
    isPhotoDeleting;


  const isPageBusy =
    isSubmitting
    ||
    isDeleting
    ||
    isMediaBusy;


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


      <KeyboardAvoidingView
        style={
          styles.flex
        }
        behavior={
          Platform.OS ===
          'ios'
            ? 'padding'
            : undefined
        }
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={
            false
          }
          contentContainerStyle={
            styles.container
          }
        >

          {/* ==============================================================
              TOP BAR
              ============================================================== */}

          <View
            style={
              styles.topBar
            }
          >
            <TouchableOpacity
              activeOpacity={
                0.7
              }
              accessibilityRole="button"
              accessibilityLabel="Back to services"
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
                size={
                  22
                }
                color={
                  COLORS.navy
                }
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
                Service details
              </Text>

              <Text
                style={
                  styles.topBarCaption
                }
              >
                Edit customer-facing information
              </Text>
            </View>


            <View
              style={
                styles.topBarSpacer
              }
            />
          </View>


          {/* ==============================================================
              HEADER
              ============================================================== */}

          <View
            style={
              styles.header
            }
          >
            <Text
              style={
                styles.eyebrow
              }
            >
              SERVICE MANAGEMENT
            </Text>


            <Text
              style={
                styles.title
              }
            >
              Make this service easy to choose
            </Text>


            <Text
              style={
                styles.subtitle
              }
            >
              Keep the photo, description, price, duration, and booking availability accurate for your customers.
            </Text>
          </View>


          {/* ==============================================================
              SUCCESS
              ============================================================== */}

          {successMessage ? (
            <View
              style={
                styles.successBox
              }
            >
              <View
                style={
                  styles.successIcon
                }
              >
                <Ionicons
                  name="checkmark-circle-outline"
                  size={
                    20
                  }
                  color={
                    COLORS.success
                  }
                />
              </View>


              <View
                style={
                  styles.messageContent
                }
              >
                <Text
                  style={
                    styles.successTitle
                  }
                >
                  Updated successfully
                </Text>

                <Text
                  style={
                    styles.messageText
                  }
                >
                  {successMessage}
                </Text>
              </View>
            </View>
          ) : null}


          {/* ==============================================================
              ERROR
              ============================================================== */}

          {errorMessage ? (
            <View
              style={
                styles.errorBox
              }
            >
              <View
                style={
                  styles.errorIcon
                }
              >
                <Ionicons
                  name="alert-circle-outline"
                  size={
                    20
                  }
                  color={
                    COLORS.danger
                  }
                />
              </View>


              <View
                style={
                  styles.messageContent
                }
              >
                <Text
                  style={
                    styles.errorTitle
                  }
                >
                  Action needs attention
                </Text>

                <Text
                  style={
                    styles.messageText
                  }
                >
                  {errorMessage}
                </Text>
              </View>
            </View>
          ) : null}


          {/* ==============================================================
              PHOTO
              ============================================================== */}

          <View
            style={
              styles.photoCard
            }
          >
            <View
              style={
                styles.photoHeader
              }
            >
              <View>
                <Text
                  style={
                    styles.photoTitle
                  }
                >
                  Service photo
                </Text>

                <Text
                  style={
                    styles.photoSubtitle
                  }
                >
                  Use one clear image that represents the service.
                </Text>
              </View>


              <View
                style={[
                  styles.photoBadge,

                  serviceImage.has_image
                    ? styles.photoBadgeSet
                    : styles.photoBadgeEmpty,
                ]}
              >
                <Text
                  style={[
                    styles.photoBadgeText,

                    serviceImage.has_image
                      ? styles.photoBadgeTextSet
                      : styles.photoBadgeTextEmpty,
                  ]}
                >
                  {serviceImage.has_image
                    ? 'Photo set'
                    : 'No photo'}
                </Text>
              </View>
            </View>


            {servicePhotoUrl ? (
              <View
                style={
                  styles.photoFrame
                }
              >
                <Image
                  source={{
                    uri:
                      servicePhotoUrl,
                  }}
                  resizeMode="cover"
                  style={
                    styles.servicePhoto
                  }
                />


                <View
                  style={
                    styles.photoOverlayBadge
                  }
                >
                  <Ionicons
                    name="image-outline"
                    size={
                      14
                    }
                    color={
                      COLORS.white
                    }
                  />

                  <Text
                    style={
                      styles.photoOverlayText
                    }
                  >
                    Customer preview
                  </Text>
                </View>
              </View>
            ) : (
              <View
                style={
                  styles.photoPlaceholder
                }
              >
                <View
                  style={
                    styles.placeholderIcon
                  }
                >
                  <Ionicons
                    name="image-outline"
                    size={
                      30
                    }
                    color={
                      COLORS.navy
                    }
                  />
                </View>


                <Text
                  style={
                    styles.placeholderTitle
                  }
                >
                  Add a service photo
                </Text>


                <Text
                  style={
                    styles.placeholderText
                  }
                >
                  JPG, PNG, or WebP · up to 5 MB · maximum 4096 × 4096 pixels.
                </Text>
              </View>
            )}


            <View
              style={
                styles.photoActions
              }
            >
              <TouchableOpacity
                activeOpacity={
                  0.82
                }
                disabled={
                  isPageBusy
                }
                accessibilityRole="button"
                accessibilityLabel={
                  serviceImage.has_image
                    ? 'Replace service photo'
                    : 'Add service photo'
                }
                onPress={
                  () =>
                    void chooseServicePhoto()
                }
                style={[
                  styles.photoPrimaryButton,

                  isPageBusy
                  &&
                    styles.disabledButton,
                ]}
              >
                {isPhotoUploading ? (
                  <ActivityIndicator
                    size="small"
                    color={
                      COLORS.white
                    }
                  />
                ) : (
                  <Ionicons
                    name={
                      serviceImage.has_image
                        ? 'refresh-outline'
                        : 'add-outline'
                    }
                    size={
                      18
                    }
                    color={
                      COLORS.white
                    }
                  />
                )}


                <Text
                  style={
                    styles.photoPrimaryText
                  }
                >
                  {isPhotoUploading
                    ? 'Uploading...'
                    : serviceImage.has_image
                      ? 'Replace photo'
                      : 'Add photo'}
                </Text>
              </TouchableOpacity>


              {serviceImage.has_image ? (
                <TouchableOpacity
                  activeOpacity={
                    0.8
                  }
                  disabled={
                    isPageBusy
                  }
                  accessibilityRole="button"
                  accessibilityLabel="Remove service photo"
                  onPress={
                    confirmRemoveServicePhoto
                  }
                  style={[
                    styles.photoSecondaryButton,

                    isPageBusy
                    &&
                      styles.disabledButton,
                  ]}
                >
                  {isPhotoDeleting ? (
                    <ActivityIndicator
                      size="small"
                      color={
                        COLORS.danger
                      }
                    />
                  ) : (
                    <Ionicons
                      name="trash-outline"
                      size={
                        18
                      }
                      color={
                        COLORS.danger
                      }
                    />
                  )}


                  <Text
                    style={
                      styles.photoSecondaryText
                    }
                  >
                    {isPhotoDeleting
                      ? 'Removing...'
                      : 'Remove'}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>


          {/* ==============================================================
              FORM
              ============================================================== */}

          <View
            style={
              styles.formWrap
            }
          >
            <ShopOwnerServiceForm
              name={
                name
              }
              description={
                description
              }
              price={
                price
              }
              duration={
                duration
              }
              isActive={
                isActive
              }
              disabled={
                isPageBusy
              }
              onNameChange={
                setName
              }
              onDescriptionChange={
                setDescription
              }
              onPriceChange={
                handlePriceChange
              }
              onDurationChange={
                handleDurationChange
              }
              onActiveChange={
                setIsActive
              }
            />
          </View>


          {/* ==============================================================
              SAVE
              ============================================================== */}

          <View
            style={
              styles.saveCard
            }
          >
            <View
              style={
                styles.saveHeader
              }
            >
              <View
                style={
                  styles.saveIcon
                }
              >
                <Ionicons
                  name="save-outline"
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
                  styles.saveCopy
                }
              >
                <Text
                  style={
                    styles.saveTitle
                  }
                >
                  Save your changes
                </Text>

                <Text
                  style={
                    styles.saveText
                  }
                >
                  Updated details will be used when customers browse and book this service.
                </Text>
              </View>
            </View>


            <TouchableOpacity
              activeOpacity={
                0.84
              }
              disabled={
                isPageBusy
              }
              accessibilityRole="button"
              accessibilityLabel="Save service changes"
              onPress={
                () =>
                  void handleSave()
              }
              style={[
                styles.primaryButton,

                isPageBusy
                &&
                  styles.disabledButton,
              ]}
            >
              {isSubmitting ? (
                <ActivityIndicator
                  size="small"
                  color={
                    COLORS.white
                  }
                />
              ) : (
                <Ionicons
                  name="checkmark-circle-outline"
                  size={
                    20
                  }
                  color={
                    COLORS.white
                  }
                />
              )}


              <Text
                style={
                  styles.primaryButtonText
                }
              >
                {isSubmitting
                  ? 'Saving changes...'
                  : 'Save changes'}
              </Text>
            </TouchableOpacity>
          </View>


          {/* ==============================================================
              DANGER ZONE
              ============================================================== */}

          <View
            style={
              styles.dangerCard
            }
          >
            <View
              style={
                styles.dangerHeader
              }
            >
              <View
                style={
                  styles.dangerIcon
                }
              >
                <Ionicons
                  name="trash-outline"
                  size={
                    20
                  }
                  color={
                    COLORS.danger
                  }
                />
              </View>


              <View
                style={
                  styles.dangerCopy
                }
              >
                <Text
                  style={
                    styles.dangerTitle
                  }
                >
                  Delete service
                </Text>

                <Text
                  style={
                    styles.dangerText
                  }
                >
                  Remove this service from shop management. Only use this when you no longer need the service.
                </Text>
              </View>
            </View>


            <TouchableOpacity
              activeOpacity={
                0.8
              }
              disabled={
                isPageBusy
              }
              accessibilityRole="button"
              accessibilityLabel="Delete service"
              onPress={
                confirmDelete
              }
              style={[
                styles.deleteButton,

                isPageBusy
                &&
                  styles.disabledButton,
              ]}
            >
              {isDeleting ? (
                <ActivityIndicator
                  size="small"
                  color={
                    COLORS.danger
                  }
                />
              ) : (
                <Ionicons
                  name="trash-outline"
                  size={
                    18
                  }
                  color={
                    COLORS.danger
                  }
                />
              )}


              <Text
                style={
                  styles.deleteButtonText
                }
              >
                {isDeleting
                  ? 'Deleting service...'
                  : 'Delete service'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}


/* ==========================================================================
   STYLES
   ========================================================================== */

const styles =
  StyleSheet.create({
    safeArea: {
      flex:
        1,

      backgroundColor:
        COLORS.background,
    },

    flex: {
      flex:
        1,
    },

    container: {
      width:
        '100%',

      maxWidth:
        LAYOUT.contentMaxWidth,

      alignSelf:
        'center',

      paddingHorizontal:
        LAYOUT.screenPadding,

      paddingTop:
        SPACING.sm,

      paddingBottom:
        48,
    },

    topBar: {
      minHeight:
        48,

      flexDirection:
        'row',

      alignItems:
        'center',
    },

    topIconButton: {
      width:
        LAYOUT.iconButtonSize,

      height:
        LAYOUT.iconButtonSize,

      alignItems:
        'center',

      justifyContent:
        'center',

      marginLeft:
        -10,

      borderRadius:
        RADII.pill,
    },

    topBarTitleBlock: {
      flex:
        1,

      marginLeft:
        4,
    },

    topBarTitle: {
      color:
        COLORS.text,

      fontSize:
        TYPOGRAPHY.cardTitle,

      fontWeight:
        '800',
    },

    topBarCaption: {
      marginTop:
        1,

      color:
        COLORS.textMuted,

      fontSize:
        TYPOGRAPHY.micro,
    },

    topBarSpacer: {
      width:
        LAYOUT.iconButtonSize,

      height:
        LAYOUT.iconButtonSize,
    },

    header: {
      marginTop:
        SPACING.lg,
    },

    eyebrow: {
      color:
        COLORS.accent,

      fontSize:
        TYPOGRAPHY.micro,

      fontWeight:
        '800',

      letterSpacing:
        1.2,
    },

    title: {
      maxWidth:
        520,

      marginTop:
        5,

      color:
        COLORS.text,

      fontSize:
        TYPOGRAPHY.title,

      lineHeight:
        30,

      fontWeight:
        '800',

      letterSpacing:
        -0.6,
    },

    subtitle: {
      maxWidth:
        570,

      marginTop:
        8,

      color:
        COLORS.textMuted,

      fontSize:
        TYPOGRAPHY.body,

      lineHeight:
        21,
    },

    successBox: {
      marginTop:
        SPACING.xl,

      flexDirection:
        'row',

      alignItems:
        'flex-start',

      gap:
        10,

      padding:
        14,

      borderRadius:
        RADII.md,

      backgroundColor:
        COLORS.successSoft,
    },

    successIcon: {
      width:
        31,

      height:
        31,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius:
        10,

      backgroundColor:
        COLORS.surface,
    },

    successTitle: {
      color:
        COLORS.success,

      fontSize:
        TYPOGRAPHY.secondary,

      fontWeight:
        '800',
    },

    errorBox: {
      marginTop:
        SPACING.xl,

      flexDirection:
        'row',

      alignItems:
        'flex-start',

      gap:
        10,

      padding:
        14,

      borderRadius:
        RADII.md,

      backgroundColor:
        COLORS.dangerSoft,
    },

    errorIcon: {
      width:
        31,

      height:
        31,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius:
        10,

      backgroundColor:
        COLORS.surface,
    },

    errorTitle: {
      color:
        COLORS.danger,

      fontSize:
        TYPOGRAPHY.secondary,

      fontWeight:
        '800',
    },

    messageContent: {
      flex:
        1,
    },

    messageText: {
      marginTop:
        3,

      color:
        COLORS.textMuted,

      fontSize:
        TYPOGRAPHY.caption,

      lineHeight:
        18,
    },

    photoCard: {
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

    photoHeader: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',

      justifyContent:
        'space-between',

      gap:
        10,
    },

    photoTitle: {
      color:
        COLORS.text,

      fontSize:
        TYPOGRAPHY.cardTitle,

      fontWeight:
        '800',
    },

    photoSubtitle: {
      maxWidth:
        410,

      marginTop:
        3,

      color:
        COLORS.textMuted,

      fontSize:
        TYPOGRAPHY.caption,

      lineHeight:
        17,
    },

    photoBadge: {
      minHeight:
        28,

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingHorizontal:
        9,

      borderRadius:
        RADII.pill,
    },

    photoBadgeSet: {
      backgroundColor:
        COLORS.greenSoft,
    },

    photoBadgeEmpty: {
      backgroundColor:
        COLORS.surfaceSoft,
    },

    photoBadgeText: {
      fontSize:
        TYPOGRAPHY.micro,

      fontWeight:
        '800',
    },

    photoBadgeTextSet: {
      color:
        COLORS.green,
    },

    photoBadgeTextEmpty: {
      color:
        COLORS.textMuted,
    },

    photoFrame: {
      position:
        'relative',

      overflow:
        'hidden',

      marginTop:
        16,

      borderRadius:
        RADII.lg,

      backgroundColor:
        COLORS.surfaceSoft,
    },

    servicePhoto: {
      width:
        '100%',

      aspectRatio:
        4 / 3,
    },

    photoOverlayBadge: {
      position:
        'absolute',

      left:
        12,

      bottom:
        12,

      minHeight:
        30,

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

      backgroundColor:
        'rgba(23, 33, 43, 0.84)',
    },

    photoOverlayText: {
      color:
        COLORS.white,

      fontSize:
        TYPOGRAPHY.micro,

      fontWeight:
        '700',
    },

    photoPlaceholder: {
      minHeight:
        220,

      marginTop:
        16,

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingHorizontal:
        24,

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      borderRadius:
        RADII.lg,

      backgroundColor:
        COLORS.surfaceSoft,
    },

    placeholderIcon: {
      width:
        58,

      height:
        58,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius:
        19,

      backgroundColor:
        COLORS.accentSoft,
    },

    placeholderTitle: {
      marginTop:
        13,

      color:
        COLORS.text,

      fontSize:
        TYPOGRAPHY.cardTitle,

      fontWeight:
        '800',
    },

    placeholderText: {
      maxWidth:
        330,

      marginTop:
        6,

      color:
        COLORS.textMuted,

      fontSize:
        TYPOGRAPHY.caption,

      lineHeight:
        18,

      textAlign:
        'center',
    },

    photoActions: {
      marginTop:
        12,

      flexDirection:
        'row',

      gap:
        10,
    },

    photoPrimaryButton: {
      flex:
        1,

      minHeight:
        LAYOUT.compactButtonHeight,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        7,

      paddingHorizontal:
        13,

      borderRadius:
        RADII.md,

      backgroundColor:
        COLORS.primary,
    },

    photoPrimaryText: {
      color:
        COLORS.white,

      fontSize:
        TYPOGRAPHY.secondary,

      fontWeight:
        '800',
    },

    photoSecondaryButton: {
      minHeight:
        LAYOUT.compactButtonHeight,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        7,

      paddingHorizontal:
        14,

      borderWidth:
        1,

      borderColor:
        COLORS.danger,

      borderRadius:
        RADII.md,

      backgroundColor:
        COLORS.dangerSoft,
    },

    photoSecondaryText: {
      color:
        COLORS.danger,

      fontSize:
        TYPOGRAPHY.secondary,

      fontWeight:
        '800',
    },

    formWrap: {
      marginTop:
        0,
    },

    saveCard: {
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
    },

    saveHeader: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',

      gap:
        11,
    },

    saveIcon: {
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

    saveCopy: {
      flex:
        1,
    },

    saveTitle: {
      color:
        COLORS.text,

      fontSize:
        TYPOGRAPHY.cardTitle,

      fontWeight:
        '800',
    },

    saveText: {
      marginTop:
        3,

      color:
        COLORS.textMuted,

      fontSize:
        TYPOGRAPHY.caption,

      lineHeight:
        18,
    },

    primaryButton: {
      minHeight:
        LAYOUT.buttonHeight,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        8,

      marginTop:
        16,

      paddingHorizontal:
        16,

      borderRadius:
        RADII.md,

      backgroundColor:
        COLORS.primary,
    },

    primaryButtonText: {
      color:
        COLORS.white,

      fontSize:
        TYPOGRAPHY.body,

      fontWeight:
        '800',
    },

    dangerCard: {
      marginTop:
        SPACING.xxl,

      padding:
        16,

      borderWidth:
        1,

      borderColor:
        COLORS.danger,

      borderRadius:
        RADII.xl,

      backgroundColor:
        COLORS.dangerSoft,
    },

    dangerHeader: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',

      gap:
        11,
    },

    dangerIcon: {
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
        COLORS.surface,
    },

    dangerCopy: {
      flex:
        1,
    },

    dangerTitle: {
      color:
        COLORS.danger,

      fontSize:
        TYPOGRAPHY.cardTitle,

      fontWeight:
        '800',
    },

    dangerText: {
      marginTop:
        4,

      color:
        COLORS.textMuted,

      fontSize:
        TYPOGRAPHY.caption,

      lineHeight:
        18,
    },

    deleteButton: {
      minHeight:
        LAYOUT.compactButtonHeight,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        7,

      marginTop:
        14,

      paddingHorizontal:
        14,

      borderWidth:
        1,

      borderColor:
        COLORS.danger,

      borderRadius:
        RADII.md,

      backgroundColor:
        COLORS.surface,
    },

    deleteButtonText: {
      color:
        COLORS.danger,

      fontSize:
        TYPOGRAPHY.secondary,

      fontWeight:
        '800',
    },

    disabledButton: {
      opacity:
        0.52,
    },

    loadingContainer: {
      flex:
        1,

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingHorizontal:
        24,
    },

    loadingIcon: {
      width:
        56,

      height:
        56,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius:
        18,

      backgroundColor:
        COLORS.surface,
    },

    loadingTitle: {
      marginTop:
        14,

      color:
        COLORS.text,

      fontSize:
        TYPOGRAPHY.cardTitle,

      fontWeight:
        '800',
    },

    loadingText: {
      marginTop:
        5,

      color:
        COLORS.textMuted,

      fontSize:
        TYPOGRAPHY.caption,

      textAlign:
        'center',
    },

    unavailableContainer: {
      flex:
        1,

      paddingHorizontal:
        LAYOUT.screenPadding,

      paddingTop:
        SPACING.sm,
    },

    unavailableContent: {
      flex:
        1,

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingBottom:
        70,
    },

    unavailableIcon: {
      width:
        64,

      height:
        64,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius:
        20,

      backgroundColor:
        COLORS.accentSoft,
    },

    unavailableTitle: {
      marginTop:
        15,

      color:
        COLORS.text,

      fontSize:
        TYPOGRAPHY.section,

      fontWeight:
        '800',
    },

    unavailableText: {
      maxWidth:
        300,

      marginTop:
        6,

      color:
        COLORS.textMuted,

      fontSize:
        TYPOGRAPHY.body,

      lineHeight:
        20,

      textAlign:
        'center',
    },
  });