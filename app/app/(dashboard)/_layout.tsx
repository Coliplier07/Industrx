import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useProfile } from '@/context/ProfileContext';

export default function DashboardLayout() {
  const { profile, loading } = useProfile();

  // Wait for the role to be known before deciding which tabs to show —
  // otherwise the Admin tab would flash in/out on every load.
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#075eec" />
      </View>
    );
  }

  const isAdmin = profile?.role === 'admin';
  const isPmOrAdmin = profile?.role === 'pm' || profile?.role === 'admin';
  const isEmployee = profile?.role === 'employee';
  // A PM has their own timesheet entries too (submitted by an admin, or via
  // Crew Hours' "your own hours" row) — they need My Hours to approve or
  // dispute those, same as an employee.
  const seesMyHours = isEmployee || profile?.role === 'pm';

  return (
    <Tabs
      // Tabs otherwise always focuses the first declared screen — which is
      // (projects), hidden or not — so without this an employee would land
      // on a Projects screen they can't even see the tab for.
      initialRouteName={isEmployee ? '(my-hours)' : '(projects)'}
      screenOptions={{
        headerStyle: { backgroundColor: '#075eec' }, // IronClad Blue
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
        tabBarActiveTintColor: '#075eec',
        tabBarInactiveTintColor: '#8e8e93',
      }}
    >
      <Tabs.Screen
        name="(projects)"
        options={{
          headerShown: false, // The nested stack manages its own headers
          href: isEmployee ? null : undefined, // employees don't get project/daily-log access
          tabBarLabel: 'Projects',
          tabBarIcon: ({ color, size }) => <Ionicons name="briefcase" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="(crew-hours)"
        options={{
          headerShown: false, // The nested stack manages its own headers
          href: isPmOrAdmin ? undefined : null, // only PM/admin submit crew hours
          tabBarLabel: 'Crew Hours',
          tabBarIcon: ({ color, size }) => <Ionicons name="time" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="(my-hours)"
        options={{
          headerShown: false, // The nested stack manages its own headers
          href: seesMyHours ? undefined : null, // employees and PMs see their own hours
          tabBarLabel: 'My Hours',
          tabBarIcon: ({ color, size }) => <Ionicons name="time" size={size} color={color} />,
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
        name="(admin)"
        options={{
          headerShown: false, // The nested stack manages its own headers
          href: isAdmin ? undefined : null, // hides the tab entirely for non-admins
          tabBarLabel: 'Admin',
          tabBarIcon: ({ color, size }) => <Ionicons name="shield-checkmark" size={size} color={color} />,
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
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, backgroundColor: '#eBecf4', justifyContent: 'center', alignItems: 'center' },
});
