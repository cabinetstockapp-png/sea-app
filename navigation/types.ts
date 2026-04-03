export type RootStackParamList = {
  Home: undefined;
  Scan: undefined;
  Assign: { barcode: string };
  ConfirmMove: {
    barcode: string;
    sources: { location: string; qty: number }[];
    toLocation: string;
  };
  Library: undefined;
  ItemDetail: { barcode: string };
};
