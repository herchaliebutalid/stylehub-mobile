import { Ionicons } from '@expo/vector-icons';
import {
  router,
  useFocusEffect,
} from 'expo-router';
import type { ComponentProps } from 'react';
import {
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import ShopOwnerAvatar from '@/src/components/ShopOwnerAvatar';
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
  getCustomerSavedShops,
  removeCustomerSavedShop,
} from '@/src/services/saved-shops-api';
import type { ShopType } from '@/src/types/auth';
import type {
  CustomerShop,
  ShopAvailabilityStatus,
} from '@/src/types/customer';

type IconName = ComponentProps<typeof Ionicons>['name'];
type ShopTypeFilter = 'all' | ShopType;

const TYPE_FILTERS: {
  value: ShopTypeFilter;
  label: string;
  icon: IconName;
}[] = [
  {
    value: 'all',
    label: 'All shops',
    icon: 'apps-outline',
  },
  {
    value: 'barber_shop',
    label: 'Barber Shops',
    icon: 'cut-outline',
  },
  {
    value: 'beauty_parlor',
    label: 'Beauty Parlors',
    icon: 'sparkles-outline',
  },
];

function availabilityPresentation(
  status: ShopAvailabilityStatus,
): {
  background: string;
  color: string;
  icon: IconName;
} {
  switch (status) {
    case 'open':
      return {
        background: COLORS.greenSoft,
        color: COLORS.green,
        icon: 'checkmark-circle-outline',
      };

    case 'accepting_walk_ins':
      return {
        background: COLORS.blueSoft,
        color: COLORS.blue,
        icon: 'walk-outline',
      };

    case 'fully_booked':
      return {
        background: COLORS.orangeSoft,
        color: COLORS.orange,
        icon: 'time-outline',
      };

    case 'closed':
    default:
      return {
        background: COLORS.surfaceSoft,
        color: COLORS.textMuted,
        icon: 'moon-outline',
      };
  }
}

