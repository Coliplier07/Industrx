import { Stack } from 'expo-router';
import { HeaderBackButton, headerLeftItems } from '@/components/HeaderBackButton';
import { HeaderTitle } from '@/components/HeaderTitle';

export default function MyHoursStackLayout() {
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
        name="hours"
        options={{ title: 'My Hours', headerLeft: () => null, unstable_headerLeftItems: () => [] }}
      />
      <Stack.Screen name="entry/[entryId]" />
    </Stack>
  );
}
