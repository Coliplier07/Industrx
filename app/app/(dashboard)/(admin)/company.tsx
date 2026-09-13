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
  Image,
} from 'react-native';
import { useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/context/ProfileContext';
import HeaderIconButton from '@/components/HeaderIconButton';
import { WEEKDAY_LABELS } from '@/lib/week';

export default function CompanySettingsScreen() {
  const navigation = useNavigation();
  const { profile, refresh } = useProfile();
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [payPeriodStartDay, setPayPeriodStartDay] = useState(0);
  const [logoPath, setLogoPath] = useState<string | null>(null);
  const [logoSignedUrl, setLogoSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const fetchCompany = async () => {
    if (!profile) return;
    const { data, error } = await supabase
      .from('companies')
      .select('name, location, pay_period_start_day, logo_path')
      .eq('id', profile.companyId)
      .single();
    if (!error && data) {
      setName(data.name);
      setLocation(data.location ?? '');
      setPayPeriodStartDay(data.pay_period_start_day ?? 0);
      setLogoPath(data.logo_path);
      if (data.logo_path) {
        const { data: signed } = await supabase.storage
          .from('company-logos')
          .createSignedUrl(data.logo_path, 3600);
        setLogoSignedUrl(signed?.signedUrl ?? null);
      } else {
        setLogoSignedUrl(null);
      }
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

  const pickLogo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Needed', 'Allow photo library access to set a company logo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !profile) return;

    setUploadingLogo(true);
    try {
      const path = `${profile.companyId}/logo.jpg`;
      const response = await fetch(result.assets[0].uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('company-logos')
        .upload(path, blob, { contentType: 'image/jpeg', upsert: true });
      if (uploadError) throw uploadError;

      const { error: updateError } = await supabase
        .from('companies')
        .update({ logo_path: path })
        .eq('id', profile.companyId);
      if (updateError) throw updateError;

      await fetchCompany();
      await refresh();
    } catch (error: any) {
      Alert.alert('Error', error.message ?? 'Failed to update company logo.');
    } finally {
      setUploadingLogo(false);
    }
  };

  const removeLogo = async () => {
    if (!logoPath || !profile) return;
    setUploadingLogo(true);
    try {
      await supabase.storage.from('company-logos').remove([logoPath]);
      const { error } = await supabase.from('companies').update({ logo_path: null }).eq('id', profile.companyId);
      if (error) throw error;
      await fetchCompany();
      await refresh();
    } catch (error: any) {
      Alert.alert('Error', error.message ?? 'Failed to remove company logo.');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleLogoPress = () => {
    if (!logoSignedUrl) {
      pickLogo();
      return;
    }
    Alert.alert('Company Logo', undefined, [
      { text: 'Replace Logo', onPress: pickLogo },
      { text: 'Remove Logo', style: 'destructive', onPress: removeLogo },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const showOptions = () =>
    Alert.alert('Company', undefined, [
      { text: 'Edit Company Info', onPress: () => setIsEditing(true) },
      { text: 'Cancel', style: 'cancel' },
    ]);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <HeaderIconButton name="ellipsis-horizontal" onPress={showOptions} style={{ marginRight: 8 }} />
      ),
      unstable_headerRightItems: () => [
        {
          type: 'custom',
          element: <HeaderIconButton name="ellipsis-horizontal" onPress={showOptions} style={{ marginRight: 8 }} />,
          hidesSharedBackground: true,
        },
      ],
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
      .update({
        name: name.trim(),
        location: location.trim() || null,
        pay_period_start_day: payPeriodStartDay,
      })
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
            <View style={styles.logoSection}>
              <TouchableOpacity style={styles.logo} onPress={handleLogoPress} disabled={uploadingLogo}>
                {uploadingLogo ? (
                  <ActivityIndicator color="#fff" />
                ) : logoSignedUrl ? (
                  <Image source={{ uri: logoSignedUrl }} style={styles.logoImage} />
                ) : (
                  <Ionicons name="business" size={28} color="#fff" />
                )}
              </TouchableOpacity>
              <Text style={styles.logoHint}>{logoSignedUrl ? 'Tap to change logo' : 'Tap to add a company logo'}</Text>
            </View>

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

                <Text style={styles.label}>Pay Period Starts On</Text>
                <View style={styles.dayRow}>
                  {WEEKDAY_LABELS.map((label, index) => (
                    <TouchableOpacity
                      key={label}
                      style={[styles.dayBtn, payPeriodStartDay === index && styles.dayBtnSelected]}
                      onPress={() => setPayPeriodStartDay(index)}
                    >
                      <Text style={[styles.dayBtnText, payPeriodStartDay === index && styles.dayBtnTextSelected]}>
                        {label.slice(0, 3)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

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
                <View style={styles.infoRow}>
                  <Ionicons name="calendar-outline" size={18} color="#6b7280" />
                  <Text style={styles.infoText}>Pay period starts {WEEKDAY_LABELS[payPeriodStartDay]}</Text>
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
  logoSection: { alignItems: 'center', marginBottom: 16 },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 14,
    backgroundColor: '#075eec',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  logoImage: { width: 72, height: 72, borderRadius: 14 },
  logoHint: { fontSize: 13, color: '#6b7280', fontWeight: '600' },
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
  dayRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dayBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e1e4e8',
    backgroundColor: '#f8f9fa',
  },
  dayBtnSelected: { backgroundColor: '#075eec20', borderColor: '#075eec' },
  dayBtnText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  dayBtnTextSelected: { color: '#075eec' },
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
