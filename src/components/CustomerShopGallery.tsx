import { Ionicons } from '@expo/vector-icons';

import {
    Image,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import { COLORS } from '@/src/constants/colors';
import type { CustomerShopGalleryImage } from '@/src/types/customer';
import { resolveApiAssetUrl } from '@/src/utils/api-asset-url';

interface CustomerShopGalleryProps {
  images: CustomerShopGalleryImage[];
}

export default function CustomerShopGallery({
  images,
}: CustomerShopGalleryProps) {
  if (images.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <View style={styles.emptyIcon}>
          <Ionicons
            name="images-outline"
            size={26}
            color={COLORS.textLight}
          />
        </View>

        <Text style={styles.emptyTitle}>
          No gallery photos yet
        </Text>

        <Text style={styles.emptyDescription}>
          This shop has not added public gallery photos yet.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      nestedScrollEnabled
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.galleryContent}
    >
      {images.map((image, index) => {
        const imageUrl =
          resolveApiAssetUrl(
            image.image_url,
          );

        return (
          <View
            key={image.id}
            style={styles.imageCard}
          >
            {imageUrl ? (
              <Image
                source={{
                  uri: imageUrl,
                }}
                resizeMode="cover"
                style={styles.image}
              />
            ) : (
              <View style={styles.imageFallback}>
                <Ionicons
                  name="image-outline"
                  size={28}
                  color={COLORS.textLight}
                />
              </View>
            )}

            <View style={styles.imageFooter}>
              <Text style={styles.imageLabel}>
                Photo {index + 1}
              </Text>

              <Text style={styles.imageCount}>
                {index + 1} / {images.length}
              </Text>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles =
  StyleSheet.create({
    galleryContent: {
      gap: 11,

      paddingRight: 4,
    },

    imageCard: {
      width: 255,

      overflow: 'hidden',

      borderWidth: 1,

      borderColor:
        COLORS.border,

      borderRadius: 18,

      backgroundColor:
        COLORS.surface,
    },

    image: {
      width: '100%',

      aspectRatio: 4 / 3,

      backgroundColor:
        COLORS.surfaceSoft,
    },

    imageFallback: {
      width: '100%',

      aspectRatio: 4 / 3,

      alignItems: 'center',

      justifyContent: 'center',

      backgroundColor:
        COLORS.surfaceSoft,
    },

    imageFooter: {
      minHeight: 42,

      flexDirection: 'row',

      alignItems: 'center',

      justifyContent:
        'space-between',

      gap: 8,

      paddingHorizontal: 12,
    },

    imageLabel: {
      color:
        COLORS.navy,

      fontSize: 9,

      fontWeight: '700',
    },

    imageCount: {
      color:
        COLORS.textLight,

      fontSize: 8,

      fontWeight: '600',
    },

    emptyCard: {
      minHeight: 150,

      alignItems: 'center',

      justifyContent: 'center',

      paddingHorizontal: 24,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      borderRadius: 18,

      backgroundColor:
        COLORS.surface,
    },

    emptyIcon: {
      width: 48,

      height: 48,

      alignItems: 'center',

      justifyContent: 'center',

      borderRadius: 15,

      backgroundColor:
        COLORS.surfaceSoft,
    },

    emptyTitle: {
      marginTop: 10,

      color:
        COLORS.navy,

      fontSize: 11,

      fontWeight: '700',
    },

    emptyDescription: {
      marginTop: 5,

      color:
        COLORS.textMuted,

      fontSize: 8.5,

      lineHeight: 13,

      textAlign: 'center',
    },
  });