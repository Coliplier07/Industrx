import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function CrewHoursHubScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity style={styles.card} onPress={() => router.push('/submit')}>
          <View style={styles.cardIcon}>
            <Ionicons name="time" size={26} color="#075eec" />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>Submit Hours</Text>
            <Text style={styles.cardSubtitle}>Enter ST/OT for your crew on a date</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#c7ccd1" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => router.push('/report')}>
          <View style={styles.cardIcon}>
            <Ionicons name="bar-chart" size={26} color="#075eec" />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>Weekly Report</Text>
            <Text style={styles.cardSubtitle}>Everyone&apos;s hours for a pay period</Text>
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
