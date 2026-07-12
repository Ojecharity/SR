/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Supplier, Outlet, PaymentRecord, SupplyRecord } from '../types';
import { 
  CreditCard, 
  Plus, 
  Search, 
  Trash2, 
  Calendar, 
  Coins, 
  FileCheck, 
  AlertCircle,
  Hash,
  HelpCircle
} from 'lucide-react';

interface PaymentsTabProps {
  activeSupplier: Supplier | null;
  outlets: Outlet[];
  payments: PaymentRecord[];
  supplies: SupplyRecord[];
  onAddPayment: (record: Omit<PaymentRecord, 'id' | 'createdAt'>) => void;
  onDeletePayment: (id: string) => void;
  onSetAllPaymentsToZero: () => void;
}

export default function PaymentsTab({
  activeSupplier,
  outlets,
  payments,
  supplies,
  onAddPayment,
  onDeletePayment,
  onSetAllPaymentsToZero,
}: PaymentsTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  // Form Fields
  const [outletId, setOutletId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'cheque' | 'pos' | 'other'>('transfer');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  // Calculate current outstanding for selected outlet in form
  const selectedOutletOutstanding = useMemo(() => {
    if (!outletId) return 0;
    const outSupplies = supplies.filter(s => s.supplierId === activeSupplier?.id && s.outletId === outletId);
    const outPayments = payments.filter(p => p.supplierId === activeSupplier?.id && p.outletId === outletId);

    const totalSupplied = outSupplies.reduce((sum, item) => sum + item.totalAmount, 0);
    const totalPaid = outPayments.reduce((sum, item) => sum + item.amount, 0);
    
    return totalSupplied - totalPaid;
  }, [outletId, supplies, payments, activeSupplier]);

  // Filter payments for active supplier
  const filteredPayments = useMemo(() => {
    return payments
      .filter((p) => {
        const matchesSupplier = p.supplierId === activeSupplier?.id;
        const matchesMethod = methodFilter ? p.paymentMethod === methodFilter : true;
        
        const outletName = outlets.find(o => o.id === p.outletId)?.name || '';
        const matchesSearch = 
          p.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          outletName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.notes.toLowerCase().includes(searchQuery.toLowerCase());

        return matchesSupplier && matchesMethod && matchesSearch;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [payments, activeSupplier, methodFilter, searchQuery, outlets]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!outletId) {
      setFormError('Please select a retail outlet');
      return;
    }
    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      setFormError('Please enter a valid payment amount greater than ₦0');
      return;
    }

    onAddPayment({
      supplierId: activeSupplier!.id,
      outletId,
      date,
      amount: paymentAmount,
      paymentMethod,
      referenceNumber,
      notes,
    });

    // Reset fields
    setOutletId('');
    setDate(new Date().toISOString().split('T')[0]);
    setAmount('');
    setPaymentMethod('transfer');
    setReferenceNumber('');
    setNotes('');
    setFormError('');
    setModalOpen(false);
  };

  const getMethodBadge = (method: string) => {
    switch (method) {
      case 'cash':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'transfer':
        return 'bg-teal-100 text-teal-800 border-teal-200';
      case 'cheque':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'pos':
        return 'bg-sky-100 text-sky-800 border-sky-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  if (!activeSupplier) return null;

  const supplierOutlets = outlets.filter(o => o.supplierId === activeSupplier.id);

  return (
    <div className="space-y-6" id="payments-tab-content">
      {/* Header and Add Button */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-indigo-600" />
            <span>Document Payments Received</span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Log financial deposits, cheque clearances, and credit settlement updates.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {filteredPayments.length > 0 && (
            <button
              id="btn-set-all-payments-zero"
              onClick={() => {
                if (confirm('Are you sure you want to set the amount of all payment records to ₦0.00? This action is irreversible and will reset corresponding invoice statuses.')) {
                  onSetAllPaymentsToZero();
                }
              }}
              className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-sm font-medium transition-colors cursor-pointer"
            >
              <Coins className="h-4 w-4" />
              <span>Set All to Zero</span>
            </button>
          )}
          <button
            id="btn-new-payment"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center justify-center space-x-2 px-4.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Record Payment Receipt</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by txn/cheque reference, notes, or buyer..."
            className="w-full pl-11 pr-4 py-2.5 border border-slate-200 bg-white rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-sm"
          />
        </div>

        <div>
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="w-full px-3 py-2.5 border border-slate-200 bg-white rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-sm cursor-pointer"
          >
            <option value="">All Payment Methods</option>
            <option value="transfer">Bank Transfer</option>
            <option value="cash">Cash Payment</option>
            <option value="cheque">Cheque Cleared</option>
            <option value="pos">POS Terminal</option>
            <option value="other">Other / Custom</option>
          </select>
        </div>
      </div>

      {/* Payments list table */}
      {filteredPayments.length === 0 ? (
        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center text-slate-500">
          <CreditCard className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-700">No payments logged yet</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Click the &quot;Record Payment Receipt&quot; button to document checkouts, deposits, and cash handouts.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                  <th className="px-6 py-4">Transaction / Reference</th>
                  <th className="px-6 py-4">Retail Outlet / Buyer</th>
                  <th className="px-6 py-4">Payment Date</th>
                  <th className="px-6 py-4">Method</th>
                  <th className="px-6 py-4">Notes & Remarks</th>
                  <th className="px-6 py-4 text-right">Amount Received</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredPayments.map((p) => {
                  const outlet = outlets.find(o => o.id === p.outletId);
                  
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors" id={`payment-row-${p.id}`}>
                      <td className="px-6 py-4 font-mono font-bold text-slate-800">
                        {p.referenceNumber || <span className="text-slate-300">N/A</span>}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-900">{outlet?.name || 'Unknown Outlet'}</span>
                        <span className="block text-xs text-slate-400">{outlet?.phone}</span>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-500">
                        {p.date}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 border text-[10px] font-extrabold uppercase rounded-full ${getMethodBadge(p.paymentMethod)}`}>
                          {p.paymentMethod}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 max-w-xs truncate" title={p.notes}>
                        {p.notes || <span className="text-slate-300 italic">No notes</span>}
                      </td>
                      <td className="px-6 py-4 text-right font-extrabold text-emerald-600 font-mono">
                        ₦{p.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => onDeletePayment(p.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Record Payment Receipt Modal */}
      {modalOpen && (
        <div id="payment-modal" className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">Record Payment Receipt</h3>
              <button 
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-xl cursor-pointer"
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="flex items-center space-x-2 text-sm text-rose-600 bg-rose-50 p-3 rounded-lg border border-rose-100">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Outlet selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Select Paying Outlet *
                </label>
                <select
                  required
                  value={outletId}
                  onChange={(e) => setOutletId(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm cursor-pointer"
                >
                  <option value="">-- Choose Outlet --</option>
                  {supplierOutlets.map(o => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </div>

              {/* Outstanding Assist Panel */}
              {outletId && (
                <div className="bg-indigo-50/50 p-3.5 rounded-xl border border-indigo-100 flex items-center justify-between animate-in fade-in duration-200">
                  <div className="flex items-center space-x-2">
                    <Coins className="h-5 w-5 text-indigo-600" />
                    <div>
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Current Outstanding</div>
                      <div className={`text-base font-extrabold ${selectedOutletOutstanding > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        ₦{selectedOutletOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                  {selectedOutletOutstanding > 0 && (
                    <button
                      type="button"
                      onClick={() => setAmount(selectedOutletOutstanding.toString())}
                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                    >
                      Pay Full Debt
                    </button>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                    Amount Received (₦) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                    Payment Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm cursor-pointer"
                  >
                    <option value="transfer">🏦 Bank Transfer</option>
                    <option value="cash">💵 Cash Payment</option>
                    <option value="cheque">✍️ Cheque / Clearing</option>
                    <option value="pos">💳 Credit / POS Card</option>
                    <option value="other">❓ Other / Custom</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                    Reference / Txn ID
                  </label>
                  <input
                    type="text"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    placeholder="e.g. TXN-984729"
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Payment Notes / Reference Details
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Paid into Main Street bank, cheque clearance dated on Friday, etc."
                  rows={2}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm resize-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm cursor-pointer"
                >
                  Post Payment Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
