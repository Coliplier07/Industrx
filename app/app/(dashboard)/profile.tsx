import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/context/ProfileContext';
import HeaderIconButton from '@/components/HeaderIconButton';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  pm: 'Project Manager',
  employee: 'Employee',
};

function formatPhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length < 4) return digits.length ? `(${digits}` : '';
  if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export default function ProfileScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { profile, loading, refresh } = useProfile();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [savingContact, setSavingContact] = useState(false);
  const [isEditingContact, setIsEditingContact] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ''));
  }, []);

  useEffect(() => {
    // Seeds the editable fields from the loaded profile once per account —
    // keyed on id (not the whole profile) so it doesn't clobber in-progress
    // edits every time refresh() re-fetches after a save.
    if (!profile) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFullName(profile.fullName);
    setPhone(profile.phone ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  useEffect(() => {
    if (!profile) return;
    supabase
      .from('companies')
      .select('name')
      .eq('id', profile.companyId)
      .single()
      .then(({ data }) => setCompanyName(data?.name ?? null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.companyId]);

  const cancelEditContact = () => {
    if (profile) {
      setFullName(profile.fullName);
      setPhone(profile.phone ?? '');
    }
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ''));
    setIsEditingContact(false);
  };

  const showOptions = () =>
    Alert.alert('Profile', undefined, [
      { text: 'Edit Contact Info', onPress: () => setIsEditingContact(true) },
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

  const handleSaveContactInfo = async () => {
    if (!profile) return;
    if (!fullName.trim()) {
      Alert.alert('Required Field', 'Please enter your name.');
      return;
    }

    setSavingContact(true);
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim(), phone: phone.trim() || null })
        .eq('id', profile.id);
      if (profileError) throw profileError;

      const { data: userData } = await supabase.auth.getUser();
      if (email.trim() && email.trim() !== userData.user?.email) {
        const { error: emailError } = await supabase.auth.updateUser({ email: email.trim() });
        if (emailError) throw emailError;
        Alert.alert('Check Your Email', 'Confirm the change using the link sent to your new email address.');
      } else {
        Alert.alert('Saved', 'Your info has been updated.');
      }

      await refresh();
      setIsEditingContact(false);
    } catch (error: any) {
      Alert.alert('Error', error.message ?? 'Failed to save changes.');
    } finally {
      setSavingContact(false);
    }
  };

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Needed', 'Allow photo library access to set a profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !profile) return;

    setUploading(true);
    try {
      const path = `${profile.id}/avatar.jpg`;
      const response = await fetch(result.assets[0].uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, blob, { contentType: 'image/jpeg', upsert: true });
      if (uploadError) throw uploadError;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_path: path })
        .eq('id', profile.id);
      if (updateError) throw updateError;

      await refresh();
    } catch (error: any) {
      Alert.alert('Error', error.message ?? 'Failed to update profile photo.');
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = async () => {
    if (!profile?.avatarPath) return;
    setUploading(true);
    try {
      await supabase.storage.from('avatars').remove([profile.avatarPath]);
      const { error } = await supabase.from('profiles').update({ avatar_path: null }).eq('id', profile.id);
      if (error) throw error;
      await refresh();
    } catch (error: any) {
      Alert.alert('Error', error.message ?? 'Failed to remove profile photo.');
    } finally {
      setUploading(false);
    }
  };

  const handleAvatarPress = () => {
    if (!profile?.avatarSignedUrl) {
      pickPhoto();
      return;
    }

    Alert.alert('Profile Photo', undefined, [
      { text: 'Replace Photo', onPress: pickPhoto },
      { text: 'Remove Photo', style: 'destructive', onPress: removePhoto },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace('/');
        },
      },
    ]);
  };

  if (loading || !profile) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#075eec" />
      </SafeAreaView>
    );
  }

  const initials = (profile.fullName || '?')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoider}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      >

        <View style={styles.profileCard}>
          <TouchableOpacity style={styles.avatar} onPress={handleAvatarPress} disabled={uploading}>
            {uploading ? (
              <ActivityIndicator color="#fff" />
            ) : profile.avatarSignedUrl ? (
              <Image source={{ uri: profile.avatarSignedUrl }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{initials}</Text>
            )}
            <View style={styles.editBadge}>
              <Ionicons name="camera" size={14} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text style={styles.name}>{profile.fullName || 'Unnamed'}</Text>
          <Text style={styles.role}>{ROLE_LABELS[profile.role] ?? profile.role}</Text>
          {companyName && <Text style={styles.company}>{companyName}</Text>}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Contact Info</Text>

          {isEditingContact ? (
            <>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Your full name"
                placeholderTextColor="#8e8e93"
                value={fullName}
                onChangeText={setFullName}
              />

              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor="#8e8e93"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.label}>Phone</Text>
              <TextInput
                style={styles.input}
                placeholder="(555) 123-4567"
                placeholderTextColor="#8e8e93"
                value={phone}
                onChangeText={(val) => setPhone(formatPhoneNumber(val))}
                keyboardType="phone-pad"
              />

              <TouchableOpacity
                style={[styles.saveBtn, savingContact && styles.saveBtnDisabled]}
                onPress={handleSaveContactInfo}
                disabled={savingContact}
              >
                <Text style={styles.saveBtnText}>{savingContact ? 'Saving...' : 'Save Changes'}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.cancelBtn} onPress={cancelEditContact} disabled={savingContact}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.infoRow}>
                <Ionicons name="person-outline" size={18} color="#6b7280" />
                <Text style={styles.infoText}>{profile.fullName || 'Unnamed'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="mail-outline" size={18} color="#6b7280" />
                <Text style={styles.infoText}>{email || '—'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="call-outline" size={18} color="#6b7280" />
                <Text style={styles.infoText}>{phone || '—'}</Text>
              </View>
            </>
          )}
        </View>

        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out of Industrx</Text>
        </TouchableOpacity>

      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eBecf4' },
  centered: { justifyContent: 'center', alignItems: 'center' },
  keyboardAvoider: { flex: 1 },
  scrollContent: { padding: 20 },
  profileCard: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 15,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#075eec',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarImage: { width: 72, height: 72, borderRadius: 36 },
  avatarText: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  editBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#075eec',
    borderWidth: 2,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: { fontSize: 20, fontWeight: 'bold', color: '#1e1e1e' },
  role: { fontSize: 14, color: '#6b7280', marginTop: 2 },
  company: { fontSize: 13, color: '#075eec', fontWeight: '600', marginTop: 6 },
  card: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 15,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#6b7280', marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: '#1e1e1e', marginBottom: 6, marginTop: 10 },
  input: {
    backgroundColor: '#f8f9fa',
    borderColor: '#e1e4e8',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1e1e1e',
  },
  saveBtn: {
    backgroundColor: '#075eec',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 18,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  cancelBtn: { paddingVertical: 12, alignItems: 'center' },
  cancelBtnText: { color: '#6b7280', fontSize: 14, fontWeight: '600' },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  infoText: { fontSize: 15, color: '#1e1e1e', marginLeft: 10 },
  signOutBtn: { marginTop: 8, padding: 15, alignItems: 'center' },
  signOutText: { color: '#FF3B30', fontWeight: 'bold' },
});
