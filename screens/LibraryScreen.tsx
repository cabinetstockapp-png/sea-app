import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const SEA_ITEMS_KEY = 'SEA_ITEMS';

type StoredItem = { barcode: string; location: string; updatedAt: number; type?: string };

type GroupedRow = { barcode: string; qty: number; updatedAt: number };

export default function LibraryScreen() {
  const [rows, setRows] = useState<GroupedRow[]>([]);

  const load = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(SEA_ITEMS_KEY);
      console.log('RAW SEA_ITEMS:', raw);
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

      console.log('PARSED ITEMS:', items);

      const grouped = Object.values(
        items.reduce<Record<string, GroupedRow>>((acc, item) => {
          if (!acc[item.barcode]) {
            acc[item.barcode] = {
              barcode: item.barcode,
              qty: 0,
              updatedAt: item.updatedAt,
            };
          }

          const type = item.type || 'IN';

          if (type === 'OUT') {
            acc[item.barcode].qty -= 1;
          } else {
            acc[item.barcode].qty += 1;
          }

          if (item.updatedAt > acc[item.barcode].updatedAt) {
            acc[item.barcode].updatedAt = item.updatedAt;
          }

          return acc;
        }, {}),
      );

      grouped.sort((a, b) => b.updatedAt - a.updatedAt);
      console.log('LIST:', grouped);
      setRows(grouped);
    } catch {
      setRows([]);
    }
  }, []);

  const resetAllData = async () => {
    try {
      await AsyncStorage.removeItem(SEA_ITEMS_KEY);
      setRows([]);
      console.log('SEA_ITEMS cleared');
    } catch {
      console.log('Failed to clear storage');
    }
  };

  useEffect(() => {
    load();
  }, [load]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        <Pressable style={styles.resetButton} onPress={() => void resetAllData()}>
          <Text style={styles.resetText}>RESET ALL DATA</Text>
        </Pressable>

        {rows.length === 0 ? (
          <Text style={styles.empty}>No items</Text>
        ) : (
          rows.map((row, index) => (
            <Pressable
              key={index}
              style={styles.row}
              onPress={() =>
                router.push({
                  pathname: '/ItemDetail',
                  params: { barcode: row.barcode },
                })
              }>

              <Text style={styles.barcode}>{row.barcode}</Text>
              <Text style={styles.location}>Qty: {row.qty}</Text>
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#000',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 8,
    flexGrow: 1,
  },
  resetButton: {
    backgroundColor: 'red',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  resetText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  empty: {
    color: '#888',
    fontSize: 18,
    marginTop: 24,
    textAlign: 'center',
  },
  row: {
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#333',
  },
  barcode: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '600',
  },
  location: {
    color: '#aaa',
    fontSize: 15,
    marginTop: 6,
  },
});
