import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect } from 'expo-router';
import type { ComponentProps } from 'react';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

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
  deleteShopOwnerGalleryImage,
  getShopOwnerGallery,
  reorderShopOwnerGallery,
  uploadShopOwnerGalleryImage,
} from '@/src/services/shop-owner-media-api';
import type { ShopGalleryImage } from '@/src/types/shop-media';
import { resolveApiAssetUrl } from '@/src/utils/api-asset-url';

type IconName = ComponentProps<typeof Ionicons>['name'];

/* ==========================================================================
   CONFIGURATION
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

const GRID_GAP = 12;

/* ==========================================================================
   FORM DATA
   ========================================================================== */

function buildGalleryImageFormData(
  asset: ImagePicker.ImagePickerAsset,
): FormData {
  const formData =
    new FormData();

  const fileName =
    asset.fileName?.trim()
    ||
    `stylehub-gallery-${Date.now()}.jpg`;

  const mimeType =
    asset.mimeType?.trim()
    ||
    'image/jpeg';

  const webAsset =
    asset as ImagePicker.ImagePickerAsset & {
      file?: Blob | null;
    };

  if (
    Platform.OS === 'web'
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

  const nativeImage = {
    uri: asset.uri,
    name: fileName,
    type: mimeType,
  } as unknown as Blob;

  formData.append(
    'image',
    nativeImage,
  );

  return formData;
}

/* ==========================================================================
   DATE
   ========================================================================== */

function formatUploadedDate(
  value?: string | null,
): string | null {
  if (!value) {
    return null;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return null;
  }

  try {
    return new Intl.DateTimeFormat(
      'en-PH',
      {
        dateStyle: 'medium',
        timeZone: 'Asia/Manila',
      },
    ).format(date);
  } catch {
    return null;
  }
}

/* ==========================================================================
   SCREEN
   ========================================================================== */

export default function ShopOwnerGalleryScreen() {
  const {
    token,
  } = useAuth();

  const {
    width: windowWidth,
  } = useWindowDimensions();

  const [
    images,
    setImages,
  ] = useState<ShopGalleryImage[]>([]);

  const [
    maxImages,
    setMaxImages,
  ] = useState(10);

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    isRefreshing,
    setIsRefreshing,
  ] = useState(false);

  const [
    isUploading,
    setIsUploading,
  ] = useState(false);

  const [
    isReordering,
    setIsReordering,
  ] = useState(false);

  const [
    deletingImageId,
    setDeletingImageId,
  ] = useState<number | null>(null);

  const [
    previewImageId,
    setPreviewImageId,
  ] = useState<number | null>(null);

  const [
    failedImageIds,
    setFailedImageIds,
  ] = useState<Set<number>>(
    () => new Set(),
  );

  const [
    errorMessage,
    setErrorMessage,
  ] = useState('');

  const [
    successMessage,
    setSuccessMessage,
  ] = useState('');

  /* ========================================================================
     LAYOUT
     ======================================================================== */

  const contentWidth =
    Math.max(
      0,
      Math.min(
        windowWidth,
        LAYOUT.contentMaxWidth,
      )
      -
      LAYOUT.screenPadding * 2,
    );

  const columnCount =
    contentWidth >= 560
      ? 3
      : 2;

  const imageCardWidth =
    Math.max(
      138,
      (
        contentWidth
        -
        GRID_GAP * (columnCount - 1)
      )
      /
      columnCount,
    );

  const remainingSlots =
    Math.max(
      0,
      maxImages - images.length,
    );

  const galleryProgress =
    maxImages > 0
      ? Math.min(
          1,
          images.length / maxImages,
        )
      : 0;

  const previewImage =
    useMemo(
      () =>
        images.find(
          (image) =>
            image.id === previewImageId,
        )
        ?? null,
      [
        images,
        previewImageId,
      ],
    );

  const previewImageIndex =
    previewImage
      ? images.findIndex(
          (image) =>
            image.id === previewImage.id,
        )
      : -1;

  /* ========================================================================
     LOAD
     ======================================================================== */

  const loadGallery =
    useCallback(
      async (
        refreshing = false,
      ): Promise<void> => {
        if (!token) {
          setIsLoading(false);
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
            await getShopOwnerGallery(
              token,
            );

          setImages(
            response.data.images,
          );

          setMaxImages(
            response.data.max_images,
          );

          setFailedImageIds(
            new Set(),
          );
        } catch (error) {
          setErrorMessage(
            error instanceof ApiError
              ? error.message
              : 'Unable to load your shop gallery.',
          );
        } finally {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      },
      [token],
    );

  useFocusEffect(
    useCallback(
      () => {
        void loadGallery();
      },
      [loadGallery],
    ),
  );

  /* ========================================================================
     PICK + UPLOAD
     ======================================================================== */

  async function chooseGalleryImage(): Promise<void> {
    if (
      !token
      ||
      isUploading
      ||
      isReordering
      ||
      deletingImageId !== null
    ) {
      return;
    }

    if (
      images.length >= maxImages
    ) {
      Alert.alert(
        'Gallery Full',
        `Your shop gallery can contain up to ${maxImages} images. Remove an image before adding another.`,
      );
      return;
    }

    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (
      !permissionResult.granted
    ) {
      Alert.alert(
        'Photo Permission Required',
        'StyleHub needs permission to access your photos so you can add an image to your shop gallery.',
      );
      return;
    }

    const result =
      await ImagePicker.launchImageLibraryAsync({
        mediaTypes: [
          'images',
        ],
        allowsEditing: true,
        aspect: [
          4,
          3,
        ],
        quality: 0.85,
      });

    if (
      result.canceled
      ||
      result.assets.length === 0
    ) {
      return;
    }

    const asset =
      result.assets[0];

    if (
      typeof asset.fileSize === 'number'
      &&
      asset.fileSize > MAX_UPLOAD_BYTES
    ) {
      Alert.alert(
        'Image Too Large',
        'Please choose an image no larger than 5 MB.',
      );
      return;
    }

    if (
      asset.width > MAX_IMAGE_DIMENSION
      ||
      asset.height > MAX_IMAGE_DIMENSION
    ) {
      Alert.alert(
        'Image Dimensions Too Large',
        'Please choose an image no larger than 4096 × 4096 pixels.',
      );
      return;
    }

    const mimeType =
      asset.mimeType?.trim().toLowerCase();

    if (
      mimeType
      &&
      !ALLOWED_MIME_TYPES.has(
        mimeType,
      )
    ) {
      Alert.alert(
        'Unsupported Image',
        'StyleHub accepts JPG, JPEG, PNG, and WebP images. Try cropping the image in the picker or choose another image.',
      );
      return;
    }

    setIsUploading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response =
        await uploadShopOwnerGalleryImage(
          token,
          buildGalleryImageFormData(
            asset,
          ),
        );

      setSuccessMessage(
        response.message
        ??
        'Gallery image uploaded successfully.',
      );

      await loadGallery();
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : 'Unable to upload this gallery image.',
      );
    } finally {
      setIsUploading(false);
    }
  }

  /* ========================================================================
     REORDER
     ======================================================================== */

  async function moveImage(
    imageId: number,
    direction: 'up' | 'down',
  ): Promise<void> {
    if (
      !token
      ||
      isUploading
      ||
      isReordering
      ||
      deletingImageId !== null
    ) {
      return;
    }

    const currentIndex =
      images.findIndex(
        (image) => image.id === imageId,
      );

    if (
      currentIndex < 0
    ) {
      return;
    }

    const nextIndex =
      direction === 'up'
        ? currentIndex - 1
        : currentIndex + 1;

    if (
      nextIndex < 0
      ||
      nextIndex >= images.length
    ) {
      return;
    }

    const nextImages =
      [...images];

    [
      nextImages[currentIndex],
      nextImages[nextIndex],
    ] = [
      nextImages[nextIndex],
      nextImages[currentIndex],
    ];

    setIsReordering(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response =
        await reorderShopOwnerGallery(
          token,
          nextImages.map(
            (image) => image.id,
          ),
        );

      setImages(
        response.data.images,
      );

      setSuccessMessage(
        response.message
        ??
        'Gallery order updated successfully.',
      );
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : 'Unable to change the gallery order.',
      );
    } finally {
      setIsReordering(false);
    }
  }

  /* ========================================================================
     DELETE
     ======================================================================== */

  function confirmDelete(
    image: ShopGalleryImage,
  ): void {
    if (
      deletingImageId !== null
      ||
      isUploading
      ||
      isReordering
    ) {
      return;
    }

    const imageIndex =
      images.findIndex(
        (item) => item.id === image.id,
      );

    Alert.alert(
      'Remove Gallery Image?',
      imageIndex === 0
        ? 'This is the first photo customers see in your gallery. Removing it will move the next photo into the first position.'
        : 'This image will no longer appear to customers.',
      [
        {
          text: 'Keep Photo',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            void removeImage(
              image.id,
            );
          },
        },
      ],
    );
  }

  async function removeImage(
    imageId: number,
  ): Promise<void> {
    if (!token) {
      return;
    }

    setDeletingImageId(
      imageId,
    );
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response =
        await deleteShopOwnerGalleryImage(
          token,
          imageId,
        );

      if (
        previewImageId === imageId
      ) {
        setPreviewImageId(null);
      }

      setSuccessMessage(
        response.message
        ??
        'Gallery image removed successfully.',
      );

      await loadGallery();
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : 'Unable to remove this gallery image.',
      );
    } finally {
      setDeletingImageId(null);
    }
  }

  /* ========================================================================
     IMAGE FAILURE
     ======================================================================== */

  function markImageFailed(
    imageId: number,
  ): void {
    setFailedImageIds(
      (current) => {
        const next =
          new Set(current);

        next.add(
          imageId,
        );

        return next;
      },
    );
  }

  /* ========================================================================
     RENDER
     ======================================================================== */

  const isBusy =
    isUploading
    ||
    isReordering
    ||
    deletingImageId !== null;

  const galleryFull =
    images.length >= maxImages;

  return (
    <SafeAreaView
      style={styles.safeArea}
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor={COLORS.background}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void loadGallery(true)}
            tintColor={COLORS.navy}
            colors={[
              COLORS.navy,
            ]}
          />
        }
        contentContainerStyle={styles.container}
      >

        {/* ================================================================
            TOP BAR
            ================================================================ */}

        <View style={styles.topBar}>
          <TouchableOpacity
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Back to shop owner home"
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
              Shop gallery
            </Text>

            <Text style={styles.topBarCaption}>
              Customer-facing portfolio
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Add gallery photo"
            disabled={isBusy || galleryFull}
            onPress={() => void chooseGalleryImage()}
            style={[
              styles.topAddButton,
              (isBusy || galleryFull) && styles.disabledButton,
            ]}
          >
            {isUploading ? (
              <ActivityIndicator
                size="small"
                color={COLORS.white}
              />
            ) : (
              <Ionicons
                name="add"
                size={22}
                color={COLORS.white}
              />
            )}
          </TouchableOpacity>
        </View>

        {/* ================================================================
            HEADER
            ================================================================ */}

        <View style={styles.header}>
          <Text style={styles.eyebrow}>
            SHOP PORTFOLIO
          </Text>

          <Text style={styles.title}>
            Show customers what your shop feels like before they book
          </Text>

          <Text style={styles.subtitle}>
            Add clear photos of your work, interior, equipment, and atmosphere. The order below is the same order customers see.
          </Text>
        </View>

        {/* ================================================================
            OVERVIEW
            ================================================================ */}

        <View style={styles.overviewCard}>
          <View style={styles.overviewHeader}>
            <View>
              <Text style={styles.overviewLabel}>
                Gallery usage
              </Text>

              <Text style={styles.overviewValue}>
                {images.length} of {maxImages}
              </Text>
            </View>

            <View style={styles.overviewIcon}>
              <Ionicons
                name="images-outline"
                size={24}
                color={COLORS.white}
              />
            </View>
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${galleryProgress * 100}%`,
                },
              ]}
            />
          </View>

          <View style={styles.overviewStats}>
            <OverviewStat
              value={images.length}
              label="Photos"
            />

            <View style={styles.overviewDivider} />

            <OverviewStat
              value={remainingSlots}
              label="Slots left"
            />

            <View style={styles.overviewDivider} />

            <View style={styles.overviewStatus}>
              <Text style={styles.overviewStatusLabel}>
                Portfolio
              </Text>

              <View style={styles.overviewStatusRow}>
                <View
                  style={[
                    styles.overviewStatusDot,
                    {
                      backgroundColor:
                        images.length > 0
                          ? COLORS.green
                          : COLORS.warning,
                    },
                  ]}
                />

                <Text style={styles.overviewStatusText}>
                  {images.length > 0
                    ? 'Visible'
                    : 'Empty'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ================================================================
            ADD PHOTO
            ================================================================ */}

        <View style={styles.uploadCard}>
          <View style={styles.uploadHeader}>
            <View style={styles.uploadIcon}>
              <Ionicons
                name="cloud-upload-outline"
                size={21}
                color={COLORS.navy}
              />
            </View>

            <View style={styles.uploadCopy}>
              <Text style={styles.uploadTitle}>
                Add a portfolio photo
              </Text>

              <Text style={styles.uploadText}>
                JPG, PNG, or WebP · up to 5 MB · maximum 4096 × 4096 pixels.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.84}
            disabled={isBusy || galleryFull}
            accessibilityRole="button"
            accessibilityLabel="Choose and upload a gallery photo"
            onPress={() => void chooseGalleryImage()}
            style={[
              styles.uploadButton,
              (isBusy || galleryFull) && styles.disabledButton,
            ]}
          >
            {isUploading ? (
              <ActivityIndicator
                size="small"
                color={COLORS.white}
              />
            ) : (
              <Ionicons
                name={
                  galleryFull
                    ? 'checkmark-circle-outline'
                    : 'image-outline'
                }
                size={19}
                color={COLORS.white}
              />
            )}

            <Text style={styles.uploadButtonText}>
              {isUploading
                ? 'Uploading photo...'
                : galleryFull
                  ? 'Gallery is full'
                  : 'Choose photo'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ================================================================
            MESSAGES
            ================================================================ */}

        {errorMessage ? (
          <MessageBox
            type="error"
            title="Gallery needs attention"
            message={errorMessage}
          />
        ) : null}

        {successMessage ? (
          <MessageBox
            type="success"
            title="Gallery updated"
            message={successMessage}
          />
        ) : null}

        {/* ================================================================
            SECTION HEADING
            ================================================================ */}

        <View style={styles.sectionHeading}>
          <View style={styles.sectionHeadingCopy}>
            <Text style={styles.sectionTitle}>
              Customer display order
            </Text>

            <Text style={styles.sectionSubtitle}>
              Photo 1 appears first. Use Earlier and Later to control the portfolio sequence.
            </Text>
          </View>

          {isReordering ? (
            <View style={styles.reorderingBadge}>
              <ActivityIndicator
                size="small"
                color={COLORS.blue}
              />

              <Text style={styles.reorderingText}>
                Saving
              </Text>
            </View>
          ) : null}
        </View>

        {/* ================================================================
            LOADING
            ================================================================ */}

        {isLoading ? (
          <View style={styles.stateCard}>
            <View style={styles.stateIcon}>
              <ActivityIndicator
                size="small"
                color={COLORS.navy}
              />
            </View>

            <Text style={styles.stateTitle}>
              Loading shop gallery
            </Text>

            <Text style={styles.stateText}>
              Getting the photos customers can currently see.
            </Text>
          </View>
        ) : null}

        {/* ================================================================
            EMPTY
            ================================================================ */}

        {!isLoading && images.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="images-outline"
                size={29}
                color={COLORS.navy}
              />
            </View>

            <Text style={styles.emptyTitle}>
              Build your shop portfolio
            </Text>

            <Text style={styles.emptyText}>
              Start with a clean photo of your shop, then add examples of your work and facilities so customers know what to expect.
            </Text>

            <TouchableOpacity
              activeOpacity={0.82}
              disabled={isBusy}
              onPress={() => void chooseGalleryImage()}
              style={[
                styles.emptyButton,
                isBusy && styles.disabledButton,
              ]}
            >
              <Ionicons
                name="add"
                size={18}
                color={COLORS.white}
              />

              <Text style={styles.emptyButtonText}>
                Add first photo
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* ================================================================
            GALLERY GRID
            ================================================================ */}

        {!isLoading && images.length > 0 ? (
          <View style={styles.galleryGrid}>
            {images.map(
              (image, index) => {
                const imageUrl =
                  resolveApiAssetUrl(
                    image.image_url,
                  );

                const imageFailed =
                  failedImageIds.has(
                    image.id,
                  );

                const isDeleting =
                  deletingImageId === image.id;

                const uploadedDate =
                  formatUploadedDate(
                    image.created_at,
                  );

                return (
                  <View
                    key={image.id}
                    style={[
                      styles.imageCard,
                      {
                        width: imageCardWidth,
                      },
                    ]}
                  >
                    <TouchableOpacity
                      activeOpacity={0.88}
                      accessibilityRole="button"
                      accessibilityLabel={`Preview gallery photo ${index + 1}`}
                      disabled={!imageUrl || imageFailed}
                      onPress={
                        () =>
                          setPreviewImageId(
                            image.id,
                          )
                      }
                      style={styles.imagePreviewButton}
                    >
                      {imageUrl && !imageFailed ? (
                        <Image
                          source={{
                            uri: imageUrl,
                          }}
                          resizeMode="cover"
                          onError={
                            () =>
                              markImageFailed(
                                image.id,
                              )
                          }
                          style={styles.galleryImage}
                        />
                      ) : (
                        <View style={styles.imageFallback}>
                          <Ionicons
                            name="image-outline"
                            size={28}
                            color={COLORS.textLight}
                          />

                          <Text style={styles.imageFallbackText}>
                            Image unavailable
                          </Text>
                        </View>
                      )}

                      <View style={styles.positionBadge}>
                        <Text style={styles.positionBadgeText}>
                          {index + 1}
                        </Text>
                      </View>

                      {index === 0 ? (
                        <View style={styles.firstBadge}>
                          <Ionicons
                            name="star"
                            size={11}
                            color={COLORS.white}
                          />

                          <Text style={styles.firstBadgeText}>
                            First
                          </Text>
                        </View>
                      ) : null}

                      <View style={styles.previewBadge}>
                        <Ionicons
                          name="expand-outline"
                          size={14}
                          color={COLORS.white}
                        />
                      </View>
                    </TouchableOpacity>

                    <View style={styles.imageContent}>
                      <Text
                        style={styles.imageTitle}
                        numberOfLines={1}
                      >
                        Photo {index + 1}
                      </Text>

                      <Text
                        style={styles.imageMeta}
                        numberOfLines={1}
                      >
                        {uploadedDate
                          ? `Added ${uploadedDate}`
                          : `Display position ${index + 1}`}
                      </Text>

                      <View style={styles.imageActions}>
                        <IconActionButton
                          icon="arrow-up"
                          label="Earlier"
                          accessibilityLabel={`Move photo ${index + 1} earlier`}
                          disabled={isBusy || index === 0}
                          onPress={() => void moveImage(image.id, 'up')}
                        />

                        <IconActionButton
                          icon="arrow-down"
                          label="Later"
                          accessibilityLabel={`Move photo ${index + 1} later`}
                          disabled={isBusy || index === images.length - 1}
                          onPress={() => void moveImage(image.id, 'down')}
                        />

                        <TouchableOpacity
                          activeOpacity={0.76}
                          disabled={isBusy}
                          accessibilityRole="button"
                          accessibilityLabel={`Remove photo ${index + 1}`}
                          onPress={() => confirmDelete(image)}
                          style={[
                            styles.deleteButton,
                            isBusy && styles.disabledButton,
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
                              size={17}
                              color={COLORS.danger}
                            />
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              },
            )}
          </View>
        ) : null}

        {/* ================================================================
            PORTFOLIO TIP
            ================================================================ */}

        {!isLoading ? (
          <View style={styles.tipCard}>
            <View style={styles.tipIcon}>
              <Ionicons
                name="bulb-outline"
                size={20}
                color={COLORS.orange}
              />
            </View>

            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>
                Make the first photo count
              </Text>

              <Text style={styles.tipText}>
                Put your clearest and most representative shop photo first. Customers see this gallery while deciding whether to book.
              </Text>
            </View>
          </View>
        ) : null}
      </ScrollView>

      {/* ================================================================
          IMAGE PREVIEW MODAL
          ================================================================ */}

      <Modal
        visible={previewImage !== null}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={
          () =>
            setPreviewImageId(null)
        }
      >
        <View style={styles.previewOverlay}>
          <SafeAreaView style={styles.previewSafeArea}>
            <View style={styles.previewTopBar}>
              <View style={styles.previewHeading}>
                <Text style={styles.previewTitle}>
                  {previewImageIndex >= 0
                    ? `Photo ${previewImageIndex + 1}`
                    : 'Gallery photo'}
                </Text>

                <Text style={styles.previewCaption}>
                  Customer display preview
                </Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel="Close image preview"
                onPress={
                  () =>
                    setPreviewImageId(null)
                }
                style={styles.previewCloseButton}
              >
                <Ionicons
                  name="close"
                  size={24}
                  color={COLORS.white}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.previewImageStage}>
              {previewImage ? (
                <Image
                  source={{
                    uri:
                      resolveApiAssetUrl(
                        previewImage.image_url,
                      )
                      ?? '',
                  }}
                  resizeMode="contain"
                  style={styles.previewImage}
                />
              ) : null}
            </View>

            <View style={styles.previewFooter}>
              <Ionicons
                name="information-circle-outline"
                size={18}
                color="#D4DAE1"
              />

              <Text style={styles.previewFooterText}>
                Use the Earlier and Later controls on the gallery screen to change where this photo appears.
              </Text>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* ==========================================================================
   OVERVIEW STAT
   ========================================================================== */

function OverviewStat({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <View style={styles.overviewStat}>
      <Text style={styles.overviewStatValue}>
        {value}
      </Text>

      <Text style={styles.overviewStatLabel}>
        {label}
      </Text>
    </View>
  );
}

/* ==========================================================================
   ICON ACTION BUTTON
   ========================================================================== */

function IconActionButton({
  icon,
  label,
  accessibilityLabel,
  disabled,
  onPress,
}: {
  icon: IconName;
  label: string;
  accessibilityLabel: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.76}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={[
        styles.orderButton,
        disabled && styles.disabledButton,
      ]}
    >
      <Ionicons
        name={icon}
        size={16}
        color={COLORS.navy}
      />

      <Text style={styles.orderButtonText}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/* ==========================================================================
   MESSAGE
   ========================================================================== */

function MessageBox({
  type,
  title,
  message,
}: {
  type: 'success' | 'error';
  title: string;
  message: string;
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

/* ==========================================================================
   STYLES
   ========================================================================== */

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

  topAddButton: {
    width: LAYOUT.iconButtonSize,
    height: LAYOUT.iconButtonSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: COLORS.primary,
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
    maxWidth: 610,
    marginTop: 8,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.body,
    lineHeight: 21,
  },

  overviewCard: {
    marginTop: SPACING.xl,
    padding: 18,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.primary,
    ...SHADOWS.card,
  },

  overviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  overviewLabel: {
    color: '#D4DAE1',
    fontSize: TYPOGRAPHY.caption,
    fontWeight: '600',
  },

  overviewValue: {
    marginTop: 4,
    color: COLORS.white,
    fontSize: 27,
    lineHeight: 33,
    fontWeight: '800',
    letterSpacing: -0.5,
  },

  overviewIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: COLORS.navyMuted,
  },

  progressTrack: {
    height: 7,
    marginTop: 18,
    overflow: 'hidden',
    borderRadius: RADII.pill,
    backgroundColor: COLORS.navyMuted,
  },

  progressFill: {
    height: '100%',
    borderRadius: RADII.pill,
    backgroundColor: COLORS.white,
  },

  overviewStats: {
    marginTop: 16,
    paddingTop: 15,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.navyMuted,
  },

  overviewStat: {
    minWidth: 58,
  },

  overviewStatValue: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.cardTitle,
    fontWeight: '800',
  },

  overviewStatLabel: {
    marginTop: 3,
    color: '#D4DAE1',
    fontSize: TYPOGRAPHY.micro,
  },

  overviewDivider: {
    width: 1,
    height: 34,
    marginHorizontal: 14,
    backgroundColor: COLORS.navyMuted,
  },

  overviewStatus: {
    flex: 1,
    minWidth: 0,
  },

  overviewStatusLabel: {
    color: '#D4DAE1',
    fontSize: TYPOGRAPHY.micro,
  },

  overviewStatusRow: {
    marginTop: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  overviewStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },

  overviewStatusText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.caption,
    fontWeight: '800',
  },

  uploadCard: {
    marginTop: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.surface,
  },

  uploadHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
  },

  uploadIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: COLORS.accentSoft,
  },

  uploadCopy: {
    flex: 1,
  },

  uploadTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.cardTitle,
    fontWeight: '800',
  },

  uploadText: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
  },

  uploadButton: {
    minHeight: LAYOUT.buttonHeight,
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    borderRadius: RADII.md,
    backgroundColor: COLORS.primary,
  },

  uploadButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.body,
    fontWeight: '800',
  },

  messageBox: {
    marginTop: 12,
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

  sectionHeading: {
    marginTop: SPACING.xxl,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },

  sectionHeadingCopy: {
    flex: 1,
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

  reorderingBadge: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 9,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.blueSoft,
  },

  reorderingText: {
    color: COLORS.blue,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '800',
  },

  stateCard: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 34,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.surface,
  },

  stateIcon: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: COLORS.surfaceSoft,
  },

  stateTitle: {
    marginTop: 14,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.cardTitle,
    fontWeight: '800',
  },

  stateText: {
    maxWidth: 330,
    marginTop: 5,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
    textAlign: 'center',
  },

  emptyCard: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 34,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.surface,
  },

  emptyIcon: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: COLORS.accentSoft,
  },

  emptyTitle: {
    marginTop: 14,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.cardTitle,
    fontWeight: '800',
  },

  emptyText: {
    maxWidth: 360,
    marginTop: 6,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.body,
    lineHeight: 20,
    textAlign: 'center',
  },

  emptyButton: {
    minHeight: LAYOUT.compactButtonHeight,
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 17,
    borderRadius: RADII.md,
    backgroundColor: COLORS.primary,
  },

  emptyButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
    alignItems: 'flex-start',
  },

  imageCard: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.surface,
    ...SHADOWS.card,
  },

  imagePreviewButton: {
    position: 'relative',
    width: '100%',
    aspectRatio: 4 / 3,
    overflow: 'hidden',
    backgroundColor: COLORS.surfaceSoft,
  },

  galleryImage: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.surfaceSoft,
  },

  imageFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    backgroundColor: COLORS.surfaceSoft,
  },

  imageFallbackText: {
    marginTop: 6,
    color: COLORS.textLight,
    fontSize: TYPOGRAPHY.micro,
    textAlign: 'center',
  },

  positionBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    minWidth: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 7,
    borderRadius: RADII.pill,
    backgroundColor: 'rgba(23, 33, 43, 0.88)',
  },

  positionBadgeText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '800',
  },

  firstBadge: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    minHeight: 27,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    borderRadius: RADII.pill,
    backgroundColor: 'rgba(23, 33, 43, 0.88)',
  },

  firstBadgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '800',
  },

  previewBadge: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADII.pill,
    backgroundColor: 'rgba(23, 33, 43, 0.76)',
  },

  imageContent: {
    padding: 10,
  },

  imageTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  imageMeta: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
  },

  imageActions: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  orderButton: {
    flex: 1,
    minWidth: 0,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 11,
    backgroundColor: COLORS.surfaceSoft,
  },

  orderButtonText: {
    color: COLORS.navy,
    fontSize: 9,
    fontWeight: '800',
  },

  deleteButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.danger,
    borderRadius: 11,
    backgroundColor: COLORS.dangerSoft,
  },

  tipCard: {
    marginTop: SPACING.xxl,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
    padding: 15,
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
    backgroundColor: COLORS.orangeSoft,
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

  disabledButton: {
    opacity: 0.46,
  },

  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 18, 27, 0.96)',
  },

  previewSafeArea: {
    flex: 1,
  },

  previewTopBar: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 8,
  },

  previewHeading: {
    flex: 1,
  },

  previewTitle: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.cardTitle,
    fontWeight: '800',
  },

  previewCaption: {
    marginTop: 2,
    color: '#AEB8C5',
    fontSize: TYPOGRAPHY.micro,
  },

  previewCloseButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADII.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
  },

  previewImageStage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 18,
  },

  previewImage: {
    width: '100%',
    height: '100%',
  },

  previewFooter: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 22,
  },

  previewFooterText: {
    flex: 1,
    color: '#D4DAE1',
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
  },
});