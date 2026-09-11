import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, SafeAreaView, Alert, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';

const USER = {
  name: 'John Doe',
  role: 'Project Manager',
  email: 'john.doe@ironclad.com',
  phone: '(555) 123-4567',
};

export default function ProfileScreen() {
  const router = useRouter();
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

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

    if (!result.canceled) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const handleAvatarPress = () => {
    if (!avatarUri) {
      pickPhoto();
      return;
    }

    Alert.alert('Profile Photo', undefined, [
      { text: 'Replace Photo', onPress: pickPhoto },
      { text: 'Remove Photo', style: 'destructive', onPress: () => setAvatarUri(null) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const initials = USER.name
    .split(' ')
    .map((part) => part[0])
    .join('');

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      >

        <View style={styles.profileCard}>
          <TouchableOpacity style={styles.avatar} onPress={handleAvatarPress}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{initials}</Text>
            )}
            <View style={styles.editBadge}>
              <Ionicons name="camera" size={14} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text style={styles.name}>{USER.name}</Text>
          <Text style={styles.role}>{USER.role}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Contact Info</Text>

          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={18} color="#6b7280" />
            <Text style={styles.infoText}>{USER.email}</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={18} color="#6b7280" />
            <Text style={styles.infoText}>{USER.phone}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out of IronClad</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eBecf4' },
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
