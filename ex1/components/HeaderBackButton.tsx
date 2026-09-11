import React from 'react';
import { useNavigation } from 'expo-router';
import HeaderIconButton from '@/components/HeaderIconButton';

export function HeaderBackButton({ canGoBack }: { canGoBack?: boolean }) {
  const navigation = useNavigation();
  if (!canGoBack) return null;
  return (
    <HeaderIconButton name="chevron-back" onPress={() => navigation.goBack()} style={{ marginLeft: 8 }} />
  );
}

// On iOS, unstable_headerLeftItems wins over the classic headerLeft prop.
// hidesSharedBackground suppresses iOS 26's automatic "Liquid Glass" pill
// behind custom bar buttons, which otherwise wraps a plain icon in a large
// translucent circle. Also sidesteps the default back button falling back
// to the previous screen's raw route name (e.g. "index") as its label.
export function headerLeftItems({ canGoBack }: { canGoBack?: boolean }) {
  return canGoBack
    ? [
        {
          type: 'custom' as const,
          element: <HeaderBackButton canGoBack={canGoBack} />,
          hidesSharedBackground: true,
        },
      ]
    : [];
}
