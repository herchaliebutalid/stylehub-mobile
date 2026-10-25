
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ShopOwnerServiceCard from '@/src/components/ShopOwnerServiceCard';
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
import { getShopOwnerServices } from '@/src/services/shop-owner-api';
import type { ShopOwnerService } from '@/src/types/shop-owner';

type ServiceFilter = 'all' | 'active' | 'inactive';

const FILTERS: {
  value: ServiceFilter;
  label: string;
}[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

export default function ShopOwnerServicesScreen() {
  const { token } = useAuth();

  const [services, setServices] =
    useState<ShopOwnerService[]>([]);
  const [filter, setFilter] = useState<ServiceFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const hasLoadedOnce = useRef(false);

  /* LOAD SERVICES */

  const loadServices = useCallback(
    async (refreshing = false, silent = false) => {
      if (!token) {
        setIsLoading(false);
        return;
      }

      if (refreshing) {
        setIsRefreshing(true);
      } else if (!silent) {
        setIsLoading(true);
      }

      setErrorMessage('');

      try {
        const response = await getShopOwnerServices(token);
        setServices(response.data.services);
        hasLoadedOnce.current = true;
      } catch (error) {
        setErrorMessage(
          error instanceof ApiError
            ? error.message
            : 'Unable to load your services.',
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [token],
  );

  /* REFRESH WHEN RETURNING TO SCREEN */

  useFocusEffect(
    useCallback(() => {
      void loadServices(false, hasLoadedOnce.current);
      return undefined;
    }, [loadServices]),
  );

  /* COUNTS */

  const activeCount = useMemo(
    () => services.filter((service) => service.is_active).length,
    [services],
  );

  const inactiveCount = services.length - activeCount;

  /* FILTER */

  const filteredServices = useMemo(() => {
    if (filter === 'active') {
      return services.filter((service) => service.is_active);
    }

    if (filter === 'inactive') {
      return services.filter((service) => !service.is_active);
    }

    return services;
  }, [filter, services]);

  /* NAVIGATION */

  function handleBack() {
    router.replace('/(shop-owner)/shop-owner');
  }

  function createService() {
    router.push('/(shop-owner)/service/create');
  }

  function openService(serviceId: number) {
    router.push({
      pathname: '/(shop-owner)/service/[serviceId]',
      params: {
        serviceId: String(serviceId),
      },
    });
  }

  /* RENDER */

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

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void loadServices(true)}
            tintColor={COLORS.navy}
            colors={[COLORS.navy]}
          />
        }
        contentContainerStyle={styles.container}
      >
        {/* TOP BAR */}

        <View style={styles.topBar}>
          <TouchableOpacity
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Back to shop owner home"
            onPress={handleBack}
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
              Services
            </Text>
            <Text style={styles.topBarCaption}>
              Manage your service menu
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.78}
            accessibilityRole="button"
            accessibilityLabel="Add service"
            onPress={createService}
            style={styles.topAddButton}
          >
            <Ionicons
              name="add"
              size={22}
              color={COLORS.white}
            />
          </TouchableOpacity>
        </View>

        {/* HEADER */}

        <View style={styles.header}>
          <Text style={styles.eyebrow}>
            SERVICE MENU
          </Text>

          <Text style={styles.title}>
            Keep your services clear and bookable
          </Text>

          <Text style={styles.subtitle}>
            Set your prices, service duration, and which services
            customers can currently book.
          </Text>
        </View>

        {/* SUMMARY */}

        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <View>
              <Text style={styles.summaryLabel}>
                Total services
              </Text>

              <Text style={styles.summaryValue}>
                {services.length}
              </Text>
            </View>

            <View style={styles.summaryIcon}>
              <Ionicons
                name="cut-outline"
                size={24}
                color={COLORS.white}
              />
            </View>
          </View>

          <View style={styles.summaryStats}>
            <SummaryStat
              label="Active"
              value={activeCount}
            />

            <View style={styles.summaryDivider} />

            <SummaryStat
              label="Inactive"
              value={inactiveCount}
            />

            <View style={styles.summaryDivider} />

            <SummaryStat
              label="Visible"
              value={activeCount}
            />
          </View>
        </View>

        {/* ADD SERVICE SHORTCUT */}

        <View style={styles.primaryActionCard}>
          <View style={styles.primaryActionIcon}>
            <Ionicons
              name="add-circle-outline"
              size={22}
              color={COLORS.navy}
            />
          </View>

          <View style={styles.primaryActionContent}>
            <Text style={styles.primaryActionTitle}>
              Add a new service
            </Text>

            <Text style={styles.primaryActionText}>
              Create another treatment, haircut, or salon service
              for customers to book.
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Create new service"
            onPress={createService}
            style={styles.primaryActionButton}
          >
            <Ionicons
              name="arrow-forward"
              size={18}
              color={COLORS.white}
            />
          </TouchableOpacity>
        </View>

        {/* ERROR */}

        {errorMessage ? (
          <View style={styles.errorBox}>
            <View style={styles.errorIcon}>
              <Ionicons
                name="alert-circle-outline"
                size={19}
                color={COLORS.danger}
              />
            </View>

            <View style={styles.errorContent}>
              <Text style={styles.errorTitle}>
                Couldn't refresh services
              </Text>

              <Text style={styles.errorText}>
                {errorMessage}
              </Text>
            </View>
          </View>
        ) : null}

        {/* FILTER SECTION */}

        <View style={styles.filterSection}>
          <View>
            <Text style={styles.sectionTitle}>
              Your services
            </Text>

            <Text style={styles.sectionSubtitle}>
              Choose which services you want to manage
            </Text>
          </View>

          <View style={styles.segmentedControl}>
            {FILTERS.map((item) => {
              const selected = item.value === filter;

              const count =
                item.value === 'active'
                  ? activeCount
                  : item.value === 'inactive'
                    ? inactiveCount
                    : services.length;

              return (
                <TouchableOpacity
                  key={item.value}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => setFilter(item.value)}
                  style={[
                    styles.segment,
                    selected && styles.segmentSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      selected && styles.segmentTextSelected,
                    ]}
                  >
                    {item.label}
                  </Text>

                  <View
                    style={[
                      styles.segmentCount,
                      selected && styles.segmentCountSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.segmentCountText,
                        selected && styles.segmentCountTextSelected,
                      ]}
                    >
                      {count}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* LOADING, EMPTY, AND SERVICE LIST */}

        {isLoading ? (
          <View style={styles.stateCard}>
            <View style={styles.stateIcon}>
              <ActivityIndicator
                size="small"
                color={COLORS.navy}
              />
            </View>

            <Text style={styles.stateTitle}>
              Loading services
            </Text>

            <Text style={styles.stateText}>
              Getting the latest service menu for your shop.
            </Text>
          </View>
        ) : filteredServices.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name={
                  filter === 'all'
                    ? 'cut-outline'
                    : 'filter-outline'
                }
                size={28}
                color={COLORS.navy}
              />
            </View>

            <Text style={styles.emptyTitle}>
              {filter === 'all'
                ? 'No services yet'
                : `No ${filter} services`}
            </Text>

            <Text style={styles.emptyText}>
              {filter === 'all'
                ? 'Add your first service so customers can see what your shop offers and start booking.'
                : `You do not have any ${filter} services right now.`}
            </Text>

            {filter === 'all' ? (
              <TouchableOpacity
                activeOpacity={0.82}
                style={styles.emptyButton}
                onPress={createService}
              >
                <Ionicons
                  name="add"
                  size={18}
                  color={COLORS.white}
                />

                <Text style={styles.emptyButtonText}>
                  Add first service
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.showAllButton}
                onPress={() => setFilter('all')}
              >
                <Text style={styles.showAllButtonText}>
                  Show all services
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.serviceList}>
            {filteredServices.map((service) => (
              <ShopOwnerServiceCard
                key={service.id}
                service={service}
                onPress={() => openService(service.id)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/* SUMMARY STAT */

function SummaryStat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <View style={styles.summaryStat}>
      <Text style={styles.summaryStatValue}>
        {value}
      </Text>

      <Text style={styles.summaryStatLabel}>
        {label}
      </Text>
    </View>
  );
}

/* STYLES */

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Same 40px top spacing as other Shop Owner screens.
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

  topAddButton: {
    width: LAYOUT.iconButtonSize,
    height: LAYOUT.iconButtonSize,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -2,
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
    maxWidth: 500,
    marginTop: 5,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.title,
    lineHeight: 30,
    fontWeight: '800',
    letterSpacing: -0.6,
  },

  subtitle: {
    maxWidth: 560,
    marginTop: 8,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.body,
    lineHeight: 21,
  },

  summaryCard: {
    marginTop: SPACING.xl,
    padding: 18,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.primary,
    ...SHADOWS.card,
  },

  summaryHeader: {
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
    marginTop: 18,
    paddingTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.navyMuted,
  },

  summaryStat: {
    flex: 1,
  },

  summaryStatValue: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.cardTitle,
    fontWeight: '800',
  },

  summaryStatLabel: {
    marginTop: 3,
    color: '#D4DAE1',
    fontSize: TYPOGRAPHY.micro,
  },

  summaryDivider: {
    width: 1,
    height: 34,
    marginHorizontal: 12,
    backgroundColor: COLORS.navyMuted,
  },

  primaryActionCard: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.surface,
  },

  primaryActionIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: COLORS.accentSoft,
  },

  primaryActionContent: {
    flex: 1,
    minWidth: 0,
  },

  primaryActionTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  primaryActionText: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    lineHeight: 16,
  },

  primaryActionButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.primary,
  },

  errorBox: {
    marginTop: SPACING.lg,
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

  filterSection: {
    marginTop: SPACING.xxl,
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
  },

  segmentedControl: {
    marginTop: 14,
    flexDirection: 'row',
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surface,
  },

  segment: {
    flex: 1,
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
    borderRadius: 11,
  },

  segmentSelected: {
    backgroundColor: COLORS.primary,
  },

  segmentText: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
    fontWeight: '700',
  },

  segmentTextSelected: {
    color: COLORS.white,
  },

  segmentCount: {
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.surfaceSoft,
  },

  segmentCountSelected: {
    backgroundColor: COLORS.navyMuted,
  },

  segmentCountText: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '800',
  },

  segmentCountTextSelected: {
    color: COLORS.white,
  },

  stateCard: {
    marginTop: 14,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 34,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.surface,
  },

  stateIcon: {
    width: 52,
    height: 52,
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
    maxWidth: 320,
    marginTop: 5,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
    textAlign: 'center',
  },

  emptyCard: {
    marginTop: 14,
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
    maxWidth: 340,
    marginTop: 6,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.body,
    lineHeight: 20,
    textAlign: 'center',
  },

  emptyButton: {
    minHeight: LAYOUT.compactButtonHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 18,
    paddingHorizontal: 16,
    borderRadius: RADII.md,
    backgroundColor: COLORS.primary,
  },

  emptyButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  showAllButton: {
    minHeight: LAYOUT.compactButtonHeight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surfaceSoft,
  },

  showAllButtonText: {
    color: COLORS.navy,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  serviceList: {
    marginTop: 14,
    gap: 12,
  },
});
