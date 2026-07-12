/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Supplier } from '../types';
import { 
  Building2, 
  Download, 
  Upload, 
  Briefcase
} from 'lucide-react';

interface NavbarProps {
  suppliers: Supplier[];
  activeSupplier: Supplier | null;
  onSelectSupplier: (supplier: Supplier) => void;
  onExportData: () => void;
  onImportData: (data: string) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Navbar({
  suppliers,
  activeSupplier,
  onSelectSupplier,
  onExportData,
  onImportData,
  activeTab,
  setActiveTab,
}: NavbarProps) {

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

            {/* Active Supplier Brand Label (Static display) */}
            <div className="flex items-center space-x-2 bg-indigo-50/50 px-3.5 py-1.5 rounded-lg border border-indigo-100/80 text-indigo-900 text-sm font-semibold shadow-xs">
              <Briefcase className="h-4 w-4 text-indigo-600 shrink-0" />
              <span className="truncate max-w-[150px] md:max-w-[260px]">
                {activeSupplier ? activeSupplier.name : 'SUGARUSH CAKES & PARFAIT'}
              </span>
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

          {/* Export / Backup Controls */}
          <div className="flex items-center space-x-2">
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
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer block"
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

    </nav>
  );
}
