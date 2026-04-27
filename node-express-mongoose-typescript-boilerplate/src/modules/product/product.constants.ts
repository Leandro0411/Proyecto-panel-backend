export const PRODUCT_CATEGORIES = [
  'indumentaria',
  'tecnologia',
  'accesorios',
  'electrodomesticos',
  'accesorios para autos',
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];
