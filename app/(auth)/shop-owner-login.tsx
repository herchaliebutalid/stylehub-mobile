import RoleLoginScreen from '@/src/components/RoleLoginScreen';

export default function ShopOwnerLoginScreen() {
  return (
    <RoleLoginScreen
      role="shop_owner"
      title="Shop Owner Sign In"
      subtitle="Sign in to manage your StyleHub shop, services, schedules and appointments."
      icon="storefront-outline"
    />
  );
}