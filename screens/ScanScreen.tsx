import {
  type BarcodeScanningResult,
  type BarcodeType,
  CameraView,
  useCameraPermissions,
} from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const flowState = require('../core/flowState');

const BARCODE_TYPES: BarcodeType[] = [
  'qr',
  'ean13',
  'ean8',
  'code128',
  'code39',
  'codabar',
  'upc_a',
  'upc_e',
  'itf14',
  'pdf417',
  'aztec',
  'datamatrix',
  'code93',
];

export default function ScanScreen() {
  const navigation = useNavigation();
  const [permission, requestPermission] = useCameraPermissions();
  const scannedRef = useRef(false);
  const [active, setActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      scannedRef.current = false;
      setActive(true);
    }, []),
  );

  const handleScan = useCallback(
    (result: BarcodeScanningResult) => {
      if (scannedRef.current) return;
      scannedRef.current = true;
      setActive(false);
      setTimeout(() => {
        const raw = result.data?.trim() || '';
        const isInvalid =
          raw.length < 4 ||
          raw.includes('://') ||
          raw.toLowerCase().includes('http') ||
          raw.toLowerCase().includes('expo');

        if (isInvalid) {
          scannedRef.current = false;
          setActive(true);
          setError('Invalid barcode');
          return;
        }

        const scannedCode = raw;
        const scannedItem = { barcode: scannedCode };
        flowState.setItem(scannedItem);
        navigation.navigate('Action' as never);
      }, 0);
    },
    [navigation],
  );

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>ScanScreen</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>ScanScreen</Text>
        <Text style={styles.label}>Camera access is needed to scan.</Text>
        <Pressable onPress={() => void requestPermission()}>
          <Text style={styles.label}>Grant permission</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.fill}>
      {error && (
        <View style={{ position: 'absolute', top: 100, alignSelf: 'center' }}>
          <Text style={{ color: 'red', fontSize: 16 }}>{error}</Text>
        </View>
      )}
      {active && (
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          onBarcodeScanned={handleScan}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 18,
    color: '#ffffff',
  },
});
