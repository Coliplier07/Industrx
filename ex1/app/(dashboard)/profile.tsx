import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, SafeAreaView, Alert, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/context/ProfileContext';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  pm: 'Project Manager',
  employee: 'Employee',
};

export default function ProfileScreen() {
  const router = useRouter();
  const { profile, loading, refresh } = useProfile();
  const [email, setEmail] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          // replace() only swaps the current screen, leaving the rest of
          // the stack (including the dashboard) reachable via swipe-back.
          // dismissTo unwinds the whole stack down to the landing screen.
          router.dismissTo('/');
        },
      },
    ]);
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
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Contact Info</Text>

          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={18} color="#6b7280" />
            <Text style={styles.infoText}>{email ?? '—'}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out of Industrx</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eBecf4' },
  centered: { justifyContent: 'center', alignItems: 'center' },
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
  card: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 15,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#6b7280', marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  infoText: { fontSize: 15, color: '#1e1e1e', marginLeft: 10 },
  signOutBtn: { marginTop: 8, padding: 15, alignItems: 'center' },
  signOutText: { color: '#FF3B30', fontWeight: 'bold' },
});
