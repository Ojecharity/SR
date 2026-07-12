/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Supplier } from '../types';
import { 
  Building2, 
  Download, 
  Upload, 
  Briefcase,
  LogOut,
  User,
  Plus,
  AlertCircle
} from 'lucide-react';

interface NavbarProps {
  suppliers: Supplier[];
  activeSupplier: Supplier | null;
  onSelectSupplier: (supplier: Supplier) => void;
  onAddSupplier: (name: string, category: string, phone: string, address: string) => void;
  onExportData: () => void;
  onImportData: (data: string) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: any;
  onSignOut: () => void;
}

export default function Navbar({
  suppliers,
  activeSupplier,
  onSelectSupplier,
  onAddSupplier,
  onExportData,
  onImportData,
  activeTab,
  setActiveTab,
  currentUser,
  onSignOut,
}: NavbarProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [newSupName, setNewSupName] = useState('');
  const [newSupCategory, setNewSupCategory] = useState('General Supplier');
  const [newSupPhone, setNewSupPhone] = useState('');
  const [newSupAddress, setNewSupAddress] = useState('');
  const [error, setError] = useState('');

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupName.trim()) {
      setError('Supplier / Business Name is required');
      return;
    }
    onAddSupplier(newSupName.trim(), newSupCategory, newSupPhone, newSupAddress);
    
    // Reset Form State
    setNewSupName('');
    setNewSupCategory('General Supplier');
    setNewSupPhone('');
    setNewSupAddress('');
    setError('');
    setModalOpen(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      onImportData(text);
    };
    reader.readAsText(file);
  };

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-40" id="app-navbar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and Supplier Switcher */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-slate-800">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <Building2 className="h-6 w-6" />
              </div>
              <span className="font-bold text-lg tracking-tight hidden md:block">VendorLedger</span>
            </div>

            <div className="h-6 w-[1px] bg-slate-200 hidden md:block" />

            {/* Active Supplier Switcher (Interactive Dropdown) */}
            <div className="flex items-center space-x-1 bg-indigo-50/55 hover:bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100 text-indigo-900 text-xs sm:text-sm font-semibold shadow-xs relative">
              <Briefcase className="h-4 w-4 text-indigo-600 shrink-0 hidden sm:block" />
              <select
                id="supplier-switcher-select"
                value={activeSupplier?.id || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '__add_new__') {
                    setModalOpen(true);
                  } else {
                    const found = suppliers.find((s) => s.id === val);
                    if (found) onSelectSupplier(found);
                  }
                }}
                className="bg-transparent focus:outline-hidden pr-6 py-0.5 pl-0.5 text-xs font-bold text-indigo-950 border-none cursor-pointer appearance-none shrink-0 max-w-[150px] md:max-w-[260px] select-none"
                style={{
                  backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%234338ca' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`,
                  backgroundPosition: 'right center',
                  backgroundSize: '12px',
                  backgroundRepeat: 'no-repeat',
                }}
              >
                {suppliers.length === 0 && (
                  <option value="" disabled>-- Create a Supplier --</option>
                )}
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id} className="text-slate-800 font-medium bg-white">
                    {s.name}
                  </option>
                ))}
                <option value="__add_new__" className="text-indigo-600 font-bold bg-indigo-50">
                  ➕ Add New Supplier
                </option>
              </select>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="hidden lg:flex items-center space-x-1">
            {[
              { id: 'dashboard', label: 'Dashboard' },
              { id: 'outlets', label: 'Outlets' },
              { id: 'supplies', label: 'Supplies Out' },
              { id: 'payments', label: 'Payments In' },
              { id: 'ledger', label: 'General Ledger' },
            ].map((tab) => (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Export / Backup Controls & User auth actions */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1">
              <button
                id="export-backup-btn"
                onClick={onExportData}
                title="Export JSON Backup"
                className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <Download className="h-5 w-5" />
              </button>
              <label
                htmlFor="import-file"
                title="Import JSON Backup"
                className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer block mb-0"
              >
                <Upload className="h-5 w-5" />
                <input
                  id="import-file"
                  type="file"
                  accept=".json"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>

            {currentUser && (
              <>
                <div className="h-5 w-[1px] bg-slate-200" />
                <div className="flex items-center space-x-3 pl-1">
                  <div className="hidden md:flex flex-col text-right">
                    <span className="text-xs font-bold text-slate-800 leading-tight">
                      {currentUser.displayName || 'Authorized User'}
                    </span>
                    <span className="text-[10px] font-medium text-slate-400">
                      {currentUser.email}
                    </span>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-extrabold shadow-inner" title={currentUser.email}>
                    {currentUser.displayName ? currentUser.displayName[0].toUpperCase() : currentUser.email[0].toUpperCase()}
                  </div>
                  <button
                    onClick={onSignOut}
                    title="Sign Out"
                    className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile view bottom/top tabs if viewport is small */}
      <div className="lg:hidden border-t border-slate-100 bg-slate-50 px-2 py-1.5 flex justify-around items-center">
        {[
          { id: 'dashboard', label: 'Home' },
          { id: 'outlets', label: 'Outlets' },
          { id: 'supplies', label: 'Supplies' },
          { id: 'payments', label: 'Payments' },
          { id: 'ledger', label: 'Ledger' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-2 py-1 rounded-md text-xs font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Add New Supplier Modal Backdrop */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200 text-left">
            {/* Header */}
            <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <Building2 className="h-5 w-5 text-indigo-600" />
                <span>Create New Supplier Profile</span>
              </h3>
              <button 
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>
            
            {/* Form */}
            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              {error && (
                <div className="flex items-center space-x-2 text-sm text-rose-600 bg-rose-50 p-3 rounded-lg border border-rose-100">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Supplier / Business Name *
                </label>
                <input
                  type="text"
                  required
                  value={newSupName}
                  onChange={(e) => setNewSupName(e.target.value)}
                  placeholder="e.g. SugaRush Catering Ltd"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Business Category
                </label>
                <input
                  type="text"
                  value={newSupCategory}
                  onChange={(e) => setNewSupCategory(e.target.value)}
                  placeholder="e.g. Confectionery & Bakery Supplies"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Contact Phone Number
                </label>
                <input
                  type="text"
                  value={newSupPhone}
                  onChange={(e) => setNewSupPhone(e.target.value)}
                  placeholder="e.g. +234 812 345 6789"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Office / Business Address
                </label>
                <textarea
                  value={newSupAddress}
                  onChange={(e) => setNewSupAddress(e.target.value)}
                  placeholder="e.g. 15 Adeniran Ogunsanya St, Surulere, Lagos"
                  rows={2}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-2 px-4 border border-slate-200 text-slate-500 rounded-lg text-sm font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 px-4 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 cursor-pointer"
                >
                  Create Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </nav>
  );
}
