/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Supplier, Outlet, SupplyRecord, SupplyItem } from '../types';
import { 
  Plus, 
  Trash2, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  FileText, 
  Calendar, 
  AlertCircle,
  Tag,
  CheckCircle,
  Clock,
  ExternalLink
} from 'lucide-react';

interface SuppliesTabProps {
  activeSupplier: Supplier | null;
  outlets: Outlet[];
  supplies: SupplyRecord[];
  onAddSupply: (record: Omit<SupplyRecord, 'id' | 'createdAt'>) => void;
  onUpdateSupplyStatus: (id: string, status: 'pending' | 'partial' | 'paid') => void;
  onDeleteSupply: (id: string) => void;
  onAddOutlet: (name: string, phone: string) => void;
}

export default function SuppliesTab({
  activeSupplier,
  outlets,
  supplies,
  onAddSupply,
  onUpdateSupplyStatus,
  onDeleteSupply,
  onAddOutlet,
}: SuppliesTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOutletFilter, setSelectedOutletFilter] = useState('');
  const [expandedRecord, setExpandedRecord] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Inline Outlet Form State
  const [addOutletInlineOpen, setAddOutletInlineOpen] = useState(false);
  const [inlineOutletName, setInlineOutletName] = useState('');
  const [inlineOutletPhone, setInlineOutletPhone] = useState('');
  const [inlineError, setInlineError] = useState('');
  const [shouldAutoSelectLatest, setShouldAutoSelectLatest] = useState(false);

  React.useEffect(() => {
    if (shouldAutoSelectLatest && activeSupplier) {
      const activeOutlets = outlets.filter(o => o.supplierId === activeSupplier.id);
      if (activeOutlets.length > 0) {
        // Sort by id which has timestamp to find the latest
        const sorted = [...activeOutlets].sort((a, b) => b.id.localeCompare(a.id));
        if (sorted[0]) {
          setOutletId(sorted[0].id);
        }
        setShouldAutoSelectLatest(false);
        setAddOutletInlineOpen(false);
        setInlineOutletName('');
        setInlineOutletPhone('');
        setInlineError('');
      }
    }
  }, [outlets, shouldAutoSelectLatest, activeSupplier]);

  // Form Fields for new Supply Record
  const [outletId, setOutletId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'pending' | 'partial' | 'paid'>('pending');

  // Supply Amount State
  const [amount, setAmount] = useState('');
  const [formError, setFormError] = useState('');

  // Calculations for current form
  const formGrandTotal = useMemo(() => {
    return parseFloat(amount) || 0;
  }, [amount]);

  // Filter supplies for active supplier
  const filteredSupplies = useMemo(() => {
    return supplies
      .filter((s) => {
        const matchesSupplier = s.supplierId === activeSupplier?.id;
        const matchesOutlet = selectedOutletFilter ? s.outletId === selectedOutletFilter : true;
        
        const outletName = outlets.find(o => o.id === s.outletId)?.name || '';
        const matchesSearch = 
          s.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          outletName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.notes.toLowerCase().includes(searchQuery.toLowerCase());

        return matchesSupplier && matchesOutlet && matchesSearch;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [supplies, activeSupplier, selectedOutletFilter, searchQuery, outlets]);

  const toggleExpand = (id: string) => {
    setExpandedRecord(expandedRecord === id ? null : id);
  };

  // Generate a random-looking invoice number
  const handleSuggestInvoice = () => {
    const prefix = activeSupplier?.name.split(' ').map(w => w[0]).join('').toUpperCase() || 'INV';
    const num = Math.floor(1000 + Math.random() * 9000);
    setInvoiceNumber(`INV-${prefix}-${num}`);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!outletId) {
      setFormError('Please select a retail outlet');
      return;
    }
    if (!invoiceNumber.trim()) {
      setFormError('Invoice / Reference Number is required');
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError('Please enter a valid supply amount greater than 0');
      return;
    }

    // Assign a single generic supply item representing the amount
    const finalItems: SupplyItem[] = [
      {
        id: `form-item-${Date.now()}-0`,
        name: 'Supply Dispatch',
        price: parsedAmount,
        qty: 1,
        total: parsedAmount,
      }
    ];

    onAddSupply({
      supplierId: activeSupplier!.id,
      outletId,
      date,
      invoiceNumber,
      items: finalItems,
      totalAmount: parsedAmount,
      status,
      notes,
    });

    // Reset Form
    setOutletId('');
    setDate(new Date().toISOString().split('T')[0]);
    setInvoiceNumber('');
    setNotes('');
    setStatus('pending');
    setAmount('');
    setFormError('');
    setModalOpen(false);
  };

  if (!activeSupplier) {
    return null;
  }

  const supplierOutlets = outlets.filter(o => o.supplierId === activeSupplier.id);

  return (
    <div className="space-y-6" id="supplies-tab-content">
      {/* Header and Add Button */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-600" />
            <span>Document Supplies Made Out</span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Log dispatch of inventory, invoices, and payment statuses for separate accounts.
          </p>
        </div>
        <button
          id="btn-new-supply"
          onClick={() => {
            handleSuggestInvoice();
            setModalOpen(true);
          }}
          className="inline-flex items-center justify-center space-x-2 px-4.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors shadow-xs cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Record Supply Dispatch</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by invoice number, notes, or buyer..."
            className="w-full pl-11 pr-4 py-2.5 border border-slate-200 bg-white rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-sm"
          />
        </div>

        <div>
          <select
            value={selectedOutletFilter}
            onChange={(e) => setSelectedOutletFilter(e.target.value)}
            className="w-full px-3 py-2.5 border border-slate-200 bg-white rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-sm cursor-pointer"
          >
            <option value="">All Outlets</option>
            {supplierOutlets.map(o => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Supplies list table/cards */}
      {filteredSupplies.length === 0 ? (
        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center text-slate-500">
          <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-700">No supplies logged yet</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Click the &quot;Record Supply Dispatch&quot; button to document your first shipment item by item.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                  <th className="px-6 py-4 w-10"></th>
                  <th className="px-6 py-4">Invoice #</th>
                  <th className="px-6 py-4">Retail Outlet / Buyer</th>
                  <th className="px-6 py-4">Delivery Date</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Invoice Value</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredSupplies.map((record) => {
                  const outlet = outlets.find(o => o.id === record.outletId);
                  const isExpanded = expandedRecord === record.id;
                  
                  return (
                    <React.Fragment key={record.id}>
                      <tr 
                        className={`hover:bg-slate-50/70 transition-colors cursor-pointer ${isExpanded ? 'bg-indigo-50/10' : ''}`}
                        onClick={() => toggleExpand(record.id)}
                        id={`supply-row-${record.id}`}
                      >
                        <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <button 
                            onClick={() => toggleExpand(record.id)}
                            className="text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-slate-800">
                          {record.invoiceNumber}
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-semibold text-slate-900">{outlet?.name || 'Unknown Outlet'}</span>
                          <span className="block text-xs text-slate-400">{outlet?.phone}</span>
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-500">
                          {record.date}
                        </td>
                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                          {/* Quick inline status switch */}
                          <select
                            value={record.status}
                            onChange={(e) => onUpdateSupplyStatus(record.id, e.target.value as any)}
                            className={`px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wide cursor-pointer focus:outline-hidden ${
                              record.status === 'paid' 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                : record.status === 'partial'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            <option value="pending">Pending</option>
                            <option value="partial">Partial</option>
                            <option value="paid">Paid</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-slate-800">
                          ₦{record.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => onDeleteSupply(record.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>

                      {/* Expandable Packing List Detail Row */}
                      {isExpanded && (
                        <tr className="bg-slate-50/50">
                          <td colSpan={7} className="px-12 py-5 border-t border-b border-slate-200">
                            <div className="space-y-4">
                              <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-2.5">
                                <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                  <Tag className="h-4 w-4 text-indigo-500" />
                                  <span>Itemized Packing List</span>
                                </span>
                                {record.notes && (
                                  <span className="text-xs text-slate-500 mt-1 md:mt-0 italic">
                                    &ldquo;{record.notes}&rdquo;
                                  </span>
                                )}
                              </div>

                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs text-slate-600">
                                  <thead>
                                    <tr className="border-b border-slate-200 font-bold text-slate-400">
                                      <th className="py-2">Item / Description</th>
                                      <th className="py-2 text-right">Unit Price</th>
                                      <th className="py-2 text-center w-24">Quantity</th>
                                      <th className="py-2 text-right w-32">Total</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 font-medium">
                                    {record.items.map((item) => (
                                      <tr key={item.id}>
                                        <td className="py-2.5 text-slate-800">{item.name}</td>
                                        <td className="py-2.5 text-right font-mono">₦{item.price.toFixed(2)}</td>
                                        <td className="py-2.5 text-center font-mono">{item.qty}</td>
                                        <td className="py-2.5 text-right font-bold text-slate-900 font-mono">₦{item.total.toFixed(2)}</td>
                                      </tr>
                                    ))}
                                    <tr className="font-bold border-t border-slate-200 text-slate-800 text-sm">
                                      <td colSpan={3} className="py-3 text-right">Grand Total:</td>
                                      <td className="py-3 text-right font-mono text-indigo-700">₦{record.totalAmount.toFixed(2)}</td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Record Supply Dispatch Modal */}
      {modalOpen && (
        <div id="supply-modal" className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-100 overflow-hidden transform transition-all my-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">Document Supply Made Out</h3>
              <button 
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-xl cursor-pointer"
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handleFormSubmit} className="p-6 space-y-5">
              {formError && (
                <div className="flex items-center space-x-2 text-sm text-rose-600 bg-rose-50 p-3 rounded-lg border border-rose-100">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Select Retail Outlet / Buyer *
                    </label>
                    <button
                      type="button"
                      onClick={() => setAddOutletInlineOpen(!addOutletInlineOpen)}
                      className="text-[10px] sm:text-xs text-indigo-600 hover:text-indigo-800 font-bold hover:underline cursor-pointer"
                    >
                      {addOutletInlineOpen ? 'Cancel' : '➕ Add New'}
                    </button>
                  </div>
                  <select
                    required
                    value={outletId}
                    onChange={(e) => setOutletId(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm cursor-pointer"
                  >
                    <option value="">-- Choose Buyer Outlet --</option>
                    {supplierOutlets.map(o => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </select>

                  {addOutletInlineOpen && (
                    <div className="mt-2.5 p-3 bg-indigo-50/50 border border-indigo-100 rounded-lg space-y-2 animate-in slide-in-from-top-1 duration-150">
                      <p className="text-[11px] font-bold text-indigo-900">Add Outlet Inline</p>
                      {inlineError && (
                        <p className="text-[10px] text-rose-600 font-medium">{inlineError}</p>
                      )}
                      <div className="space-y-1.5">
                        <input
                          type="text"
                          placeholder="Outlet / Buyer Name"
                          value={inlineOutletName}
                          onChange={(e) => setInlineOutletName(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                        />
                        <input
                          type="text"
                          placeholder="Contact Phone (Optional)"
                          value={inlineOutletPhone}
                          onChange={(e) => setInlineOutletPhone(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!inlineOutletName.trim()) {
                              setInlineError('Name is required');
                              return;
                            }
                            setInlineError('');
                            setShouldAutoSelectLatest(true);
                            onAddOutlet(inlineOutletName.trim(), inlineOutletPhone.trim());
                          }}
                          className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-semibold cursor-pointer transition-colors"
                        >
                          Save & Select Outlet
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                    Invoice / Reference Number *
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      required
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      placeholder="INV-XXXX"
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-mono uppercase"
                    />
                    <button
                      type="button"
                      onClick={handleSuggestInvoice}
                      className="px-3 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-lg text-xs font-medium cursor-pointer"
                    >
                      Regen
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                    Dispatch Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                    Payment Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm cursor-pointer"
                  >
                    <option value="pending">🚫 Pending (Unpaid)</option>
                    <option value="partial">⏳ Partially Paid</option>
                    <option value="paid">✅ Fully Paid</option>
                  </select>
                </div>
              </div>

              {/* Supply Amount field */}
              <div className="border-t border-slate-100 pt-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                    Supply Amount (₦) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter total supply value, e.g. 50000"
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Dispatch Notes / Delivery Remarks
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Mention quality check details, delivery driver name, or special instructions..."
                  rows={2}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm resize-none"
                />
              </div>

              <div className="bg-slate-50 border-t border-slate-100 p-4 -mx-6 -mb-6 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-500 block uppercase">Grand Total Amount</span>
                  <span className="text-lg font-extrabold text-slate-900 font-mono">₦{formGrandTotal.toFixed(2)}</span>
                </div>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm cursor-pointer"
                  >
                    Post Supply Record
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
