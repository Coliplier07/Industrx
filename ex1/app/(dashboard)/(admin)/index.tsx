import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function AdminHubScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity style={styles.card} onPress={() => router.push('/team')}>
          <View style={styles.cardIcon}>
            <Ionicons name="people" size={26} color="#075eec" />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>Team</Text>
            <Text style={styles.cardSubtitle}>Add PMs and employees, assign roles</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#c7ccd1" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => router.push('/rate-sheet')}>
          <View style={styles.cardIcon}>
            <Ionicons name="pricetags" size={26} color="#075eec" />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>Rate Sheet</Text>
            <Text style={styles.cardSubtitle}>Labor, equipment, per diem, and upcharge rates</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#c7ccd1" />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eBecf4' },
  scrollContent: { padding: 20 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#eef4ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#1e1e1e' },
  cardSubtitle: { fontSize: 13, color: '#6b7280', marginTop: 2 },
});
