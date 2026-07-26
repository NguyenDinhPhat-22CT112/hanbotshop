import type { ProductAvailability } from '@hanbotorder/types';

export type ProductCardModel = {
  id: string;
  name: string;
  slug: string;
  studio: string;
  price: string;
  depositPrice?: string;
  compareAtPrice?: string;
  status: ProductAvailability;
  paymentRequirement: 'FULL' | 'DEPOSIT';
  depositPercent: number;
  trackInventory: boolean;
  inventoryQuantity: number;
  imageTone: string;
  imageUrl?: string;
  images?: string[];
  description: string;
  category: string;
  tags?: string[];
  tagLinks?: Array<{ name: string; slug: string }>;
  variants?: Array<{
    id: string;
    name: string;
    price: string | null;
    isActive: boolean;
    trackInventory: boolean;
    inventoryQuantity: number;
  }>;
};

export type TimelineItem = {
  title: string;
  note: string;
  time: string;
  done: boolean;
};

export type AccountOrderModel = {
  number: string;
  status: string;
  payment: string;
  total: string;
  placedAt: string;
  estimate: string;
  contact: string;
  shippingAddress: string;
  items: {
    name: string;
    quantity: number;
    price: string;
  }[];
  timeline: TimelineItem[];
};
