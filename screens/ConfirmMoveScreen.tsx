import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import type { RootStackParamList } from '@/navigation/types';

const SEA_ITEMS_KEY = 'SEA_ITEMS';
const GENERAL_STOCK = 'General Stock';

function displayLocationKey(loc: string | null | undefined): string {
  const s = typeof loc === 'string' ? loc.trim() : '';
  return s === '' ? GENERAL_STOCK : s;
}

function getAvailableQty(
  items: {
    barcode: string;
    type?: string;
    toLocation?: string;
    fromLocation?: string | null;
    location?: string;
  }[],
  code: string,
  location: string,
) {
  let q = 0;

  for (const item of items) {
    if (item.barcode !== code) continue;

    const type = item.type || 'IN';

    if (type === 'IN') {
      const to = displayLocationKey(item.toLocation);
      if (to === location) q += 1;
    }

    if (type === 'MOVE') {
      const from = displayLocationKey(item.fromLocation);
      const to = displayLocationKey(item.toLocation);

      if (from === location) q -= 1;
      if (to === location) q += 1;
    }
  }

  return q;
}

type ConfirmMoveRoute = RouteProp<RootStackParamList, 'ConfirmMove'>;

export default function ConfirmMoveScreen() {
  const navigation = useNavigation();
  const { params } = useRoute<ConfirmMoveRoute>();

  const barcode = params.barcode;
  const toLocation = params.toLocation;
  const sources = useMemo(() => params.sources ?? [], [params.sources]);

  console.log('CONFIRM RECEIVED →', toLocation);

  const [editableSources, setEditableSources] = useState(() => sources.map((s) => ({ ...s })));
  const [pressed, setPressed] = useState(false);

  const finalTotal = editableSources.reduce((sum, s) => sum + s.qty, 0);

  const confirmSave = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(SEA_ITEMS_KEY);

      type SeaItem = {
        barcode: string;
        updatedAt: number;
        type?: string;
        location?: string;
        fromLocation?: string | null;
        toLocation?: string;
      };
      let items: SeaItem[] = [];

      if (raw) {
        try {
          const parsed: unknown = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            items = parsed as SeaItem[];
          }
        } catch {
          // use []
        }
      }

      const now = Date.now();
      const to = toLocation?.trim() || '';
      const newItems: SeaItem[] = [];
      const simItems = [...items];

      for (const s of editableSources) {
        if (s.qty <= 0) continue;

        const avail = getAvailableQty(simItems, barcode, s.location);
        if (s.qty > avail) {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          return;
        }

        for (let i = 0; i < s.qty; i++) {
          const row: SeaItem = {
            barcode,
            fromLocation: s.location === GENERAL_STOCK ? '' : s.location,
            toLocation: to,
            type: 'MOVE',
            updatedAt: now,
          };
          newItems.push(row);
          simItems.push(row);
        }
      }

      if (newItems.length === 0) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        navigation.goBack();
        return;
      }

      await AsyncStorage.setItem(SEA_ITEMS_KEY, JSON.stringify(items.concat(newItems)));
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      navigation.goBack();
    } catch {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [barcode, editableSources, navigation, toLocation]);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        <Text style={styles.title} selectable>
          {barcode || '—'}
        </Text>

        <Text style={{ color: 'red' }}>DEBUG TO: {toLocation}</Text>

        {editableSources.map((s, i) => (
          <View key={i} style={{ marginBottom: 10 }}>
            <Text style={{ color: '#aaa' }}>{s.location}</Text>

            <TextInput
              style={{
                backgroundColor: '#111',
                color: '#fff',
                padding: 10,
                borderRadius: 8,
                marginTop: 4,
              }}
              value={String(s.qty)}
              keyboardType="numeric"
              onChangeText={(val) => {
                const copy = [...editableSources];
                copy[i] = { ...copy[i], qty: Math.max(0, parseInt(val, 10) || 0) };
                setEditableSources(copy);
              }}
            />
          </View>
        ))}

        <Text style={{ color: '#fff', marginTop: 10 }}>Final moved: {finalTotal}</Text>

        <Pressable
          style={[styles.confirmButton, pressed && styles.buttonActive]}
          onPressIn={() => setPressed(true)}
          onPressOut={() => setPressed(false)}
          onPress={() => void confirmSave()}
          accessibilityRole="button"
          accessibilityLabel="Confirm move">
          <Text style={styles.confirmText}>Confirm</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 24,
    paddingBottom: 32,
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  confirmButton: {
    backgroundColor: '#00c853',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  confirmText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  buttonActive: {
    opacity: 0.6,
    transform: [{ scale: 0.98 }],
  },
});
