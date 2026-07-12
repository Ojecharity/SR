/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { Supplier, Outlet, SupplyRecord, PaymentRecord } from '../types';
import { 
  TrendingUp, 
  TrendingDown, 
  CreditCard, 
  Users, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Calendar,
  AlertCircle,
  Building2
} from 'lucide-react';

interface DashboardOverviewProps {
  activeSupplier: Supplier | null;
  outlets: Outlet[];
  supplies: SupplyRecord[];
  payments: PaymentRecord[];
  onNavigateToTab: (tab: string) => void;
  onSelectOutletForStatement: (outletId: string) => void;
}

export default function DashboardOverview({
  activeSupplier,
  outlets,
  supplies,
  payments,
  onNavigateToTab,
  onSelectOutletForStatement,
}: DashboardOverviewProps) {
  // 1. Calculations
  const stats = useMemo(() => {
    const supplierSupplies = supplies.filter(s => s.supplierId === activeSupplier?.id);
    const supplierPayments = payments.filter(p => p.supplierId === activeSupplier?.id);

    const totalSupplied = supplierSupplies.reduce((sum, item) => sum + item.totalAmount, 0);
    const totalPaid = supplierPayments.reduce((sum, item) => sum + item.amount, 0);
    const totalOutstanding = totalSupplied - totalPaid;
    const activeOutlets = outlets.filter(o => o.supplierId === activeSupplier?.id);

    return {
      totalSupplied,
      totalPaid,
      totalOutstanding,
      outletsCount: activeOutlets.length,
      suppliesCount: supplierSupplies.length,
      paymentsCount: supplierPayments.length,
    };
  }, [activeSupplier, outlets, supplies, payments]);

  // 2. Outlet breakdown calculations
  const outletsBreakdown = useMemo(() => {
    const activeOutlets = outlets.filter(o => o.supplierId === activeSupplier?.id);
    return activeOutlets.map(outlet => {
      const outletSupplies = supplies.filter(s => s.supplierId === activeSupplier?.id && s.outletId === outlet.id);
      const outletPayments = payments.filter(p => p.supplierId === activeSupplier?.id && p.outletId === outlet.id);

      const suppliedVal = outletSupplies.reduce((sum, item) => sum + item.totalAmount, 0);
      const paidVal = outletPayments.reduce((sum, item) => sum + item.amount, 0);
      const balance = suppliedVal - paidVal;

      return {
        id: outlet.id,
        name: outlet.name,
        phone: outlet.phone,
        supplied: suppliedVal,
        paid: paidVal,
        balance: balance,
      };
    });
  }, [activeSupplier, outlets, supplies, payments]);

  // 3. Combined Recent History Log
  const recentActivities = useMemo(() => {
    const supplierSupplies = supplies.filter(s => s.supplierId === activeSupplier?.id);
    const supplierPayments = payments.filter(p => p.supplierId === activeSupplier?.id);

    const merged = [
      ...supplierSupplies.map(s => ({
        id: s.id,
        type: 'supply' as const,
        date: s.date,
        amount: s.totalAmount,
        title: `Supply to ${outlets.find(o => o.id === s.outletId)?.name || 'Unknown Outlet'}`,
        subtitle: `Inv: ${s.invoiceNumber}`,
        createdAt: s.createdAt,
      })),
      ...supplierPayments.map(p => ({
        id: p.id,
        type: 'payment' as const,
        date: p.date,
        amount: p.amount,
        title: `Payment from ${outlets.find(o => o.id === p.outletId)?.name || 'Unknown Outlet'}`,
        subtitle: `Method: ${p.paymentMethod.toUpperCase()} (${p.referenceNumber || 'N/A'})`,
        createdAt: p.createdAt,
      })),
    ];

    return merged
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [activeSupplier, outlets, supplies, payments]);

  if (!activeSupplier) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <Building2 className="h-16 w-16 text-slate-300 mb-4 stroke-1 animate-pulse" />
        <h2 className="text-xl font-semibold text-slate-800">No Supplier Selected</h2>
        <p className="text-slate-500 max-w-sm mt-2">
          Select an existing supplier profile from the top dropdown or register a new one to begin tracking records.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="dashboard-tab-content">
      {/* Top Welcome Card */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-6 shadow-xs relative overflow-hidden">
        <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-x-10 translate-y-10">
          <Building2 className="h-64 w-64" />
        </div>
        <div className="relative z-10 space-y-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/30 text-indigo-200 border border-indigo-400/20">
            Active Supplier Profile
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">{activeSupplier.name}</h1>
          <p className="text-indigo-200/80 max-w-2xl text-sm leading-relaxed">
            Manage your outlets, record bulk product supplies, track payment collection, and view clean outstanding balance audits.
          </p>
          <div className="pt-2 flex flex-wrap gap-x-6 gap-y-2 text-xs text-indigo-300">
            {activeSupplier.phone && <span>📞 {activeSupplier.phone}</span>}
            {activeSupplier.email && <span>✉️ {activeSupplier.email}</span>}
            {activeSupplier.address && <span className="truncate max-w-xs md:max-w-md">📍 {activeSupplier.address}</span>}
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between" id="kpi-total-supplied">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Supplies Made</span>
            <div className="text-2xl font-bold text-slate-900">₦{stats.totalSupplied.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            <div className="flex items-center text-xs text-emerald-600 space-x-1">
              <ArrowUpRight className="h-3 w-3" />
              <span>{stats.suppliesCount} supply records</span>
            </div>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <TrendingUp className="h-6 w-6" />
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between" id="kpi-total-paid">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Payments In</span>
            <div className="text-2xl font-bold text-slate-900">₦{stats.totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            <div className="flex items-center text-xs text-emerald-600 space-x-1">
              <ArrowDownLeft className="h-3 w-3" />
              <span>{stats.paymentsCount} payments logged</span>
            </div>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CreditCard className="h-6 w-6" />
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between" id="kpi-total-outstanding">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Outstanding</span>
            <div className={`text-2xl font-bold ${stats.totalOutstanding > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
              ₦{stats.totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="flex items-center text-xs text-slate-500 space-x-1">
              <span>Overall unpaid dues</span>
            </div>
          </div>
          <div className={`p-3 rounded-xl ${stats.totalOutstanding > 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-600'}`}>
            <TrendingDown className="h-6 w-6" />
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between" id="kpi-active-outlets">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Outlets</span>
            <div className="text-2xl font-bold text-slate-900">{stats.outletsCount}</div>
            <div className="flex items-center text-xs text-slate-500 space-x-1">
              <span>Assigned buyers</span>
            </div>
          </div>
          <div className="p-3 bg-sky-50 text-sky-600 rounded-xl">
            <Users className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Main Content Grid: Outlet Ledger Summary vs Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Outlets Ledger Grid */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800 text-base">Outlets Balance Ledger</h3>
              <p className="text-xs text-slate-500">Chronological summarized balances</p>
            </div>
            <button
              onClick={() => onNavigateToTab('outlets')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
            >
              Manage Outlets &rarr;
            </button>
          </div>

          <div className="overflow-x-auto">
            {outletsBreakdown.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                No outlets registered for this supplier.
                <button
                  onClick={() => onNavigateToTab('outlets')}
                  className="block mx-auto mt-2 text-indigo-600 font-semibold text-sm hover:underline cursor-pointer"
                >
                  Add your first Outlet now
                </button>
              </div>
            ) : (
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                    <th className="px-6 py-3">Outlet Name</th>
                    <th className="px-6 py-3">Supplied</th>
                    <th className="px-6 py-3">Paid To Date</th>
                    <th className="px-6 py-3 text-right">Balance Due</th>
                    <th className="px-6 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {outletsBreakdown.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3.5">
                        <span className="font-semibold text-slate-800">{row.name}</span>
                        <span className="block text-xs text-slate-500">{row.phone}</span>
                      </td>
                      <td className="px-6 py-3.5 text-slate-600">
                        ₦{row.supplied.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-3.5 text-emerald-600">
                        ₦{row.paid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <span className={`px-2.5 py-1 rounded-md text-sm font-bold ${
                          row.balance > 0 ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          ₦{row.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-center">
                        <button
                          onClick={() => {
                            onSelectOutletForStatement(row.id);
                            onNavigateToTab('ledger');
                          }}
                          className="px-3 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors cursor-pointer"
                        >
                          View Ledger
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Recent Activities */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
            <h3 className="font-bold text-slate-800 text-base">Recent Activities</h3>
            <p className="text-xs text-slate-500">Latest recorded transactions</p>
          </div>

          <div className="p-4 flex-1 divide-y divide-slate-100">
            {recentActivities.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 py-12">
                <AlertCircle className="h-8 w-8 text-slate-300 mb-2" />
                <span className="text-xs">No transactions recorded yet</span>
              </div>
            ) : (
              recentActivities.map((act) => (
                <div key={act.id} className="py-3 flex items-start justify-between">
                  <div className="flex space-x-3">
                    <div className={`p-2 rounded-lg mt-0.5 ${
                      act.type === 'supply' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'
                    }`}>
                      {act.type === 'supply' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownLeft className="h-4 w-4" />}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-800 line-clamp-1">{act.title}</div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">{act.subtitle}</div>
                      <div className="text-[10px] text-slate-400 mt-1">{act.date}</div>
                    </div>
                  </div>
                  <div className={`text-sm font-bold ${
                    act.type === 'supply' ? 'text-slate-900' : 'text-emerald-600'
                  }`}>
                    {act.type === 'supply' ? '+' : '-'}₦{act.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
