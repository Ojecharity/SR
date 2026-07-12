/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Supplier, Outlet, SupplyRecord, PaymentRecord, Transaction } from '../types';
import { 
  BookOpen, 
  Search, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Filter, 
  Printer, 
  Calendar, 
  FileSpreadsheet,
  AlertCircle,
  Trash2
} from 'lucide-react';

interface LedgerTabProps {
  activeSupplier: Supplier | null;
  outlets: Outlet[];
  supplies: SupplyRecord[];
  payments: PaymentRecord[];
  selectedOutletId: string;
  onSelectOutletId: (id: string) => void;
  onDeleteSupply: (id: string) => void;
  onDeletePayment: (id: string) => void;
}

export default function LedgerTab({
  activeSupplier,
  outlets,
  supplies,
  payments,
  selectedOutletId,
  onSelectOutletId,
  onDeleteSupply,
  onDeletePayment,
}: LedgerTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'supply' | 'payment'>('all');

  // Filter outlets under active supplier
  const supplierOutlets = useMemo(() => {
    return outlets.filter(o => o.supplierId === activeSupplier?.id);
  }, [outlets, activeSupplier]);

  // Transform supplies and payments into uniform transactions
  const allTransactions = useMemo(() => {
    if (!activeSupplier) return [];

    const supplierSupplies = supplies.filter(s => s.supplierId === activeSupplier.id);
    const supplierPayments = payments.filter(p => p.supplierId === activeSupplier.id);

    const txs: Transaction[] = [
      ...supplierSupplies.map(s => ({
        id: s.id,
        type: 'supply' as const,
        date: s.date,
        reference: s.invoiceNumber,
        description: `Delivered supply items (Packing invoice total)`,
        amount: s.totalAmount, // Increases outstanding debt
        outletId: s.outletId,
        rawRecord: s,
      })),
      ...supplierPayments.map(p => ({
        id: p.id,
        type: 'payment' as const,
        date: p.date,
        reference: p.referenceNumber || 'N/A',
        description: `Received payment (${p.paymentMethod.toUpperCase()})`,
        amount: p.amount, // Decreases outstanding debt
        outletId: p.outletId,
        rawRecord: p,
      })),
    ];

    return txs;
  }, [activeSupplier, supplies, payments]);

  // Calculate chronological statement for SPECIFIC OUTLET with running balance
  const processedStatement = useMemo(() => {
    if (!selectedOutletId) {
      // Return general list (unsorted/newest first, no running balance needed across different outlets)
      return {
        transactions: allTransactions
          .filter(t => {
            const matchesType = typeFilter === 'all' || t.type === typeFilter;
            const matchesStart = startDate ? t.date >= startDate : true;
            const matchesEnd = endDate ? t.date <= endDate : true;
            
            const outletName = outlets.find(o => o.id === t.outletId)?.name || '';
            const matchesSearch = 
              t.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
              t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
              outletName.toLowerCase().includes(searchQuery.toLowerCase());

            return matchesType && matchesStart && matchesEnd && matchesSearch;
          })
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        summary: { totalSupplies: 0, totalPayments: 0, endingBalance: 0 }
      };
    }

    // Filter transactions for specific outlet
    const outletTxs = allTransactions.filter(t => t.outletId === selectedOutletId);

    // Sort OLDEST first to compute running balance correctly
    const chronologicalTxs = [...outletTxs].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    let balanceAccumulator = 0;
    const computedTxs = chronologicalTxs.map(t => {
      if (t.type === 'supply') {
        balanceAccumulator += t.amount;
      } else {
        balanceAccumulator -= t.amount;
      }

      return {
        ...t,
        runningBalance: balanceAccumulator,
      };
    });

    // For rendering, usually statement shows newest first, but running balances correspond to oldest-to-newest math
    // Let's reverse it back for "newest first" view, or keep chronological. Statements usually look great chronological or reverse. Let's do newest first!
    const filteredAndComputed = computedTxs
      .filter(t => {
        const matchesType = typeFilter === 'all' || t.type === typeFilter;
        const matchesStart = startDate ? t.date >= startDate : true;
        const matchesEnd = endDate ? t.date <= endDate : true;
        const matchesSearch = 
          t.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.description.toLowerCase().includes(searchQuery.toLowerCase());

        return matchesType && matchesStart && matchesEnd && matchesSearch;
      })
      .reverse();

    const totalSupplies = outletTxs.filter(t => t.type === 'supply').reduce((sum, t) => sum + t.amount, 0);
    const totalPayments = outletTxs.filter(t => t.type === 'payment').reduce((sum, t) => sum + t.amount, 0);
    const endingBalance = totalSupplies - totalPayments;

    return {
      transactions: filteredAndComputed,
      summary: { totalSupplies, totalPayments, endingBalance }
    };
  }, [allTransactions, selectedOutletId, typeFilter, startDate, endDate, searchQuery, outlets]);

  const handlePrint = () => {
    window.print();
  };

  const handleCSVExport = () => {
    if (processedStatement.transactions.length === 0) return;
    
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Date,Type,Reference,Outlet,Description,Amount,Running Balance\n';
    
    processedStatement.transactions.forEach(t => {
      const outletName = outlets.find(o => o.id === t.outletId)?.name || 'Unknown';
      const balanceVal = 'runningBalance' in t ? (t as any).runningBalance : '';
      const row = `"${t.date}","${t.type.toUpperCase()}","${t.reference}","${outletName}","${t.description}",${t.amount},${balanceVal}`;
      csvContent += row + '\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `statement_${selectedOutletId ? 'outlet_' + selectedOutletId : 'general'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!activeSupplier) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-150" id="ledger-tab-content">
      {/* Header and Print/Export controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-indigo-600" />
            <span>General Ledger & Audit Trail</span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Running transactions book. Select a retail outlet to generate an official Statement of Account.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleCSVExport}
            disabled={processedStatement.transactions.length === 0}
            className="inline-flex items-center justify-center space-x-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-xs font-semibold cursor-pointer transition-all border border-slate-200"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center justify-center space-x-2 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold cursor-pointer transition-all shadow-xs"
          >
            <Printer className="h-4 w-4" />
            <span>Print Ledger</span>
          </button>
        </div>
      </div>

      {/* Select Outlet for statement */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
            View Statement For:
          </label>
          <select
            value={selectedOutletId}
            onChange={(e) => onSelectOutletId(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-sm cursor-pointer"
          >
            <option value="">-- All Outlets Ledger Book --</option>
            {supplierOutlets.map(o => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
            Filter Type:
          </label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-sm cursor-pointer"
          >
            <option value="all">All Entries</option>
            <option value="supply">Supplies Made (+) </option>
            <option value="payment">Payments Received (-) </option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
            Start Date:
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
            End Date:
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-sm"
          />
        </div>
      </div>

      {/* Specific Statement Quick Summary Banner */}
      {selectedOutletId && (
        <div className="bg-slate-900 text-white rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-3 gap-4 border border-slate-800" id="statement-summary-banner">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Statement Of Account</span>
            <h4 className="text-lg font-bold truncate">
              {supplierOutlets.find(o => o.id === selectedOutletId)?.name || 'Retail Outlet'}
            </h4>
            <span className="text-xs text-slate-400">Chronological debtor balance</span>
          </div>
          <div className="border-t sm:border-t-0 sm:border-l border-slate-800 pt-3 sm:pt-0 sm:pl-6 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Invoiced</span>
            <div className="text-xl font-bold font-mono">₦{processedStatement.summary.totalSupplies.toFixed(2)}</div>
          </div>
          <div className="border-t sm:border-t-0 sm:border-l border-slate-800 pt-3 sm:pt-0 sm:pl-6 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Outstanding Balance</span>
            <div className={`text-xl font-extrabold font-mono ${processedStatement.summary.endingBalance > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              ₦{processedStatement.summary.endingBalance.toFixed(2)}
            </div>
          </div>
        </div>
      )}

      {/* Main Ledger Book Entry Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {/* Subheader Search inside Table */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reference numbers, methods, or descriptions..."
              className="w-full pl-9 pr-4 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {processedStatement.transactions.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <AlertCircle className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <span>No transactions found matching the filters or query.</span>
            </div>
          ) : (
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                  <th className="px-6 py-3.5">Txn Date</th>
                  <th className="px-6 py-3.5">Reference #</th>
                  <th className="px-6 py-3.5">Buyer Outlet</th>
                  <th className="px-6 py-3.5">Transaction Details</th>
                  <th className="px-6 py-3.5 text-right">Debit (+) / Credit (-)</th>
                  {selectedOutletId && <th className="px-6 py-3.5 text-right">Debtor Balance</th>}
                  <th className="px-6 py-3.5 text-center w-16">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {processedStatement.transactions.map((t) => {
                  const outlet = outlets.find(o => o.id === t.outletId);
                  
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/50 transition-colors" id={`ledger-row-${t.id}`}>
                      <td className="px-6 py-4 text-slate-500 font-medium">
                        {t.date}
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-slate-800 text-xs">
                        {t.reference}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-900">{outlet?.name || 'Unknown Outlet'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <span className={`p-1 rounded-md ${
                            t.type === 'supply' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'
                          }`}>
                            {t.type === 'supply' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownLeft className="h-3 w-3" />}
                          </span>
                          <span className="text-xs text-slate-600">{t.description}</span>
                        </div>
                      </td>
                      <td className={`px-6 py-4 text-right font-bold font-mono ${
                        t.type === 'supply' ? 'text-slate-950' : 'text-emerald-600'
                      }`}>
                        {t.type === 'supply' ? '+' : '-'}₦{t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      {selectedOutletId && 'runningBalance' in t && (
                        <td className="px-6 py-4 text-right font-extrabold font-mono text-slate-900">
                          ₦{(t as any).runningBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                      )}
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => {
                            if (t.type === 'supply') {
                              onDeleteSupply(t.id);
                            } else {
                              onDeletePayment(t.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title={`Delete ${t.type === 'supply' ? 'Supply' : 'Payment'} record`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
