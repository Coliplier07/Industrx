import { Stack } from "expo-router";
import { ProjectsProvider } from "@/context/ProjectsContext";

export default function Layout() {
  return (
    <ProjectsProvider>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#075eec' }, // IronClad Blue
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      >
        {/* 1. The landing/logic gate */}
        <Stack.Screen name="index" options={{ headerShown: false }} />

        {/* 2. Auth Group */}
        <Stack.Screen name="(auth)/login" options={{ title: 'Sign In', headerShown: false }} />
        <Stack.Screen name="(auth)/create" options={{ title: 'Create Account' }} />

        {/* 3. Dashboard Group (tab navigator handles its own headers) */}
        <Stack.Screen
          name="(dashboard)"
          options={{ headerShown: false, gestureEnabled: false }}
        />
      </Stack>
    </ProjectsProvider>
  );
}