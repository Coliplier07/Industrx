import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useNavigation, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import HeaderIconButton from '@/components/HeaderIconButton';

interface Member {
  id: string;
  fullName: string;
  role: 'admin' | 'pm' | 'employee';
  managerName: string | null;
}

export default function TeamScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMembers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, role, manager:manager_id(full_name)')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to load team:', error.message);
      Alert.alert('Error', 'Failed to load team members.');
      setLoading(false);
      return;
    }

    setMembers(
      (data ?? []).map((row: any) => ({
        id: row.id,
        fullName: row.full_name || 'Unnamed',
        role: row.role,
        managerName: row.manager?.full_name ?? null,
      }))
    );
    setLoading(false);
  };

  // Re-fetch every time this screen regains focus (not just on first mount),
  // so returning from Add Person shows the up-to-date list.
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchMembers();
    }, [])
  );

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <HeaderIconButton name="add" onPress={() => router.push('/team/new')} style={{ marginRight: 8 }} />
      ),
      unstable_headerRightItems: () => [
        {
          type: 'custom',
          element: <HeaderIconButton name="add" onPress={() => router.push('/team/new')} style={{ marginRight: 8 }} />,
          hidesSharedBackground: true,
        },
      ],
    });
  }, [navigation, router]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#075eec" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {members.length === 0 ? (
          <Text style={styles.emptyText}>No team members yet.</Text>
        ) : (
          members.map((member) => (
            <View key={member.id} style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.memberName}>{member.fullName}</Text>
                <View style={[styles.roleBadge, styles[`role_${member.role}` as const]]}>
                  <Text style={styles.roleBadgeText}>{member.role.toUpperCase()}</Text>
                </View>
              </View>
              {member.role === 'employee' && (
                <Text style={styles.managerText}>
                  Reports to {member.managerName ?? 'no PM assigned'}
                </Text>
              )}
            </View>
          ))
        )}

        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/team/new')}>
          <Ionicons name="add-circle" size={20} color="#fff" />
          <Text style={styles.addBtnText}>Add Person</Text>
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
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  memberName: { fontSize: 16, fontWeight: '700', color: '#1e1e1e' },
  roleBadge: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6 },
  role_admin: { backgroundColor: '#075eec20' },
  role_pm: { backgroundColor: '#34C75920' },
  role_employee: { backgroundColor: '#8e8e9320' },
  roleBadgeText: { fontSize: 11, fontWeight: '700', color: '#1e1e1e' },
  managerText: { fontSize: 13, color: '#6b7280', marginTop: 6 },
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
