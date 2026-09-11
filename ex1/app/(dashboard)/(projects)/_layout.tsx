import { Stack } from 'expo-router';

export default function ProjectsStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#075eec' }, // IronClad Blue
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
        headerBackButtonDisplayMode: 'minimal', // Just the arrow, no "Back" text
      }}
    >
      <Stack.Screen name="jobs" options={{ title: 'Projects', headerLeft: () => null }} />
      <Stack.Screen name="project/new" />
      <Stack.Screen name="project/[id]" />
      <Stack.Screen name="daily-log" />
      <Stack.Screen name="log/[logId]" />
      <Stack.Screen name="receipt/new" />
      <Stack.Screen name="receipt/[receiptId]" />
    </Stack>
  );
}
