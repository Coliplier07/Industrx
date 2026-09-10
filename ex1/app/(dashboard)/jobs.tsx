import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { useRouter } from "expo-router";
import { Ionicons } from '@expo/vector-icons';

export default function JobsDashboard() {
  const router = useRouter();

  const handleLogout = () => {
    // Sends the PM back to the login screen and clears the dashboard from history
    router.replace("/(auth)/login");
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Project Header */}
        <View style={styles.projectCard}>
          <Text style={styles.label}>ACTIVE JOB</Text>
          <Text style={styles.jobTitle}>Sector 7 Pipeline - Maintenance</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Clocked In: 07:30 AM</Text>
          </View>
        </View>

        {/* Action Grid */}
        <View style={styles.grid}>
          <MenuButton 
            title="Daily Log" 
            icon="journal" 
            color="#075eec" 
            onPress={() => router.push("/(dashboard)/daily-log")}
          />
          <MenuButton 
            title="Fuel Pump" 
            icon="beaker" 
            color="#FF9500" 
            onPress={() => console.log('NFC Activation')} 
          />
          <MenuButton 
            title="Receipts" 
            icon="camera" 
            color="#f82a1f" 
            onPress={() => console.log('Camera Open')} 
          />
          <MenuButton 
            title="Crew Clock" 
            icon="people" 
            color="#34C759" 
            onPress={() => console.log('Crew Management')} 
          />
        </View>

        {/* Logout Section */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Sign Out of IronClad</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}


interface MenuButtonProps {
  title: string;
  icon: any; // Or specific Ionicons name type
  color: string;
  onPress: () => void;
}
// Reusable Button Component for the Grid
const MenuButton = ({ title, icon, color, onPress }: MenuButtonProps) => {
  return (
    <TouchableOpacity style={styles.menuCard} onPress={onPress}>
      <View style={[styles.iconCircle, { backgroundColor: color }]}>
        <Ionicons name={icon} size={28} color="#fff" />
      </View>
      <Text style={styles.menuLabel}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eBecf4' },
  scrollContent: { padding: 20 },
  projectCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  label: { fontSize: 12, fontWeight: '700', color: '#6b7280', marginBottom: 4 },
  jobTitle: { fontSize: 20, fontWeight: 'bold', color: '#1e1e1e' },
  badge: { 
    backgroundColor: '#34C75920', 
    padding: 6, 
    borderRadius: 6, 
    alignSelf: 'flex-start', 
    marginTop: 10 
  },
  badgeText: { color: '#34C759', fontWeight: 'bold', fontSize: 13 },
  grid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'space-between' 
  },
  menuCard: {
    backgroundColor: '#fff',
    width: '48%',
    height: 140,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  menuLabel: { fontWeight: '600', color: '#333' },
  logoutBtn: { marginTop: 20, padding: 15, alignItems: 'center' },
  logoutText: { color: '#FF3B30', fontWeight: 'bold' }
});