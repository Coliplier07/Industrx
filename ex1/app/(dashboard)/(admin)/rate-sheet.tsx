import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';

interface RateSheetItem {
  id: string;
  category: 'labor' | 'equipment' | 'per_diem' | 'upcharge';
  name: string;
  rateType: 'hourly' | 'daily' | 'per_job' | 'percentage';
  rate: number;
  otRate: number | null;
}

const CATEGORY_LABELS: Record<RateSheetItem['category'], string> = {
  labor: 'Labor',
  equipment: 'Equipment',
  per_diem: 'Per Diem',
  upcharge: 'Upcharges',
};

const RATE_TYPE_SUFFIX: Record<RateSheetItem['rateType'], string> = {
  hourly: '/hr',
  daily: '/day',
  per_job: '/job',
  percentage: '%',
};

function formatRate(item: RateSheetItem): string {
  if (item.rateType === 'percentage') return `${item.rate}%`;
  return `$${item.rate.toFixed(2)}${RATE_TYPE_SUFFIX[item.rateType]}`;
}

export default function RateSheetScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const [items, setItems] = useState<RateSheetItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from('rate_sheet_items')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('Failed to load rate sheet:', error.message);
      Alert.alert('Error', 'Failed to load the rate sheet.');
      setLoading(false);
      return;
    }

    setItems(
      (data ?? []).map((row: any) => ({
        id: row.id,
        category: row.category,
        name: row.name,
        rateType: row.rate_type,
        rate: Number(row.rate) || 0,
        otRate: row.ot_rate === null ? null : Number(row.ot_rate),
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchItems();
  }, []);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={() => router.push('/rate-sheet/new')} style={styles.headerAddBtn}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, router]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#075eec" />
      </SafeAreaView>
    );
  }

  const grouped = (['labor', 'equipment', 'per_diem', 'upcharge'] as const).map((category) => ({
    category,
    items: items.filter((item) => item.category === category),
  }));

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {items.length === 0 ? (
          <Text style={styles.emptyText}>No rates set up yet.</Text>
        ) : (
          grouped
            .filter((group) => group.items.length > 0)
            .map((group) => (
              <View key={group.category} style={styles.section}>
                <Text style={styles.sectionTitle}>{CATEGORY_LABELS[group.category]}</Text>
                {group.items.map((item) => (
                  <View key={item.id} style={styles.card}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemRate}>
                      {formatRate(item)}
                      {item.otRate !== null ? ` · OT $${item.otRate.toFixed(2)}/hr` : ''}
                    </Text>
                  </View>
                ))}
              </View>
            ))
        )}

        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/rate-sheet/new')}>
          <Ionicons name="add-circle" size={20} color="#fff" />
          <Text style={styles.addBtnText}>Add Rate</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eBecf4' },
  centered: { justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 20 },
  emptyText: { color: '#6b7280', textAlign: 'center', marginTop: 40 },
  headerAddBtn: { paddingHorizontal: 12, paddingVertical: 6 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1e1e1e', marginBottom: 8 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemName: { fontSize: 15, fontWeight: '600', color: '#1e1e1e' },
  itemRate: { fontSize: 14, color: '#075eec', fontWeight: '700' },
  addBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#075eec',
    borderRadius: 10,
    paddingVertical: 14,
    marginTop: 8,
  },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', marginLeft: 6 },
});
