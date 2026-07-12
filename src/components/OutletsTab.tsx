/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Supplier, Outlet, SupplyRecord, PaymentRecord } from '../types';
import { 
  Users, 
  Plus, 
  Search, 
  MapPin, 
  Phone, 
  Mail, 
  User, 
  Edit2, 
  Trash2, 
  AlertCircle,
  TrendingUp,
  CreditCard,
  FileText
} from 'lucide-react';

interface OutletsTabProps {
  activeSupplier: Supplier | null;
  outlets: Outlet[];
  supplies: SupplyRecord[];
  payments: PaymentRecord[];
  onAddOutlet: (name: string, phone: string) => void;
  onUpdateOutlet: (id: string, name: string, phone: string) => void;
  onDeleteOutlet: (id: string) => void;
  onSelectOutletForStatement: (outletId: string) => void;
  onNavigateToTab: (tab: string) => void;
}

export default function OutletsTab({
  activeSupplier,
  outlets,
  supplies,
  payments,
  onAddOutlet,
  onUpdateOutlet,
  onDeleteOutlet,
  onSelectOutletForStatement,
  onNavigateToTab,
}: OutletsTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingOutlet, setEditingOutlet] = useState<Outlet | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  // Handle Edit Initialization
  const startEdit = (outlet: Outlet) => {
    setEditingOutlet(outlet);
    setName(outlet.name);
    setPhone(outlet.phone);
    setError('');
    setModalOpen(true);
  };

  // Handle Create Initialization
  const startCreate = () => {
    setEditingOutlet(null);
    setName('');
    setPhone('');
    setError('');
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Outlet name is required');
      return;
    }

    if (editingOutlet) {
      onUpdateOutlet(editingOutlet.id, name, phone);
    } else {
      onAddOutlet(name, phone);
    }

    setModalOpen(false);
  };

  // Filter Outlets by active supplier AND search query
  const filteredOutlets = useMemo(() => {
    return outlets.filter((out) => {
      const matchesSupplier = out.supplierId === activeSupplier?.id;
      const matchesSearch = 
        out.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        out.phone.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSupplier && matchesSearch;
    });
  }, [outlets, activeSupplier, searchQuery]);

  // Balance & aggregate values calculated on the fly
  const outletMetrics = useMemo(() => {
    const metrics: { [id: string]: { totalSupplied: number; totalPaid: number; balance: number } } = {};
    
    outlets.forEach(out => {
      const outSupplies = supplies.filter(s => s.supplierId === activeSupplier?.id && s.outletId === out.id);
      const outPayments = payments.filter(p => p.supplierId === activeSupplier?.id && p.outletId === out.id);

      const totalSupplied = outSupplies.reduce((sum, item) => sum + item.totalAmount, 0);
      const totalPaid = outPayments.reduce((sum, item) => sum + item.amount, 0);
      const balance = totalSupplied - totalPaid;

      metrics[out.id] = { totalSupplied, totalPaid, balance };
    });

    return metrics;
  }, [outlets, supplies, payments, activeSupplier]);

  if (!activeSupplier) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Users className="h-16 w-16 text-slate-300 mb-4" />
        <h2 className="text-xl font-semibold text-slate-800">No Supplier Selected</h2>
        <p className="text-slate-500 max-w-sm mt-2">
          Select or add a supplier profile from the top-left switcher to manage outlets.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="outlets-tab-content">
      {/* Header and Add Button */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-600" />
            <span>Retail Outlets & Buyers</span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Manage stores, restaurants, and outlets supplied by <span className="font-semibold text-slate-700">{activeSupplier.name}</span>.
          </p>
        </div>
        <button
          id="btn-add-outlet"
          onClick={startCreate}
          className="inline-flex items-center justify-center space-x-2 px-4.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors shadow-xs cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Outlet</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <input
          id="outlet-search"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by outlet name, contact, phone, or email..."
          className="w-full pl-11 pr-4 py-3 border border-slate-200 bg-white rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
        />
      </div>

      {/* Grid of Outlets */}
      {filteredOutlets.length === 0 ? (
        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center text-slate-500">
          <Users className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-700">No matching outlets found</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Try tweaking your search query or add a brand new outlet profile using the &quot;Add New Outlet&quot; button above.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOutlets.map((outlet) => {
            const metrics = outletMetrics[outlet.id] || { totalSupplied: 0, totalPaid: 0, balance: 0 };
            return (
              <div 
                key={outlet.id} 
                className="bg-white border border-slate-200 rounded-2xl shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                id={`outlet-card-${outlet.id}`}
              >
                {/* Card Header & Contact Profile */}
                <div className="p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1.5 flex-1 min-w-0 pr-2">
                      <h4 className="font-bold text-slate-800 text-base leading-tight truncate">{outlet.name}</h4>
                      {outlet.phone && (
                        <div className="flex items-center text-xs text-slate-500 space-x-1.5 font-medium mt-1">
                          <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>{outlet.phone}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        onClick={() => startEdit(outlet)}
                        title="Edit Profile"
                        className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onDeleteOutlet(outlet.id)}
                        title="Delete Profile"
                        className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Ledger Financial Stats Panel */}
                <div className="bg-slate-50 border-t border-slate-100 p-4 rounded-b-2xl">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-white px-2 py-1.5 rounded-lg border border-slate-100">
                      <div className="text-[10px] font-semibold text-slate-500 uppercase">Supplied</div>
                      <div className="text-xs font-bold text-slate-800 font-mono mt-0.5">
                        ₦{metrics.totalSupplied.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                      </div>
                    </div>
                    <div className="bg-white px-2 py-1.5 rounded-lg border border-slate-100">
                      <div className="text-[10px] font-semibold text-slate-500 uppercase">Paid</div>
                      <div className="text-xs font-bold text-emerald-600 font-mono mt-0.5">
                        ₦{metrics.totalPaid.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                      </div>
                    </div>
                    <div className="bg-white px-2 py-1.5 rounded-lg border border-slate-100">
                      <div className="text-[10px] font-semibold text-slate-500 uppercase">Balance</div>
                      <div className={`text-xs font-bold font-mono mt-0.5 ${metrics.balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        ₦{metrics.balance.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex space-x-2">
                    <button
                      onClick={() => {
                        onSelectOutletForStatement(outlet.id);
                        onNavigateToTab('ledger');
                      }}
                      className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-lg text-center flex items-center justify-center space-x-1.5 shadow-xs cursor-pointer transition-colors"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      <span>Ledger Statement</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Outlet Modal */}
      {modalOpen && (
        <div id="outlet-modal" className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">
                {editingOutlet ? `Edit ${editingOutlet.name}` : 'Add Retail Outlet'}
              </h3>
              <button 
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-xl cursor-pointer"
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="flex items-center space-x-2 text-sm text-rose-600 bg-rose-50 p-3 rounded-lg border border-rose-100">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Outlet / Store Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Corner Grocery Store"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+234 800 000 0000"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                {editingOutlet && (
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteOutlet(editingOutlet.id);
                      setModalOpen(false);
                    }}
                    className="mr-auto px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-sm font-medium transition-colors cursor-pointer flex items-center space-x-1.5"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Delete Outlet</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm cursor-pointer"
                >
                  {editingOutlet ? 'Save Changes' : 'Add Outlet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
