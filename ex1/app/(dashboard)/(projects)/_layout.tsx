import React from 'react';
import { Stack, useNavigation } from 'expo-router';
import HeaderIconButton from '@/components/HeaderIconButton';

function BackButton({ canGoBack }: { canGoBack?: boolean }) {
  const navigation = useNavigation();
  if (!canGoBack) return null;
  return (
    <HeaderIconButton name="chevron-back" onPress={() => navigation.goBack()} style={{ marginLeft: 8 }} />
  );
}

export default function ProjectsStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#075eec' }, // IronClad Blue
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
        headerLeft: ({ canGoBack }) => <BackButton canGoBack={canGoBack} />,
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
