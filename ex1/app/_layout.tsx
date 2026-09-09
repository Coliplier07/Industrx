import { Stack } from "expo-router";

export default function Layout() {
  return (
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

      {/* 3. Dashboard Group */}
      <Stack.Screen 
        name="(dashboard)/jobs" 
        options={{ 
          title: 'IronClad Dashboard',
          headerLeft: () => null, // Prevents PMs from accidentally going back to Login
          gestureEnabled: false,   // Disables swipe-back on iOS

          
        }}
        />
      {/* 4. Daily Log S creen */}
        <Stack.Screen 
          name="(dashboard)/daily-log" 
          options={{ 
           title: 'New Daily Log',
           headerBackTitle: 'Back',
        }} 
        
      />
    </Stack>
  );
}