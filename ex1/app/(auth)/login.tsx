import {
  Text,
  View,
  SafeAreaView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import React, { useState } from 'react';
import { Link, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';

function Login() {
  const router = useRouter();

  const [form, setForm] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (!form.email || !form.password) {
      Alert.alert('Missing Info', 'Please enter your email and password.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });
    setLoading(false);

    if (error) {
      Alert.alert('Sign In Failed', error.message);
      return;
    }

    // We use .replace so the PM cannot "go back" to the login screen
    // after they have already accessed the dashboard.
    router.replace('/jobs');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.flexFill} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View style={styles.logoBadge}>
              <Ionicons name="hammer" size={32} color="#fff" />
            </View>

            <Text style={styles.title}>Sign in to Industrx</Text>
            <Text style={styles.subtitle}>Your jobsite. In your pocket.</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                style={styles.inputControl}
                placeholder="yourEmail@gmail.com"
                placeholderTextColor="#8e8e93"
                value={form.email}
                onChangeText={(email) => setForm({ ...form, email })}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <TextInput
                secureTextEntry
                style={styles.inputControl}
                placeholder="********"
                placeholderTextColor="#8e8e93"
                value={form.password}
                onChangeText={(password) => setForm({ ...form, password })}
              />
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSignIn}
              disabled={loading}
            >
              <Text style={styles.buttonText}>{loading ? 'Signing In...' : 'Sign In'}</Text>
            </TouchableOpacity>

            <Link href="/(auth)/create" asChild>
              <TouchableOpacity style={styles.createAccountLink}>
                <Text style={styles.createAccountText}>Create an Account</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default Login;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#eBecf4' },
  flexFill: { flex: 1 },
  container: { padding: 24, flexGrow: 1, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 36 },
  logoBadge: {
    width: 76,
    height: 76,
    borderRadius: 20,
    backgroundColor: '#075eec',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#075eec',
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  title: { fontSize: 26, fontWeight: '800', color: '#1e1e1e', textAlign: 'center' },
  subtitle: { fontSize: 15, fontWeight: '500', color: '#6b7280', marginTop: 6, textAlign: 'center' },
  form: {},
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: '700', color: '#6b7280', marginBottom: 6 },
  inputControl: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e1e4e8',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    fontSize: 15,
    fontWeight: '500',
    color: '#1e1e1e',
  },
  button: {
    backgroundColor: '#075eec',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#075eec',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { fontSize: 17, fontWeight: '700', color: '#fff' },
  createAccountLink: { marginTop: 18, alignItems: 'center' },
  createAccountText: { fontSize: 14, fontWeight: '600', color: '#075eec' },
});
