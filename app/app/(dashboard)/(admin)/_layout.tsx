import { Stack } from 'expo-router';
import { HeaderBackButton, headerLeftItems } from '@/components/HeaderBackButton';

export default function AdminStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#075eec' }, // IronClad Blue
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
        // Classic headerLeft as the cross-platform fallback (Android/web).
        headerLeft: ({ canGoBack }) => <HeaderBackButton canGoBack={canGoBack} />,
        unstable_headerLeftItems: headerLeftItems,
      }}
    >
      <Stack.Screen
        name="index"
        options={{ title: 'Admin', headerLeft: () => null, unstable_headerLeftItems: () => [] }}
      />
      <Stack.Screen name="company" options={{ title: 'Company' }} />
      <Stack.Screen name="team" options={{ title: 'Team' }} />
      <Stack.Screen name="team/new" options={{ title: 'Add Person' }} />
      <Stack.Screen name="rate-sheet" options={{ title: 'Rate Sheet' }} />
      <Stack.Screen name="rate-sheet/new" />
    </Stack>
  );
}
