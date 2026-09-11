import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/context/ProfileContext';
import HeaderIconButton from '@/components/HeaderIconButton';

export default function CompanySettingsScreen() {
  const navigation = useNavigation();
  const { profile } = useProfile();
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const fetchCompany = async () => {
    if (!profile) return;
    const { data, error } = await supabase
      .from('companies')
      .select('name, location')
      .eq('id', profile.companyId)
      .single();
    if (!error && data) {
      setName(data.name);
      setLocation(data.location ?? '');
    }
    setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCompany();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.companyId]);

  const cancelEdit = () => {
    fetchCompany();
    setIsEditing(false);
  };

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <HeaderIconButton
          name="ellipsis-horizontal"
          onPress={() =>
            Alert.alert('Company', undefined, [
              { text: 'Edit Company Info', onPress: () => setIsEditing(true) },
              { text: 'Cancel', style: 'cancel' },
            ])
          }
          style={{ marginRight: 8 }}
        />
      ),
    });
  }, [navigation]);

  const handleSave = async () => {
    if (!name.trim() || !profile) {
      Alert.alert('Required Field', 'Please enter a company name.');
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('companies')
      .update({ name: name.trim(), location: location.trim() || null })
      .eq('id', profile.companyId);
    setSaving(false);

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    setIsEditing(false);
    Alert.alert('Saved', 'Company info updated.');
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#075eec" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoider}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        <ScrollView keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            {isEditing ? (
              <>
                <Text style={styles.label}>Company Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Nelson Sandblasting & Coating"
                  placeholderTextColor="#8e8e93"
                  value={name}
                  onChangeText={setName}
                />

                <Text style={styles.label}>Location</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Hutchinson, KS"
                  placeholderTextColor="#8e8e93"
                  value={location}
                  onChangeText={setLocation}
                />

                <TouchableOpacity
                  style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.cancelBtn} onPress={cancelEdit} disabled={saving}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.infoRow}>
                  <Ionicons name="business-outline" size={18} color="#6b7280" />
                  <Text style={styles.infoText}>{name || 'Unnamed Company'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Ionicons name="location-outline" size={18} color="#6b7280" />
                  <Text style={styles.infoText}>{location || '—'}</Text>
                </View>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eBecf4' },
  centered: { justifyContent: 'center', alignItems: 'center' },
  keyboardAvoider: { flex: 1 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    margin: 20,
  },
  label: { fontSize: 14, fontWeight: '600', color: '#1e1e1e', marginBottom: 6, marginTop: 10 },
  input: {
    backgroundColor: '#f8f9fa',
    borderColor: '#e1e4e8',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  saveBtn: {
    backgroundColor: '#075eec',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 18,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelBtn: { paddingVertical: 12, alignItems: 'center' },
  cancelBtnText: { color: '#6b7280', fontSize: 14, fontWeight: '600' },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  infoText: { fontSize: 15, color: '#1e1e1e', marginLeft: 10 },
});
