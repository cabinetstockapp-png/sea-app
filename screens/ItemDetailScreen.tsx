import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

const SEA_ITEMS_KEY = 'SEA_ITEMS';

type StoredItem = {
  barcode: string;
  updatedAt: number;
  type?: string;
  fromLocation?: string | null;
  toLocation?: string;
  location?: string;
};

type LocationRow = { location: string; qty: number };

function paramString(v: string | string[] | undefined): string {
  if (v == null) return '';
  return typeof v === 'string' ? v : v[0] ?? '';
}

export default function ItemDetailScreen() {
  const params = useLocalSearchParams<{ barcode?: string }>();
  const barcode = paramString(params.barcode);
  const [rows, setRows] = useState<LocationRow[]>([]);

  const load = useCallback(async () => {
    const raw = await AsyncStorage.getItem(SEA_ITEMS_KEY);
    let items: StoredItem[] = [];

    if (raw) {
      try {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          items = parsed as StoredItem[];
        }
      } catch {
        // use []
      }
    }

    const locationMap: Record<string, number> = {};

    for (const item of items) {
      if (item.barcode !== barcode) continue;

      const type = item.type || 'IN';

      const from = item.fromLocation || '';
      const to = item.toLocation ?? item.location ?? '';

      if (type === 'IN') {
        locationMap[to] = (locationMap[to] || 0) + 1;
      }

      if (type === 'MOVE') {
        locationMap[from] = (locationMap[from] || 0) - 1;
        locationMap[to] = (locationMap[to] || 0) + 1;
      }
    }

    const list = Object.entries(locationMap)
      .filter(([, qty]) => qty > 0)
      .map(([location, qty]) => ({
        location: location || 'General Stock',
        qty,
      }));

    list.sort((a, b) => {
      if (a.location === 'General Stock') return -1;
      if (b.location === 'General Stock') return 1;
      return a.location.localeCompare(b.location);
    });

    setRows(list);
  }, [barcode]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>{barcode}</Text>

      {rows.map((row, index) => (
        <View key={index} style={styles.row}>
          <Text style={styles.location}>{row.location}</Text>
          <Text style={styles.qty}>Qty: {row.qty}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 16 },
  header: { color: '#fff', fontSize: 22, marginBottom: 16 },
  row: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  location: { color: '#fff', fontSize: 18 },
  qty: { color: '#aaa', marginTop: 4 },
});