export default function CustomerSavedShopsScreen() {
  const { token } = useAuth();

  const [
    shops,
    setShops,
  ] = useState<CustomerShop[]>([]);

  const [
    searchText,
    setSearchText,
  ] = useState('');

  const [
    typeFilter,
    setTypeFilter,
  ] = useState<ShopTypeFilter>('all');

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    isRefreshing,
    setIsRefreshing,
  ] = useState(false);

  const [
    removingShopId,
    setRemovingShopId,
  ] = useState<number | null>(null);

  const [
    removeTarget,
    setRemoveTarget,
  ] = useState<CustomerShop | null>(null);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState('');

  const [
    successMessage,
    setSuccessMessage,
  ] = useState('');

  const hasLoadedOnce = useRef(false);

  const loadSavedShops = useCallback(
    async (
      refreshing = false,
      silent = false,
    ): Promise<void> => {
      if (!token) {
        setShops([]);
        setIsLoading(false);
        setIsRefreshing(false);

        return;
      }

      if (refreshing) {
        setIsRefreshing(true);
      } else if (!silent) {
        setIsLoading(true);
      }

      setErrorMessage('');

      try {
        const response = await getCustomerSavedShops(
          token,
        );

        setShops(
          response.data.shops,
        );

        hasLoadedOnce.current = true;
      } catch (error) {
        setErrorMessage(
          error instanceof ApiError
            ? error.message
            : 'Unable to load your saved shops.',
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
      void loadSavedShops(
        false,
        hasLoadedOnce.current,
      );

      return undefined;
    }, [loadSavedShops]),
  );

  const savedSummary = useMemo(
    () => ({
      total: shops.length,

      bookable: shops.filter(
        (shop) =>
          shop.availability.accepts_appointments,
      ).length,

      reviewed: shops.filter(
        (shop) =>
          shop.rating.review_count > 0,
      ).length,
    }),
    [shops],
  );

  const filteredShops = useMemo(
    () => {
      const query = searchText
        .trim()
        .toLowerCase();

      return shops.filter(
        (shop) => {
          if (
            typeFilter !== 'all'
            && shop.type !== typeFilter
          ) {
            return false;
          }

          if (!query) {
            return true;
          }

          return [
            shop.name,
            shop.type_label,
            shop.address,
            shop.city,
            shop.province,
          ]
            .filter(Boolean)
            .some(
              (value) =>
                value
                  .toLowerCase()
                  .includes(query),
            );
        },
      );
    },
    [
      searchText,
      shops,
      typeFilter,
    ],
  );

  function openShop(
    shopId: number,
  ): void {
    router.push({
      pathname:
        '/(customer)/shop/[shopId]',

      params: {
        shopId:
          String(shopId),
      },
    });
  }

  function requestRemove(
    shop: CustomerShop,
  ): void {
    if (removingShopId !== null) {
      return;
    }

    setErrorMessage('');
    setSuccessMessage('');
    setRemoveTarget(shop);
  }

  function closeRemoveModal(): void {
    if (removingShopId !== null) {
      return;
    }

    setRemoveTarget(null);
  }

  async function confirmRemove(): Promise<void> {
    if (
      !token
      || !removeTarget
      || removingShopId !== null
    ) {
      return;
    }

    const shopToRemove =
      removeTarget;

    setRemovingShopId(
      shopToRemove.id,
    );

    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response =
        await removeCustomerSavedShop(
          token,
          shopToRemove.id,
        );

      setShops(
        (current) =>
          current.filter(
            (shop) =>
              shop.id
              !== shopToRemove.id,
          ),
      );

      setRemoveTarget(null);

      setSuccessMessage(
        response.message
        ?? `${shopToRemove.name} was removed from your saved shops.`,
      );
    } catch (error) {
      setRemoveTarget(null);

      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : 'Unable to remove the saved shop.',
      );
    } finally {
      setRemovingShopId(null);
    }
  }

  const hasActiveFilter =
    Boolean(
      searchText.trim()
      || typeFilter !== 'all',
    );

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

      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={
              isRefreshing
            }
            onRefresh={() =>
              void loadSavedShops(
                true,
              )
            }
            tintColor={
              COLORS.navy
            }
            colors={[
              COLORS.navy,
            ]}
          />
        }
        contentContainerStyle={
          styles.container
        }
      >
        <View style={styles.topBar}>
          <TouchableOpacity
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() =>
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
              Saved shops
            </Text>

            <Text
              style={
                styles.topBarCaption
              }
            >
              Your StyleHub shortlist
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Open Discover"
            onPress={() =>
              router.push(
                '/(customer)/customer/shops',
              )
            }
            style={
              styles.topIconButton
            }
          >
            <Ionicons
              name="storefront-outline"
              size={21}
              color={COLORS.navy}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.header}>
          <Text style={styles.eyebrow}>
            YOUR FAVORITES
          </Text>

          <Text style={styles.title}>
            Keep your preferred shops easy to find
          </Text>

          <Text style={styles.subtitle}>
            Saved shops stay here until you remove them, making it easier to compare availability, ratings, services, and locations later.
          </Text>
        </View>

        {errorMessage ? (
          <MessageBox
            type="error"
            title="Saved shops need attention"
            message={errorMessage}
          />
        ) : null}

        {successMessage ? (
          <MessageBox
            type="success"
            title="Saved shops updated"
            message={successMessage}
          />
        ) : null}

        <View
          style={styles.summaryCard}
        >
          <View
            style={styles.summaryTopRow}
          >
            <View>
              <Text
                style={
                  styles.summaryLabel
                }
              >
                Shops saved
              </Text>

              <Text
                style={
                  styles.summaryValue
                }
              >
                {savedSummary.total}
              </Text>
            </View>

            <View
              style={styles.summaryIcon}
            >
              <Ionicons
                name="bookmark"
                size={24}
                color={COLORS.white}
              />
            </View>
          </View>

          <View
            style={styles.summaryStats}
          >
            <SummaryItem
              label="Bookable"
              value={String(
                savedSummary.bookable,
              )}
            />

            <View
              style={
                styles.summaryDivider
              }
            />

            <SummaryItem
              label="With reviews"
              value={String(
                savedSummary.reviewed,
              )}
            />

            <View
              style={
                styles.summaryDivider
              }
            />

            <SummaryItem
              label="Showing"
              value={String(
                filteredShops.length,
              )}
            />
          </View>
        </View>

        <View
          style={styles.searchCard}
        >
          <View
            style={styles.searchBox}
          >
            <Ionicons
              name="search-outline"
              size={19}
              color={COLORS.accent}
            />

            <TextInput
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Search saved shops or location..."
              placeholderTextColor={
                COLORS.textLight
              }
              autoCorrect={false}
              returnKeyType="search"
              style={
                styles.searchInput
              }
            />

            {searchText !== '' ? (
              <TouchableOpacity
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Clear saved shops search"
                onPress={() =>
                  setSearchText('')
                }
                style={
                  styles.searchClearButton
                }
              >
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={
                    COLORS.textLight
                  }
                />
              </TouchableOpacity>
            ) : null}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={
              false
            }
            contentContainerStyle={
              styles.typeFilterRow
            }
          >
            {TYPE_FILTERS.map(
              (filter) => {
                const selected =
                  typeFilter
                  === filter.value;

                return (
                  <TouchableOpacity
                    key={
                      filter.value
                    }
                    activeOpacity={
                      0.78
                    }
                    accessibilityRole="button"
                    accessibilityState={{
                      selected,
                    }}
                    onPress={() =>
                      setTypeFilter(
                        filter.value,
                      )
                    }
                    style={[
                      styles.typeFilterChip,

                      selected
                      &&
                        styles.typeFilterChipSelected,
                    ]}
                  >
                    <Ionicons
                      name={
                        filter.icon
                      }
                      size={14}
                      color={
                        selected
                          ? COLORS.white
                          : COLORS.textMuted
                      }
                    />

                    <Text
                      style={[
                        styles.typeFilterText,

                        selected
                        &&
                          styles.typeFilterTextSelected,
                      ]}
                    >
                      {filter.label}
                    </Text>
                  </TouchableOpacity>
                );
              },
            )}
          </ScrollView>
        </View>

        <View
          style={styles.resultsHeading}
        >
          <View
            style={
              styles.resultsHeadingCopy
            }
          >
            <Text
              style={styles.sectionTitle}
            >
              Saved collection
            </Text>

            <Text
              style={
                styles.sectionSubtitle
              }
            >
              {hasActiveFilter
                ? `${filteredShops.length} of ${shops.length} saved shops match your current filter.`
                : `${shops.length} saved shop${shops.length === 1 ? '' : 's'} in your collection.`}
            </Text>
          </View>

          {!isLoading ? (
            <View
              style={
                styles.resultCountBadge
              }
            >
              <Text
                style={
                  styles.resultCountText
                }
              >
                {filteredShops.length}
              </Text>
            </View>
          ) : null}
        </View>

        {isLoading ? (
          <View
            style={styles.loadingCard}
          >
            <View
              style={styles.loadingIcon}
            >
              <ActivityIndicator
                size="small"
                color={COLORS.navy}
              />
            </View>

            <Text
              style={styles.loadingTitle}
            >
              Loading saved shops
            </Text>

            <Text
              style={styles.loadingText}
            >
              Getting the shops currently saved to your StyleHub account.
            </Text>
          </View>
        ) : shops.length === 0 ? (
          <View
            style={styles.emptyCard}
          >
            <View
              style={styles.emptyIcon}
            >
              <Ionicons
                name="bookmark-outline"
                size={28}
                color={COLORS.navy}
              />
            </View>

            <Text
              style={styles.emptyTitle}
            >
              No saved shops yet
            </Text>

            <Text
              style={styles.emptyText}
            >
              Save shops from Discover or Shop Details and they will appear here for quick access.
            </Text>

            <TouchableOpacity
              activeOpacity={0.82}
              accessibilityRole="button"
              accessibilityLabel="Explore shops"
              onPress={() =>
                router.push(
                  '/(customer)/customer/shops',
                )
              }
              style={
                styles.emptyButton
              }
            >
              <Ionicons
                name="storefront-outline"
                size={17}
                color={COLORS.white}
              />

              <Text
                style={
                  styles.emptyButtonText
                }
              >
                Explore shops
              </Text>
            </TouchableOpacity>
          </View>
        ) : filteredShops.length
          === 0 ? (
          <View
            style={styles.emptyCard}
          >
            <View
              style={styles.emptyIcon}
            >
              <Ionicons
                name="search-outline"
                size={28}
                color={COLORS.navy}
              />
            </View>

            <Text
              style={styles.emptyTitle}
            >
              No saved shops match
            </Text>

            <Text
              style={styles.emptyText}
            >
              Try another search or clear the current shop-type filter.
            </Text>

            <TouchableOpacity
              activeOpacity={0.78}
              onPress={() => {
                setSearchText('');
                setTypeFilter('all');
              }}
              style={
                styles.clearFiltersButton
              }
            >
              <Text
                style={
                  styles.clearFiltersText
                }
              >
                Clear filters
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View
            style={styles.shopList}
          >
            {filteredShops.map(
              (shop) => (
                <SavedShopCard
                  key={shop.id}
                  shop={shop}
                  removing={
                    removingShopId
                    === shop.id
                  }
                  onPress={() =>
                    openShop(
                      shop.id,
                    )
                  }
                  onRemove={() =>
                    requestRemove(
                      shop,
                    )
                  }
                />
              ),
            )}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={
          removeTarget !== null
        }
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={
          closeRemoveModal
        }
      >
        <View
          style={styles.modalOverlay}
        >
          <View
            style={styles.modalCard}
          >
            <View
              style={styles.modalIcon}
            >
              <Ionicons
                name="bookmark-outline"
                size={23}
                color={COLORS.danger}
              />
            </View>

            <Text
              style={styles.modalTitle}
            >
              Remove saved shop?
            </Text>

            <Text
              style={styles.modalText}
            >
              {removeTarget
                ? `${removeTarget.name} will be removed from your saved shops. You can save it again later from Shop Details.`
                : 'This shop will be removed from your saved shops.'}
            </Text>

            <View
              style={styles.modalActions}
            >
              <TouchableOpacity
                activeOpacity={0.78}
                disabled={
                  removingShopId
                  !== null
                }
                onPress={
                  closeRemoveModal
                }
                style={
                  styles.modalSecondaryButton
                }
              >
                <Text
                  style={
                    styles.modalSecondaryText
                  }
                >
                  Keep saved
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.82}
                disabled={
                  removingShopId
                  !== null
                }
                onPress={() =>
                  void confirmRemove()
                }
                style={[
                  styles.modalDangerButton,

                  removingShopId
                  !== null
                  &&
                    styles.disabledButton,
                ]}
              >
                {removingShopId
                !== null ? (
                  <ActivityIndicator
                    size="small"
                    color={
                      COLORS.white
                    }
                  />
                ) : (
                  <Ionicons
                    name="bookmark-outline"
                    size={17}
                    color={
                      COLORS.white
                    }
                  />
                )}

                <Text
                  style={
                    styles.modalDangerText
                  }
                >
                  {removingShopId
                  !== null
                    ? 'Removing...'
                    : 'Remove shop'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function SummaryItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.summaryItem}>
      <Text
        style={
          styles.summaryItemLabel
        }
      >
        {label}
      </Text>

      <Text
        style={
          styles.summaryItemValue
        }
      >
        {value}
      </Text>
    </View>
  );
}

