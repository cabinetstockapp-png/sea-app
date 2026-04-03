import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

const SEA_ITEMS_KEY = 'SEA_ITEMS';

const JOBS = ['A1', 'A2', 'A3', 'B1', 'B2', 'B3'];

const GENERAL_STOCK = 'General Stock';

function displayLocationKey(loc: string | null | undefined): string {
  const s = typeof loc === 'string' ? loc.trim() : '';
  return s === '' ? GENERAL_STOCK : s;
}

function paramString(v: string | string[] | undefined): string {
  if (v == null) return '';
  return typeof v === 'string' ? v : v[0] ?? '';
}

export default function AssignScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ barcode?: string }>();
  const barcode = paramString(params.barcode);

  const [selectedSources, setSelectedSources] = useState<{ location: string; qty: number }[]>([]);
  const [locationInput, setLocationInput] = useState('');
  const [filteredJobs, setFilteredJobs] = useState(JOBS);
  const [showDropdown, setShowDropdown] = useState(false);
  const [qty, setQty] = useState('1');
  const [mode, setMode] = useState<'IN' | 'MOVE'>('IN'); // IN or MOVE
  const [pressed, setPressed] = useState<'save' | null>(null);
  const [sourceOptions, setSourceOptions] = useState<{ location: string; qty: number }[]>([]);

  useEffect(() => {
    const load = async () => {
      const raw = await AsyncStorage.getItem(SEA_ITEMS_KEY);
      let items: {
        barcode: string;
        type?: string;
        toLocation?: string;
        fromLocation?: string | null;
        location?: string;
      }[] = [];

      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            items = parsed;
          }
        } catch {
          // ignore
        }
      }

      const map: Record<string, number> = {};

      for (const item of items) {
        if (item.barcode !== barcode) continue;

        const type = item.type || 'IN';

        if (type === 'IN') {
          const to = displayLocationKey(item.toLocation);
          map[to] = (map[to] || 0) + 1;
        }

        if (type === 'MOVE') {
          const from = displayLocationKey(item.fromLocation);
          const to = displayLocationKey(item.toLocation);

          map[from] = (map[from] || 0) - 1;
          map[to] = (map[to] || 0) + 1;
        }
      }

      const options = Object.entries(map)
        .filter(([, q]) => q > 0)
        .map(([location, qty]) => ({ location, qty }));

      setSourceOptions(options);
    };

    if (mode === 'MOVE') {
      void load();
    } else {
      setSourceOptions([]);
      setSelectedSources([]);
    }
  }, [barcode, mode]);

  const toggleSource = (location: string, qtyAvailable: number) => {
    setSelectedSources((prev) => {
      const exists = prev.find((s) => s.location === location);

      if (exists) {
        return prev.filter((s) => s.location !== location);
      }

      return [...prev, { location, qty: qtyAvailable }];
    });
  };

  const handleSearch = useCallback((text: string) => {
    setLocationInput(text);

    if (!text) {
      setFilteredJobs(JOBS);
      setShowDropdown(false);
      return;
    }

    const filtered = JOBS.filter((job) =>
      job.toLowerCase().startsWith(text.toLowerCase()),
    );

    setFilteredJobs(filtered);
    setShowDropdown(true);
  }, []);

  const saveLocation = useCallback(async (finalTo: string) => {
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

      const quantity = Math.max(1, parseInt(qty, 10) || 1);
      const target = finalTo?.trim();
      const toStored = target && target.length > 0 ? target : '';

      const now = Date.now();
      const newItems = Array.from({ length: quantity }, () => ({
        barcode,
        fromLocation: null,
        toLocation: toStored,
        type: 'IN' as const,
        updatedAt: now,
      }));

      items = items.concat(newItems);

      await AsyncStorage.setItem(SEA_ITEMS_KEY, JSON.stringify(items));

      setQty('1');
      setSelectedSources([]);
      handleSearch('');
    } catch {
      // ignore
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.back();
  }, [barcode, handleSearch, router, qty]);

  const handleSavePress = () => {
    console.log('LOCKED TO →', locationInput);

    if (mode === 'MOVE') {
      router.push({
        pathname: '/ConfirmMove',
        params: {
          barcode,
          sources: JSON.stringify(selectedSources),
          toLocation: locationInput,
        },
      });
      return;
    }

    if (mode === 'IN') {
      const finalTo = locationInput?.trim() ?? '';

      if (!finalTo) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }

      void saveLocation(finalTo);
    }
  };

  const parsedQty = Math.max(1, parseInt(qty, 10) || 1);
  const accumulatedQty = selectedSources.reduce((sum, s) => sum + s.qty, 0);
  const remainingQty = Math.max(0, parsedQty - accumulatedQty);
  const moveSaveBlocked = mode === 'MOVE' && remainingQty > 0;

  return (
    <View style={styles.container}>
      <Text style={styles.barcode} selectable>
        {barcode || '—'}
      </Text>

      <View style={styles.modeRow}>
        <Pressable
          style={[styles.modeButton, mode === 'IN' && styles.modeActive]}
          onPress={() => setMode('IN')}
          accessibilityRole="button"
          accessibilityLabel="Stock in">
          <Text style={styles.modeText}>IN</Text>
        </Pressable>

        <Pressable
          style={[styles.modeButton, mode === 'MOVE' && styles.modeActive]}
          onPress={() => setMode('MOVE')}
          accessibilityRole="button"
          accessibilityLabel="Stock move">
          <Text style={styles.modeText}>MOVE</Text>
        </Pressable>
      </View>

      {mode === 'MOVE' && (
        <>
          <Text style={styles.label}>From</Text>
          {sourceOptions.map((opt, index) => (
            <Pressable
              key={index}
              style={[
                styles.sourceItem,
                selectedSources.find((s) => s.location === opt.location) && styles.sourceActive,
              ]}
              onPress={() => toggleSource(opt.location, opt.qty)}
              accessibilityRole="button"
              accessibilityLabel={`From ${opt.location}, quantity ${opt.qty}`}>
              <Text style={styles.sourceText}>
                {opt.location} — {opt.qty}
              </Text>
            </Pressable>
          ))}

          {mode === 'MOVE' && parsedQty > 0 && (
            <View style={{ marginTop: 10 }}>
              <Text style={{ color: '#aaa' }}>Selected: {accumulatedQty}</Text>
              <Text style={{ color: remainingQty > 0 ? 'orange' : '#00c853' }}>
                Remaining: {remainingQty}
              </Text>
            </View>
          )}
        </>
      )}

      <Text style={styles.label}>Qty</Text>
      <TextInput
        style={[styles.input, moveSaveBlocked && { borderColor: 'red' }]}
        value={qty}
        onChangeText={setQty}
        keyboardType="numeric"
      />

      {mode === 'MOVE' && parsedQty > 0 && (
        <>
          {remainingQty > 0 && (
            <Text style={{ color: 'red', marginTop: 6 }}>
              Cannot move {parsedQty}. Selected sources cover {accumulatedQty}.
            </Text>
          )}
        </>
      )}

      {mode === 'MOVE' && remainingQty > 0 && (
        <Text style={{ color: '#aaa', marginTop: 4 }}>
          Select another source or reduce quantity
        </Text>
      )}

      <Text style={styles.label}>To</Text>
      <TextInput
        style={styles.input}
        value={locationInput}
        onChangeText={(text) => {
          setLocationInput(text);
          handleSearch(text);
        }}
        placeholder="Search job or leave empty for General Stock"
        placeholderTextColor="#666"
        multiline
      />

      {showDropdown && filteredJobs.length > 0 && (
        <View style={styles.dropdown}>
          {filteredJobs.map((job, index) => (
            <Pressable
              key={index}
              style={styles.dropdownItem}
              onPress={() => {
                handleSearch(job);
                setShowDropdown(false);
              }}>
              <Text style={styles.dropdownText}>{job}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <Pressable
        disabled={moveSaveBlocked || (mode === 'IN' && !locationInput?.trim())}
        style={[
          styles.saveButton,
          moveSaveBlocked && { opacity: 0.5 },
          mode === 'IN' && !locationInput?.trim() && { opacity: 0.4 },
          pressed === 'save' && styles.buttonActive,
        ]}
        onPressIn={() => {
          setPressed('save');
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
        onPressOut={() => setPressed(null)}
        onPress={() => void handleSavePress()}
        accessibilityRole="button"
        accessibilityLabel="Save assignment"
        accessibilityState={{
          disabled: moveSaveBlocked || (mode === 'IN' && !locationInput?.trim()),
        }}>
        <Text style={styles.saveText}>Save</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 16,
    paddingTop: 24,
  },
  barcode: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 24,
  },
  modeRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  modeButton: {
    flex: 1,
    padding: 14,
    backgroundColor: '#111',
    borderRadius: 10,
    alignItems: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  modeActive: {
    backgroundColor: '#00c853',
  },
  modeText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  label: {
    color: '#ccc',
    fontSize: 16,
    marginBottom: 8,
  },
  sourceItem: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 8,
  },
  sourceActive: {
    backgroundColor: '#00c853',
  },
  sourceText: {
    color: '#fff',
  },
  input: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: '#fff',
    fontSize: 16,
    minHeight: 56,
    marginBottom: 16,
  },
  dropdown: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    marginTop: 4,
    marginBottom: 16,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  dropdownText: {
    color: '#fff',
  },
  saveButton: {
    backgroundColor: '#00c853',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  buttonActive: {
    opacity: 0.6,
    transform: [{ scale: 0.98 }],
  },
});
