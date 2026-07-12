/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Supplier, Outlet, SupplyRecord, PaymentRecord } from '../types';

export const initialSuppliers: Supplier[] = [
  {
    id: 'sup-1',
    name: 'SUGARUSH CAKES & PARFAIT',
    businessCategory: 'Premium Cakes, Parfaits & Confectioneries',
    phone: '+234 906 993 6428',
    email: 'orders@sugarush.com.ng',
    address: 'Olorunda, Osun, Nigeria',
    createdAt: '2026-05-01T10:00:00Z',
  }
];

export const initialOutlets: Outlet[] = [];

export const initialSupplies: SupplyRecord[] = [];

export const initialPayments: PaymentRecord[] = [];
