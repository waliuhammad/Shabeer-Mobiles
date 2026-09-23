/**
 * Shop settings.
 *
 * These are the values that lib/constants.ts currently hard-codes. That
 * file's own comment always intended this: "the editable fields (phone,
 * hours, address) move to a Firestore `settings` document so the owner
 * can change them from the admin panel without a redeploy."
 *
 * ONE IMPORTANT LIMITATION, stated plainly because it would otherwise
 * look like a bug: editing these does NOT change the storefront yet. The
 * footer, contact page and about page are server-rendered and import
 * BUSINESS from lib/constants.ts at build time, while this store lives
 * in one browser's localStorage. Until there is a real database the two
 * cannot meet. What this page IS good for is deciding the correct values
 * and seeing them applied across the admin - then copying them into
 * lib/constants.ts once.
 */
export interface ShopHours {
  days: string;
  time: string;
}

export interface ShopSettings {
  /* ---- identity ---- */
  name: string;
  tagline: string;
  description: string;

  /* ---- contact ---- */
  phone: string;
  phoneDisplay: string;
  /** International format, no +, for wa.me links. */
  whatsapp: string;
  email: string;

  /* ---- address ---- */
  shop: string;
  plaza: string;
  street: string;
  city: string;
  country: string;

  hours: ShopHours[];

  /* ---- trading rules ---- */
  /** Flat delivery charge in rupees. */
  deliveryCharge: number;
  /** Order value at or above which delivery is free. 0 disables it. */
  freeDeliveryThreshold: number;
  /** Default low-stock threshold applied to new products. */
  defaultLowStockThreshold: number;
  /** Printed at the bottom of every counter receipt. */
  receiptFooter: string;
}

export interface SettingsErrors {
  name?: string;
  phone?: string;
  email?: string;
  whatsapp?: string;
  deliveryCharge?: string;
  freeDeliveryThreshold?: string;
  defaultLowStockThreshold?: string;
}
