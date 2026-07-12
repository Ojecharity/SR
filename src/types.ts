/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Supplier {
  id: string;
  name: string;
  businessCategory: string;
  phone: string;
  email: string;
  address: string;
  createdAt: string;
}

export interface Outlet {
  id: string;
  supplierId: string;
  name: string;
  phone: string;
  createdAt: string;
}

export interface SupplyItem {
  id: string;
  name: string;
  price: number;
  qty: number;
  total: number;
}

export interface SupplyRecord {
  id: string;
  supplierId: string;
  outletId: string;
  date: string;
  invoiceNumber: string;
  items: SupplyItem[];
  totalAmount: number;
  status: 'pending' | 'partial' | 'paid';
  notes: string;
  createdAt: string;
}

export interface PaymentRecord {
  id: string;
  supplierId: string;
  outletId: string;
  date: string;
  amount: number;
  paymentMethod: 'cash' | 'transfer' | 'cheque' | 'pos' | 'other';
  referenceNumber: string;
  notes: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  type: 'supply' | 'payment';
  date: string;
  reference: string;
  description: string;
  amount: number; // For supplies it increases due, for payments it decreases due
  outletId: string;
  rawRecord: SupplyRecord | PaymentRecord;
}
