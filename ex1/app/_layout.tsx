import { Stack } from "expo-router";
import { ProfileProvider } from "@/context/ProfileContext";
import { ProjectsProvider } from "@/context/ProjectsContext";
import { HeaderBackButton, headerLeftItems } from "@/components/HeaderBackButton";

export default function Layout() {
  return (
    <ProfileProvider>
      <ProjectsProvider>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: '#075eec' }, // IronClad Blue
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: 'bold' },
            headerLeft: ({ canGoBack }) => <HeaderBackButton canGoBack={canGoBack} />,
            unstable_headerLeftItems: headerLeftItems,
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
    </ProfileProvider>
  );
}
