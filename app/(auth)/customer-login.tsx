import RoleLoginScreen from '@/src/components/RoleLoginScreen';

export default function CustomerLoginScreen() {
  return (
    <RoleLoginScreen
      role="customer"
      title="Customer Sign In"
      subtitle="Sign in to discover shops, manage your appointments and access your StyleHub account."
      icon="person-outline"
    />
  );
}