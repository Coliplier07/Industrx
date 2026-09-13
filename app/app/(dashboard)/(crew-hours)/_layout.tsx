import { Stack } from 'expo-router';
import { HeaderBackButton, headerLeftItems } from '@/components/HeaderBackButton';
import { HeaderTitle } from '@/components/HeaderTitle';

export default function CrewHoursStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#075eec' }, // IronClad Blue
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
        headerTitle: ({ children }) => <HeaderTitle>{children}</HeaderTitle>,
        headerLeft: ({ canGoBack }) => <HeaderBackButton canGoBack={canGoBack} />,
        unstable_headerLeftItems: headerLeftItems,
      }}
    >
      <Stack.Screen
        name="index"
        options={{ title: 'Crew Hours', headerLeft: () => null, unstable_headerLeftItems: () => [] }}
      />
      <Stack.Screen name="submit" options={{ title: 'Submit Hours' }} />
      <Stack.Screen name="report" options={{ title: 'Weekly Report' }} />
    </Stack>
  );
}
