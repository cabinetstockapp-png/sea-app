import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const flowState = require('../core/flowState');

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

function getBarcodeFromFlow(): string {
  const item = flowState.selectedItem;
  if (item && typeof item === 'object' && item !== null && 'barcode' in item) {
    const b = (item as { barcode?: unknown }).barcode;
    return typeof b === 'string' ? b : '';
  }
  return '';
}

function getSourcesFromFlow(): { location: string; qty: number }[] {
  const job = flowState.selectedJob;
  if (
    job &&
    typeof job === 'object' &&
    job !== null &&
    'sources' in job &&
    Array.isArray((job as { sources?: unknown }).sources)
  ) {
    return ((job as { sources: { location: string; qty: number }[] }).sources).map((s) => ({
      location: s.location,
      qty: s.qty,
    }));
  }
  return [];
}

function getToLocationFromFlow(): string {
  const job = flowState.selectedJob;
  if (job && typeof job === 'object' && job !== null && 'toLocation' in job) {
    const t = (job as { toLocation?: unknown }).toLocation;
    return typeof t === 'string' ? t : '';
  }
  return '';
}

export default function ConfirmMove() {
  const navigation = useNavigation();

  const parsedSources = useMemo(() => getSourcesFromFlow(), []);

  const barcodeStr = getBarcodeFromFlow();
  const toLocationStr = getToLocationFromFlow();

  const [editableSources, setEditableSources] = useState(() =>
    parsedSources.map((s) => ({ ...s })),
  );
  const [pressed, setPressed] = useState(false);

  useEffect(() => {
    setEditableSources(parsedSources.map((s) => ({ ...s })));
  }, [parsedSources]);

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

      const code = getBarcodeFromFlow();
      const to = getToLocationFromFlow()?.trim() || '';

      const now = Date.now();
      const newItems: SeaItem[] = [];
      const simItems = [...items];

      for (const s of editableSources) {
        if (s.qty <= 0) continue;

        const avail = getAvailableQty(simItems, code, s.location);
        if (s.qty > avail) {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          return;
        }

        for (let i = 0; i < s.qty; i++) {
          const row: SeaItem = {
            barcode: code,
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

      flowState.completeFlow();
      flowState.resetFlow();
      console.log("Flow: completed and reset");
      navigation.navigate('Scan' as never);
    } catch {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [editableSources, navigation]);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        <Text style={styles.title} selectable>
          {barcodeStr || '—'}
        </Text>

        <Text style={{ color: 'red' }}>
          DEBUG TO: {toLocationStr} | movement {flowState.movementType != null ? String(flowState.movementType) : '—'} |
          qty {typeof flowState.quantity === 'number' ? flowState.quantity : '—'} | job{' '}
          {flowState.selectedJob != null ? JSON.stringify(flowState.selectedJob) : '—'}
        </Text>

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
