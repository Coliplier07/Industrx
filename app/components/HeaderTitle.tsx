import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useProfile } from '@/context/ProfileContext';

// Used as the `headerTitle` for every stack, so the company's logo (once an
// admin sets one) shows up next to the screen title everywhere, not just on
// one screen.
export function HeaderTitle({ children }: { children?: string }) {
  const { companyLogoUrl } = useProfile();

  return (
    <View style={styles.container}>
      {!!companyLogoUrl && <Image source={{ uri: companyLogoUrl }} style={styles.logo} />}
      <Text style={styles.title} numberOfLines={1}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center' },
  logo: { width: 26, height: 26, borderRadius: 6, marginRight: 8 },
  title: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
});
