import { Stack } from 'expo-router';
import { HeaderBackButton, headerLeftItems } from '@/components/HeaderBackButton';

export default function ProjectsStackLayout() {
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
        name="jobs"
        options={{ title: 'Projects', headerLeft: () => null, unstable_headerLeftItems: () => [] }}
      />
      <Stack.Screen name="project/new" />
      <Stack.Screen name="project/[id]" />
      <Stack.Screen name="daily-log" />
      <Stack.Screen name="log/[logId]" />
      <Stack.Screen name="receipt/new" />
      <Stack.Screen name="receipt/[receiptId]" />
    </Stack>
  );
}
