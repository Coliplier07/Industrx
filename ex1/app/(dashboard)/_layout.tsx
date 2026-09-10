import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function DashboardLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#075eec' }, // IronClad Blue
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
        tabBarActiveTintColor: '#075eec',
        tabBarInactiveTintColor: '#8e8e93',
      }}
    >
      <Tabs.Screen
        name="jobs"
        options={{
          title: 'IronClad Dashboard',
          tabBarLabel: 'Projects',
          tabBarIcon: ({ color, size }) => <Ionicons name="briefcase" size={size} color={color} />,
          headerLeft: () => null, // Prevents PMs from accidentally going back to Login
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarLabel: 'Messages',
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-circle" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="daily-log"
        options={{
          title: 'New Daily Log',
          href: null, // Reachable via router.push, hidden from the tab bar
        }}
      />
    </Tabs>
  );
}
