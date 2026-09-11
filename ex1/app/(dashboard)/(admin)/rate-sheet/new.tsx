import React, { useState } from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

type Category = 'labor' | 'equipment' | 'per_diem' | 'upcharge';
type RateType = 'hourly' | 'daily' | 'per_job' | 'percentage';

const CATEGORY_OPTIONS: { value: Category; label: string }[] = [
  { value: 'labor', label: 'Labor' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'per_diem', label: 'Per Diem' },
  { value: 'upcharge', label: 'Upcharge' },
];

const RATE_TYPE_OPTIONS: { value: RateType; label: string }[] = [
  { value: 'hourly', label: 'Hourly' },
  { value: 'daily', label: 'Daily' },
  { value: 'per_job', label: 'Per Job' },
  { value: 'percentage', label: 'Percentage' },
];

export default function AddRateSheetItemScreen() {
  const router = useRouter();

  const [category, setCategory] = useState<Category>('labor');
  const [name, setName] = useState('');
  const [rateType, setRateType] = useState<RateType>('hourly');
  const [rate, setRate] = useState('');
  const [otRate, setOtRate] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const parsedRate = parseFloat(rate);
    if (!name.trim() || Number.isNaN(parsedRate) || parsedRate < 0) {
      Alert.alert('Required Fields', 'Enter a name and a valid rate.');
      return;
    }

    const parsedOtRate = otRate.trim() ? parseFloat(otRate) : null;
    if (parsedOtRate !== null && (Number.isNaN(parsedOtRate) || parsedOtRate < 0)) {
      Alert.alert('Invalid OT Rate', 'Enter a valid overtime rate, or leave it blank.');
      return;
    }

    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', userData.user!.id)
      .single();

    const { error } = await supabase.from('rate_sheet_items').insert({
      company_id: profile!.company_id,
      category,
      name: name.trim(),
      rate_type: rateType,
      rate: parsedRate,
      ot_rate: category === 'labor' ? parsedOtRate : null,
    });
    setSaving(false);

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoider}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        <ScrollView keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.label}>Category</Text>
            <View style={styles.optionRow}>
              {CATEGORY_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.optionBtn, category === opt.value && styles.optionBtnSelected]}
                  onPress={() => setCategory(opt.value)}
                >
                  <Text style={[styles.optionBtnText, category === opt.value && styles.optionBtnTextSelected]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Superintendent"
              placeholderTextColor="#8e8e93"
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.label}>Rate Type</Text>
            <View style={styles.optionRow}>
              {RATE_TYPE_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.optionBtn, rateType === opt.value && styles.optionBtnSelected]}
                  onPress={() => setRateType(opt.value)}
                >
                  <Text style={[styles.optionBtnText, rateType === opt.value && styles.optionBtnTextSelected]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>{rateType === 'percentage' ? 'Rate (%)' : 'Rate ($)'}</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor="#8e8e93"
              keyboardType="decimal-pad"
              value={rate}
              onChangeText={setRate}
            />

            {category === 'labor' && (
              <>
                <Text style={styles.label}>OT Rate ($/hr, optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  placeholderTextColor="#8e8e93"
                  keyboardType="decimal-pad"
                  value={otRate}
                  onChangeText={setOtRate}
                />
              </>
            )}

            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Add to Rate Sheet'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eBecf4' },
  keyboardAvoider: { flex: 1 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    margin: 20,
  },
  label: { fontSize: 14, fontWeight: '600', color: '#1e1e1e', marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: '#f8f9fa',
    borderColor: '#e1e4e8',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e1e4e8',
    backgroundColor: '#f8f9fa',
  },
  optionBtnSelected: { backgroundColor: '#075eec20', borderColor: '#075eec' },
  optionBtnText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  optionBtnTextSelected: { color: '#075eec' },
  saveBtn: {
    backgroundColor: '#075eec',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
