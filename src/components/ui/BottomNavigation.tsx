import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';

export type NavTab = 'home' | 'practice' | 'progress' | 'profile';

interface BottomNavigationProps {
  activeTab?: NavTab;
  lang?: string;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({ activeTab, lang = 'en' }) => {
  const router = useRouter();
  const pathname = usePathname();

  const getActive = (): NavTab => {
    if (activeTab) return activeTab;
    if (pathname === '/' || pathname === '/index') return 'home';
    if (pathname.includes('/practice')) return 'practice';
    if (pathname.includes('/progress')) return 'progress';
    if (pathname.includes('/profile')) return 'profile';
    return 'home';
  };

  const current = getActive();

  const handleNavigate = (tab: NavTab) => {
    const params = { lang };
    switch (tab) {
      case 'home':
        router.push({ pathname: '/', params });
        break;
      case 'practice':
        router.push({ pathname: '/practice', params });
        break;
      case 'progress':
        router.push({ pathname: '/progress', params });
        break;
      case 'profile':
        router.push({ pathname: '/profile', params });
        break;
    }
  };

  const tabs: { key: NavTab; labelEn: string; labelTa: string; icon: string }[] = [
    { key: 'home', labelEn: 'Home', labelTa: 'முகப்பு', icon: '🏠' },
    { key: 'practice', labelEn: 'Practice', labelTa: 'பயிற்சி', icon: '🎯' },
    { key: 'progress', labelEn: 'Progress', labelTa: 'முன்னேற்றம்', icon: '📊' },
    { key: 'profile', labelEn: 'Profile', labelTa: 'சுயவிவரம்', icon: '👤' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.navBar}>
        {tabs.map((tab) => {
          const isActive = current === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={({ pressed }) => [
                styles.tabButton,
                isActive && styles.activeTab,
                pressed && styles.pressed,
              ]}
              onPress={() => handleNavigate(tab.key)}
              accessibilityRole="button"
              accessibilityLabel={lang === 'ta' ? tab.labelTa : tab.labelEn}
            >
              <Text style={[styles.icon, isActive && styles.activeIcon]}>{tab.icon}</Text>
              <Text style={[styles.label, isActive && styles.activeLabel]}>
                {lang === 'ta' ? tab.labelTa : tab.labelEn}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  navBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: 500,
    width: '100%',
    justifyContent: 'space-around',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  activeTab: {
    backgroundColor: '#EDE9FE',
  },
  pressed: {
    opacity: 0.7,
  },
  icon: {
    fontSize: 22,
  },
  activeIcon: {
    transform: [{ scale: 1.1 }],
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 2,
  },
  activeLabel: {
    color: '#4F46E5',
    fontWeight: '800',
  },
});