function SavedShopCard({
  shop,
  removing,
  onPress,
  onRemove,
}: {
  shop: CustomerShop;
  removing: boolean;
  onPress: () => void;
  onRemove: () => void;
}) {
  const availability =
    availabilityPresentation(
      shop.availability.status,
    );

  return (
    <TouchableOpacity
      activeOpacity={0.84}
      accessibilityRole="button"
      accessibilityLabel={`Open ${shop.name}`}
      onPress={onPress}
      style={styles.shopCard}
    >
      <View style={styles.shopHeader}>
        <ShopOwnerAvatar
          shop={shop}
          size={58}
          iconSize={23}
          fallbackIcon={
            shop.type
            === 'barber_shop'
              ? 'cut-outline'
              : 'sparkles-outline'
          }
          containerStyle={
            styles.shopAvatar
          }
          imageStyle={
            styles.shopAvatarImage
          }
        />

        <View
          style={styles.shopHeading}
        >
          <Text
            numberOfLines={1}
            style={styles.shopName}
          >
            {shop.name}
          </Text>

          <Text
            style={styles.shopType}
          >
            {shop.type_label}
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          disabled={removing}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${shop.name} from saved shops`}
          onPress={(event) => {
            event.stopPropagation();

            onRemove();
          }}
          style={
            styles.removeButton
          }
        >
          {removing ? (
            <ActivityIndicator
              size="small"
              color={COLORS.navy}
            />
          ) : (
            <Ionicons
              name="bookmark"
              size={21}
              color={COLORS.navy}
            />
          )}
        </TouchableOpacity>
      </View>

      {shop.description?.trim()
        ? (
          <Text
            numberOfLines={2}
            style={
              styles.shopDescription
            }
          >
            {shop.description}
          </Text>
        )
        : null}

      <View
        style={styles.locationCard}
      >
        <View
          style={styles.locationIcon}
        >
          <Ionicons
            name="location-outline"
            size={17}
            color={COLORS.navy}
          />
        </View>

        <View
          style={styles.locationCopy}
        >
          <Text
            style={
              styles.locationLabel
            }
          >
            Location
          </Text>

          <Text
            numberOfLines={2}
            style={
              styles.locationValue
            }
          >
            {shop.address}, {shop.city}, {shop.province}
          </Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaPill}>
          <Ionicons
            name="star"
            size={13}
            color={COLORS.warning}
          />

          <Text
            style={
              styles.metaPrimaryText
            }
          >
            {shop.rating.average
            === null
              ? 'New'
              : shop.rating.average.toFixed(
                  1,
                )}
          </Text>

          {shop.rating.review_count
          > 0 ? (
            <Text
              style={
                styles.metaMutedText
              }
            >
              ({shop.rating.review_count})
            </Text>
          ) : null}
        </View>

        {typeof shop
          .active_services_count
          === 'number' ? (
            <View
              style={styles.metaPill}
            >
              <Ionicons
                name="cut-outline"
                size={13}
                color={
                  COLORS.textMuted
                }
              />

              <Text
                style={
                  styles.metaPrimaryText
                }
              >
                {shop.active_services_count}
              </Text>

              <Text
                style={
                  styles.metaMutedText
                }
              >
                service
                {
                  shop.active_services_count
                  === 1
                    ? ''
                    : 's'
                }
              </Text>
            </View>
          ) : null}

        <View
          style={[
            styles.statusPill,

            {
              backgroundColor:
                availability.background,
            },
          ]}
        >
          <Ionicons
            name={availability.icon}
            size={13}
            color={availability.color}
          />

          <Text
            style={[
              styles.statusPillText,

              {
                color:
                  availability.color,
              },
            ]}
          >
            {
              shop.availability
                .status_label
            }
          </Text>
        </View>
      </View>

      <View style={styles.shopFooter}>
        <Text
          style={styles.shopFooterText}
        >
          {shop.availability
            .accepts_appointments
            ? 'Appointments are currently available.'
            : 'Open the shop to check services and current availability.'}
        </Text>

        <View
          style={
            styles.shopFooterAction
          }
        >
          <Text
            style={
              styles.shopFooterActionText
            }
          >
            View shop
          </Text>

          <Ionicons
            name="arrow-forward"
            size={16}
            color={COLORS.navy}
          />
        </View>
      </View>
    </TouchableOpacity>
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
      <View
        style={styles.messageIcon}
      >
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

      <View
        style={styles.messageContent}
      >
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

        <Text
          style={styles.messageText}
        >
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

  summaryCard: {
    marginTop: SPACING.xl,
    padding: 18,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.primary,
    ...SHADOWS.card,
  },

  summaryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  summaryLabel: {
    color: '#D4DAE1',
    fontSize: TYPOGRAPHY.caption,
    fontWeight: '600',
  },

  summaryValue: {
    marginTop: 4,
    color: COLORS.white,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
  },

  summaryIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: COLORS.navyMuted,
  },

  summaryStats: {
    marginTop: 16,
    paddingTop: 14,
    flexDirection: 'row',
    alignItems: 'stretch',
    borderTopWidth: 1,
    borderTopColor: COLORS.navyMuted,
  },

  summaryItem: {
    flex: 1,
    minWidth: 0,
  },

  summaryItemLabel: {
    color: '#AEB8C5',
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '600',
  },

  summaryItemValue: {
    marginTop: 3,
    color: COLORS.white,
    fontSize: TYPOGRAPHY.cardTitle,
    fontWeight: '800',
  },

  summaryDivider: {
    width: 1,
    marginHorizontal: 11,
    backgroundColor: COLORS.navyMuted,
  },

  searchCard: {
    marginTop: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.surface,
    ...SHADOWS.card,
  },

  searchBox: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surfaceSoft,
  },

  searchInput: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    paddingVertical: 0,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.body,
  },

  searchClearButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },

  typeFilterRow: {
    marginTop: 10,
    gap: 7,
    paddingRight: 4,
  },

  typeFilterChip: {
    minHeight: LAYOUT.compactButtonHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.surfaceSoft,
  },

  typeFilterChipSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },

  typeFilterText: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '800',
  },

  typeFilterTextSelected: {
    color: COLORS.white,
  },

  resultsHeading: {
    marginTop: SPACING.xxl,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },

  resultsHeadingCopy: {
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

  resultCountBadge: {
    minWidth: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.accentSoft,
  },

  resultCountText: {
    color: COLORS.navy,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  loadingCard: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 34,
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
    marginTop: 13,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.cardTitle,
    fontWeight: '800',
  },

  loadingText: {
    maxWidth: 350,
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
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    backgroundColor: COLORS.accentSoft,
  },

  emptyTitle: {
    marginTop: 14,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.cardTitle,
    fontWeight: '800',
  },

  emptyText: {
    maxWidth: 370,
    marginTop: 6,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.body,
    lineHeight: 20,
    textAlign: 'center',
  },

  emptyButton: {
    minHeight: LAYOUT.compactButtonHeight,
    marginTop: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 16,
    borderRadius: RADII.md,
    backgroundColor: COLORS.primary,
  },

  emptyButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  clearFiltersButton: {
    minHeight: LAYOUT.compactButtonHeight,
    marginTop: 15,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surfaceSoft,
  },

  clearFiltersText: {
    color: COLORS.navy,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  shopList: {
    gap: 11,
  },

  shopCard: {
    padding: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.surface,
    ...SHADOWS.card,
  },

  shopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  shopAvatar: {
    borderRadius: 18,
  },

  shopAvatarImage: {
    borderRadius: 18,
  },

  shopHeading: {
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
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '600',
  },

  removeButton: {
    width: LAYOUT.iconButtonSize,
    height: LAYOUT.iconButtonSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    backgroundColor: COLORS.accentSoft,
  },

  shopDescription: {
    marginTop: 13,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.body,
    lineHeight: 20,
  },

  locationCard: {
    marginTop: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    padding: 11,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surfaceSoft,
  },

  locationIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: COLORS.surface,
  },

  locationCopy: {
    flex: 1,
    minWidth: 0,
  },

  locationLabel: {
    color: COLORS.textLight,
    fontSize: 9,
    fontWeight: '700',
  },

  locationValue: {
    marginTop: 2,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 17,
    fontWeight: '700',
  },

  metaRow: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },

  metaPill: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.accentSoft,
  },

  metaPrimaryText: {
    color: COLORS.text,
    fontSize: 10,
    fontWeight: '800',
  },

  metaMutedText: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: '600',
  },

  statusPill: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    borderRadius: RADII.pill,
  },

  statusPillText: {
    fontSize: 9,
    fontWeight: '800',
  },

  shopFooter: {
    marginTop: 13,
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },

  shopFooterText: {
    flex: 1,
    color: COLORS.textLight,
    fontSize: TYPOGRAPHY.micro,
    lineHeight: 15,
  },

  shopFooterAction: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  shopFooterActionText: {
    color: COLORS.navy,
    fontSize: TYPOGRAPHY.caption,
    fontWeight: '800',
  },

  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.42)',
  },

  modalCard: {
    width: '100%',
    maxWidth: 500,
    padding: 18,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.surface,
    ...SHADOWS.floating,
  },

  modalIcon: {
    width: 50,
    height: 50,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: COLORS.dangerSoft,
  },

  modalTitle: {
    marginTop: 13,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.section,
    fontWeight: '800',
    textAlign: 'center',
  },

  modalText: {
    marginTop: 6,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.body,
    lineHeight: 20,
    textAlign: 'center',
  },

  modalActions: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 8,
  },

  modalSecondaryButton: {
    flex: 1,
    minHeight: LAYOUT.compactButtonHeight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surfaceSoft,
  },

  modalSecondaryText: {
    color: COLORS.navy,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  modalDangerButton: {
    flex: 1.15,
    minHeight: LAYOUT.compactButtonHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: RADII.md,
    backgroundColor: COLORS.danger,
  },

  modalDangerText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  disabledButton: {
    opacity: 0.48,
  },
});