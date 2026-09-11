import { Stack } from 'expo-router';
import { HeaderBackButton, headerLeftItems } from '@/components/HeaderBackButton';

export default function CrewHoursStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#075eec' }, // IronClad Blue
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
        headerLeft: ({ canGoBack }) => <HeaderBackButton canGoBack={canGoBack} />,
        unstable_headerLeftItems: headerLeftItems,
      }}
    >
      <Stack.Screen
        name="index"
        options={{ title: 'Crew Hours', headerLeft: () => null, unstable_headerLeftItems: () => [] }}
      />
    </Stack>
  );
}
