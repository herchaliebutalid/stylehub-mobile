import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    Image,
    StyleSheet,
    View,
    type ImageStyle,
    type StyleProp,
    type ViewStyle,
} from 'react-native';

import { API_BASE_URL } from '@/src/config/api';
import { COLORS } from '@/src/constants/colors';

type AnyRecord = Record<string, any>;

interface ShopOwnerAvatarProps {
  shop: unknown;
  size?: number;
  iconSize?: number;
  fallbackIcon?: React.ComponentProps<typeof Ionicons>['name'];
  containerStyle?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
}

function toAbsolutePhotoUrl(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();

  if (trimmed === '') {
    return null;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  const apiOrigin = API_BASE_URL.replace(/\/api\/v1\/?$/i, '');

  if (trimmed.startsWith('/storage/')) {
    return `${apiOrigin}${trimmed}`;
  }

  if (trimmed.startsWith('storage/')) {
    return `${apiOrigin}/${trimmed}`;
  }

  return `${apiOrigin}/storage/${trimmed}`;
}

export function getShopOwnerProfilePhotoUrl(shop: unknown): string | null {
  const item = (shop ?? {}) as AnyRecord;

  const candidates: unknown[] = [
    item?.owner?.profile_photo_url,
    item?.owner?.profile_photo_path,

    item?.shop_owner?.profile_photo_url,
    item?.shop_owner?.profile_photo_path,

    item?.user?.profile_photo_url,
    item?.user?.profile_photo_path,

    item?.owner_profile_photo_url,
    item?.owner_profile_photo_path,

    item?.profile_photo_url,
    item?.profile_photo_path,
  ];

  for (const candidate of candidates) {
    const resolved = toAbsolutePhotoUrl(candidate);

    if (resolved) {
      return resolved;
    }
  }

  return null;
}

export default function ShopOwnerAvatar({
  shop,
  size = 44,
  iconSize = 18,
  fallbackIcon = 'person-outline',
  containerStyle,
  imageStyle,
}: ShopOwnerAvatarProps) {
  const photoUrl = getShopOwnerProfilePhotoUrl(shop);

  const borderRadius = Math.round(size / 3.25);

  return (
    <View
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius,
        },
        containerStyle,
      ]}
    >
      {photoUrl ? (
        <Image
          source={{ uri: photoUrl }}
          resizeMode="cover"
          style={[
            styles.image,
            {
              borderRadius,
            },
            imageStyle,
          ]}
        />
      ) : (
        <Ionicons
          name={fallbackIcon}
          size={iconSize}
          color={COLORS.navy}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: COLORS.surfaceSoft,
  },

  image: {
    width: '100%',
    height: '100%',
  },
});