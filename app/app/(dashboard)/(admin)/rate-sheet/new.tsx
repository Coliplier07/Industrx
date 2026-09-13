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
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { supabase } from '@/lib/supabase';

type Category = 'labor' | 'equipment' | 'vehicle' | 'per_diem';
type RateType = 'hourly' | 'daily' | 'per_job';

interface ExistingItem {
  category: Category;
  name: string;
  rateType: RateType;
  rate: string;
  otRate: string;
}

const CATEGORY_OPTIONS: { value: Category; label: string }[] = [
  { value: 'labor', label: 'Labor' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'vehicle', label: 'Vehicle' },
  { value: 'per_diem', label: 'Per Diem' },
];

const RATE_TYPE_OPTIONS: { value: RateType; label: string }[] = [
  { value: 'hourly', label: 'Hourly' },
  { value: 'daily', label: 'Daily' },
  { value: 'per_job', label: 'Per Job' },
];

function formatDecimal(value: string): string {
  if (!value.trim()) return value;
  const parsed = parseFloat(value);
  return Number.isNaN(parsed) ? value : parsed.toFixed(2);
}

export default function RateSheetItemScreen() {
  const { rateItemId } = useLocalSearchParams<{ rateItemId?: string }>();
  const navigation = useNavigation();
  const [existingItem, setExistingItem] = useState<ExistingItem | null>(null);
  const [loadingItem, setLoadingItem] = useState(!!rateItemId);

  useEffect(() => {
    if (!rateItemId) return;
    const fetchItem = async () => {
      const { data, error } = await supabase.from('rate_sheet_items').select('*').eq('id', rateItemId).single();
      if (!error && data) {
        setExistingItem({
          category: data.category,
          name: data.name,
          rateType: data.rate_type,
          rate: String(data.rate),
          otRate: data.ot_rate !== null ? String(data.ot_rate) : '',
        });
      }
      setLoadingItem(false);
    };
    fetchItem();
  }, [rateItemId]);

  React.useLayoutEffect(() => {
    navigation.setOptions({ title: rateItemId ? 'Edit Rate' : 'Add Rate' });
  }, [navigation, rateItemId]);

  // Don't mount the form until an existing item (if editing) has actually
  // loaded — otherwise the form's initial state would snapshot "not found
  // yet" and permanently miss the real saved values.
  if (rateItemId && loadingItem) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#075eec" />
      </View>
    );
  }

  return <RateSheetForm key={rateItemId ?? 'new'} rateItemId={rateItemId} existingItem={existingItem} />;
}

function RateSheetForm({ rateItemId, existingItem }: { rateItemId?: string; existingItem: ExistingItem | null }) {
  const router = useRouter();
  const isEditing = !!existingItem;

  const [category, setCategory] = useState<Category>(existingItem?.category ?? 'labor');
  const [name, setName] = useState(existingItem?.name ?? '');
  // Per diem is always a flat daily amount, and labor is always hourly --
  // neither has a real rate-type choice to make, so the picker only shows
  // for equipment/vehicle. Vehicle also drops Per Job -- vehicles are
  // tracked by hours or a flat day rate, not per job.
  const [rateType, setRateType] = useState<RateType>(() => {
    if (existingItem?.category === 'per_diem') return 'daily';
    if (existingItem?.category === 'labor') return 'hourly';
    if (existingItem?.category === 'vehicle' && existingItem.rateType === 'per_job') return 'hourly';
    return existingItem?.rateType ?? 'hourly';
  });
  const [rate, setRate] = useState(existingItem?.rate ?? '');
  const [otRate, setOtRate] = useState(existingItem?.otRate ?? '');
  const [saving, setSaving] = useState(false);

  const selectCategory = (value: Category) => {
    setCategory(value);
    if (value === 'per_diem') setRateType('daily');
    else if (value === 'labor') setRateType('hourly');
    else if (value === 'vehicle' && rateType === 'per_job') setRateType('hourly');
  };

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

    if (isEditing && rateItemId) {
      const { error } = await supabase
        .from('rate_sheet_items')
        .update({
          category,
          name: name.trim(),
          rate_type: rateType,
          rate: parsedRate,
          ot_rate: category === 'labor' ? parsedOtRate : null,
        })
        .eq('id', rateItemId);
      setSaving(false);

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }
      router.back();
      return;
    }

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

  const handleDelete = () => {
    if (!rateItemId) return;
    Alert.alert(
      'Delete Rate',
      `Delete "${name}"? Any daily log entries using it will keep their history but lose this rate's info.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            const { error } = await supabase.from('rate_sheet_items').delete().eq('id', rateItemId);
            setSaving(false);
            if (error) {
              Alert.alert('Error', error.message);
              return;
            }
            router.back();
          },
        },
      ]
    );
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
            {isEditing ? (
              <>
                <View style={[styles.optionBtn, styles.optionBtnSelected, styles.optionBtnLocked]}>
                  <Text style={[styles.optionBtnText, styles.optionBtnTextSelected]}>
                    {CATEGORY_OPTIONS.find((opt) => opt.value === category)?.label}
                  </Text>
                </View>
                <Text style={styles.lockedHint}>
                  Category can&apos;t be changed once a rate is created -- it determines which rate type is
                  allowed and where it shows up in daily logs. Delete and re-add it under a different category
                  instead.
                </Text>
              </>
            ) : (
              <View style={styles.optionRow}>
                {CATEGORY_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.optionBtn, category === opt.value && styles.optionBtnSelected]}
                    onPress={() => selectCategory(opt.value)}
                  >
                    <Text style={[styles.optionBtnText, category === opt.value && styles.optionBtnTextSelected]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Superintendent"
              placeholderTextColor="#8e8e93"
              value={name}
              onChangeText={setName}
            />

            {category !== 'per_diem' && category !== 'labor' && (
              <>
                <Text style={styles.label}>Rate Type</Text>
                <View style={styles.optionRow}>
                  {RATE_TYPE_OPTIONS.filter((opt) => !(category === 'vehicle' && opt.value === 'per_job')).map((opt) => (
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
              </>
            )}

            <Text style={styles.label}>
              {category === 'per_diem' ? 'Rate ($/day)' : category === 'labor' ? 'Rate ($/hr)' : 'Rate ($)'}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor="#8e8e93"
              keyboardType="decimal-pad"
              value={rate}
              onChangeText={setRate}
              onBlur={() => setRate((current) => formatDecimal(current))}
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
                  onBlur={() => setOtRate((current) => formatDecimal(current))}
                />
              </>
            )}

            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={styles.saveBtnText}>
                {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Add to Rate Sheet'}
              </Text>
            </TouchableOpacity>

            {isEditing && (
              <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} disabled={saving}>
                <Text style={styles.deleteBtnText}>Delete Rate</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eBecf4' },
  loadingContainer: { flex: 1, backgroundColor: '#eBecf4', justifyContent: 'center', alignItems: 'center' },
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
  optionBtnLocked: { alignSelf: 'flex-start', opacity: 0.7 },
  optionBtnText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  optionBtnTextSelected: { color: '#075eec' },
  lockedHint: { fontSize: 12, color: '#6b7280', marginTop: 6, lineHeight: 16 },
  saveBtn: {
    backgroundColor: '#075eec',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  deleteBtn: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#FF3B30',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  deleteBtnText: { color: '#FF3B30', fontSize: 16, fontWeight: '700' },
});
