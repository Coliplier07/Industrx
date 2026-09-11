import { Text, View, SafeAreaView, StyleSheet, TouchableOpacity } from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';

const Home = () => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.logoBadge}>
          <Ionicons name="hammer" size={40} color="#fff" />
        </View>

        <Text style={styles.title}>Welcome to Industrx</Text>
        <Text style={styles.subtitle}>Projects, daily logs, and receipts — all in one place.</Text>

        <View style={styles.actions}>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Login</Text>
            </TouchableOpacity>
          </Link>

          <Link href="/(auth)/create" asChild>
            <TouchableOpacity style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Create an Account</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default Home;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#eBecf4' },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logoBadge: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: '#075eec',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
    shadowColor: '#075eec',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#1e1e1e',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 48,
    lineHeight: 21,
  },
  actions: { width: '100%', gap: 14 },
  primaryButton: {
    backgroundColor: '#075eec',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#075eec',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  primaryButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  secondaryButton: { paddingVertical: 12, alignItems: 'center' },
  secondaryButtonText: { color: '#075eec', fontSize: 15, fontWeight: '600' },
});
