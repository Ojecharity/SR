/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Supplier, Outlet, SupplyRecord, PaymentRecord } from './types';
import { 
  initialSuppliers, 
  initialOutlets, 
  initialSupplies, 
  initialPayments 
} from './utils/initialData';

// Component Imports
import Navbar from './components/Navbar';
import DashboardOverview from './components/DashboardOverview';
import OutletsTab from './components/OutletsTab';
import SuppliesTab from './components/SuppliesTab';
import PaymentsTab from './components/PaymentsTab';
import LedgerTab from './components/LedgerTab';

// Toast structure
interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export default function App() {
  // 1. Initial State Loading with LocalStorage fallback
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    try {
      const stored = localStorage.getItem('vendor_suppliers');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.some((s: any) => s.id === 'sup-2' || s.name === 'SugaRush Catering Supplies')) {
          localStorage.removeItem('vendor_suppliers');
          localStorage.removeItem('vendor_outlets');
          localStorage.removeItem('vendor_supplies');
          localStorage.removeItem('vendor_payments');
          localStorage.removeItem('vendor_active_supplier_id');
          return initialSuppliers;
        }
        // Migrating phone number and address if they have old values
        let mutated = false;
        const migrated = parsed.map((s: Supplier) => {
          if (s.id === 'sup-1') {
            let updated = { ...s };
            if (s.phone === '+234 803 123 4567') {
              updated.phone = '+234 906 993 6428';
              mutated = true;
            }
            if (s.address === 'Block A3, Suite 12, Lekki Plaza, Lagos, Nigeria') {
              updated.address = 'Olorunda, Osun, Nigeria';
              mutated = true;
            }
            return updated;
          }
          return s;
        });
        if (mutated) {
          localStorage.setItem('vendor_suppliers', JSON.stringify(migrated));
          return migrated;
        }
        return parsed;
      }
      return initialSuppliers;
    } catch {
      return initialSuppliers;
    }
  });

  const [activeSupplier, setActiveSupplier] = useState<Supplier | null>(() => {
    try {
      const storedActiveId = localStorage.getItem('vendor_active_supplier_id');
      const storedSuppliers = localStorage.getItem('vendor_suppliers');
      const loadedSuppliers = storedSuppliers 
        ? JSON.parse(storedSuppliers) 
        : initialSuppliers;
      
      const found = loadedSuppliers.find((s: Supplier) => s.id === storedActiveId);
      const active = found || loadedSuppliers[0] || null;
      if (active && active.id === 'sup-1') {
        let updatedActive = { ...active };
        let mutatedActive = false;
        if (active.phone === '+234 803 123 4567') {
          updatedActive.phone = '+234 906 993 6428';
          mutatedActive = true;
        }
        if (active.address === 'Block A3, Suite 12, Lekki Plaza, Lagos, Nigeria') {
          updatedActive.address = 'Olorunda, Osun, Nigeria';
          mutatedActive = true;
        }
        if (mutatedActive) return updatedActive;
      }
      return active;
    } catch {
      return initialSuppliers[0] || null;
    }
  });

  const [outlets, setOutlets] = useState<Outlet[]>(() => {
    try {
      const stored = localStorage.getItem('vendor_outlets');
      if (stored) {
        const parsed = JSON.parse(stored);
        const filtered = parsed.filter((o: Outlet) => o.id !== 'out-1-1' && o.id !== 'out-1-2' && o.id !== 'out-1-3');
        if (filtered.length !== parsed.length) {
          localStorage.setItem('vendor_outlets', JSON.stringify(filtered));
          return filtered;
        }
        return parsed;
      }
      return initialOutlets;
    } catch {
      return initialOutlets;
    }
  });

  const [supplies, setSupplies] = useState<SupplyRecord[]>(() => {
    try {
      const stored = localStorage.getItem('vendor_supplies');
      if (stored) {
        const parsed = JSON.parse(stored);
        const filtered = parsed.filter((s: SupplyRecord) => 
          s.id !== 'sup-rec-1' && s.id !== 'sup-rec-2' && s.id !== 'sup-rec-3' && s.id !== 'sup-rec-4'
        );
        if (filtered.length !== parsed.length) {
          localStorage.setItem('vendor_supplies', JSON.stringify(filtered));
          return filtered;
        }
        return parsed;
      }
      return initialSupplies;
    } catch {
      return initialSupplies;
    }
  });

  const [payments, setPayments] = useState<PaymentRecord[]>(() => {
    try {
      const stored = localStorage.getItem('vendor_payments');
      if (stored) {
        const parsed = JSON.parse(stored);
        const filtered = parsed.filter((p: PaymentRecord) => 
          p.id !== 'pay-rec-1' && p.id !== 'pay-rec-2' && p.id !== 'pay-rec-3'
        );
        const zeroed = filtered.map((p: PaymentRecord) => ({ ...p, amount: 0 }));
        if (filtered.some(p => p.amount !== 0) || filtered.length !== parsed.length) {
          localStorage.setItem('vendor_payments', JSON.stringify(zeroed));
        }
        return zeroed;
      }
      return initialPayments.map((p) => ({ ...p, amount: 0 }));
    } catch {
      return initialPayments.map((p) => ({ ...p, amount: 0 }));
    }
  });

  // UI State
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedOutletIdForLedger, setSelectedOutletIdForLedger] = useState('');
  const [toasts, setToasts] = useState<Toast[]>([]);

  // 2. Synchronize States with LocalStorage
  useEffect(() => {
    localStorage.setItem('vendor_suppliers', JSON.stringify(suppliers));
  }, [suppliers]);

  useEffect(() => {
    if (activeSupplier) {
      localStorage.setItem('vendor_active_supplier_id', activeSupplier.id);
    } else {
      localStorage.removeItem('vendor_active_supplier_id');
    }
  }, [activeSupplier]);

  useEffect(() => {
    localStorage.setItem('vendor_outlets', JSON.stringify(outlets));
  }, [outlets]);

  useEffect(() => {
    localStorage.setItem('vendor_supplies', JSON.stringify(supplies));
  }, [supplies]);

  useEffect(() => {
    localStorage.setItem('vendor_payments', JSON.stringify(payments));
  }, [payments]);

  // Toast Helpers
  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // 3. Business Actions
  
  // -- Outlet Actions
  const handleAddOutlet = (
    name: string, 
    phone: string
  ) => {
    if (!activeSupplier) return;
    const newOutlet: Outlet = {
      id: `out-${Date.now()}`,
      supplierId: activeSupplier.id,
      name,
      phone,
      createdAt: new Date().toISOString(),
    };
    setOutlets((prev) => [...prev, newOutlet]);
    addToast(`Outlet "${name}" added to current portfolio`, 'success');
  };

  const handleUpdateOutlet = (
    id: string, 
    name: string, 
    phone: string
  ) => {
    setOutlets((prev) =>
      prev.map((o) =>
        o.id === id ? { ...o, name, phone } : o
      )
    );
    addToast(`Outlet profile "${name}" updated`, 'success');
  };

  const handleDeleteOutlet = (id: string) => {
    const hasSupplies = supplies.some((s) => s.outletId === id);
    const hasPayments = payments.some((p) => p.outletId === id);

    if (hasSupplies || hasPayments) {
      if (confirm('Warning: This outlet has recorded transaction logs. Deleting this outlet profile will also remove its corresponding supplies and payments history. Do you wish to proceed?')) {
        setOutlets((prev) => prev.filter((o) => o.id !== id));
        setSupplies((prev) => prev.filter((s) => s.outletId !== id));
        setPayments((prev) => prev.filter((p) => p.outletId !== id));
        addToast('Outlet and all related ledger entries successfully deleted', 'info');
      }
    } else {
      setOutlets((prev) => prev.filter((o) => o.id !== id));
      addToast('Outlet profile deleted', 'info');
    }
  };

  // -- Supply Actions
  const handleAddSupply = (record: Omit<SupplyRecord, 'id' | 'createdAt'>) => {
    const newRecord: SupplyRecord = {
      ...record,
      id: `sup-rec-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setSupplies((prev) => [...prev, newRecord]);
    addToast(`Supply Invoice ${record.invoiceNumber} successfully posted!`, 'success');
  };

  const handleUpdateSupplyStatus = (id: string, status: 'pending' | 'partial' | 'paid') => {
    setSupplies((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status } : s))
    );
    addToast(`Invoice status updated to ${status.toUpperCase()}`, 'success');
  };

  const handleDeleteSupply = (id: string) => {
    if (confirm('Are you sure you want to delete this supply record? This is irreversible.')) {
      setSupplies((prev) => prev.filter((s) => s.id !== id));
      addToast('Supply record removed from ledger', 'info');
    }
  };

  // -- Payment Actions
  const handleAddPayment = (record: Omit<PaymentRecord, 'id' | 'createdAt'>) => {
    const newRecord: PaymentRecord = {
      ...record,
      id: `pay-rec-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setPayments((prev) => [...prev, newRecord]);

    // Intelligently auto-resolve pending supplies for this outlet!
    // If the payment is equivalent or more, we can auto-update the oldest pending/partial invoice to "paid".
    // This is a premium touch of financial bookkeeping!
    const outletPendingInvoices = supplies
      .filter((s) => s.outletId === record.outletId && s.status !== 'paid')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let remainingPayment = record.amount;
    const updatedSupplies = [...supplies];

    for (const invoice of outletPendingInvoices) {
      if (remainingPayment <= 0) break;
      const index = updatedSupplies.findIndex((s) => s.id === invoice.id);
      if (index !== -1) {
        // Simple mock allocation: If remaining payment can fully offset the invoice, mark paid
        if (remainingPayment >= invoice.totalAmount) {
          updatedSupplies[index].status = 'paid';
          remainingPayment -= invoice.totalAmount;
        } else {
          updatedSupplies[index].status = 'partial';
          remainingPayment = 0;
        }
      }
    }
    setSupplies(updatedSupplies);

    addToast(`Payment receipt recorded! Deposited ₦${record.amount.toFixed(2)}`, 'success');
  };

  const handleDeletePayment = (id: string) => {
    if (confirm('Are you sure you want to delete this payment record? Balance histories will adjust.')) {
      setPayments((prev) => prev.filter((p) => p.id !== id));
      addToast('Payment receipt removed from ledger', 'info');
    }
  };

  // -- Backup & Restore Actions
  const handleExportData = () => {
    const dataBackup = {
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      suppliers,
      outlets,
      supplies,
      payments,
    };

    const blob = new Blob([JSON.stringify(dataBackup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vendor_ledger_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('Backup exported successfully', 'success');
  };

  const handleImportData = (jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString);
      if (
        !parsed.suppliers || 
        !parsed.outlets || 
        !parsed.supplies || 
        !parsed.payments
      ) {
        addToast('Invalid backup file structure. Missing lists.', 'error');
        return;
      }

      setSuppliers(parsed.suppliers);
      setOutlets(parsed.outlets);
      setSupplies(parsed.supplies);
      setPayments(parsed.payments);
      
      if (parsed.suppliers.length > 0) {
        setActiveSupplier(parsed.suppliers[0]);
      }

      addToast('Records imported successfully! Database updated.', 'success');
    } catch {
      addToast('Failed to import backup. Please ensure the file is valid JSON.', 'error');
    }
  };

  const handleSetAllPaymentsToZero = () => {
    setPayments((prev) => prev.map((p) => ({ ...p, amount: 0 })));
    setSupplies((prev) => prev.map((s) => ({ ...s, status: 'pending' })));
    addToast('All payment amounts set to ₦0.00. Invoice statuses updated to PENDING.', 'info');
  };

  // Render current active tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardOverview
            activeSupplier={activeSupplier}
            outlets={outlets}
            supplies={supplies}
            payments={payments}
            onNavigateToTab={setActiveTab}
            onSelectOutletForStatement={setSelectedOutletIdForLedger}
          />
        );
      case 'outlets':
        return (
          <OutletsTab
            activeSupplier={activeSupplier}
            outlets={outlets}
            supplies={supplies}
            payments={payments}
            onAddOutlet={handleAddOutlet}
            onUpdateOutlet={handleUpdateOutlet}
            onDeleteOutlet={handleDeleteOutlet}
            onSelectOutletForStatement={setSelectedOutletIdForLedger}
            onNavigateToTab={setActiveTab}
          />
        );
      case 'supplies':
        return (
          <SuppliesTab
            activeSupplier={activeSupplier}
            outlets={outlets}
            supplies={supplies}
            onAddSupply={handleAddSupply}
            onUpdateSupplyStatus={handleUpdateSupplyStatus}
            onDeleteSupply={handleDeleteSupply}
          />
        );
      case 'payments':
        return (
          <PaymentsTab
            activeSupplier={activeSupplier}
            outlets={outlets}
            payments={payments}
            supplies={supplies}
            onAddPayment={handleAddPayment}
            onDeletePayment={handleDeletePayment}
            onSetAllPaymentsToZero={handleSetAllPaymentsToZero}
          />
        );
      case 'ledger':
        return (
          <LedgerTab
            activeSupplier={activeSupplier}
            outlets={outlets}
            supplies={supplies}
            payments={payments}
            selectedOutletId={selectedOutletIdForLedger}
            onSelectOutletId={setSelectedOutletIdForLedger}
            onDeleteSupply={handleDeleteSupply}
            onDeletePayment={handleDeletePayment}
          />
        );
      default:
        return <div>Tab not found</div>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans" id="app-container">
      {/* Navbar with active supplier selector and backup mechanics */}
      <Navbar
        suppliers={suppliers}
        activeSupplier={activeSupplier}
        onSelectSupplier={setActiveSupplier}
        onExportData={handleExportData}
        onImportData={handleImportData}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Tab Workspace stage */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderTabContent()}
      </main>

      {/* Standard professional footer */}
      <footer className="bg-white border-t border-slate-200 py-6" id="app-footer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-400">
            &copy; 2026 VendorLedger. Secure local ledger accounting system.
          </div>
          <div className="flex items-center space-x-4 text-xs font-semibold text-slate-500">
            <span>Offline Database Enabled</span>
            <div className="h-4 w-[1px] bg-slate-200" />
            <span>Multi-Account Ledger Isolation</span>
          </div>
        </div>
      </footer>

      {/* Toast Notification HUD */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col space-y-2 pointer-events-none" id="toasts-hud">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            onClick={() => removeToast(toast.id)}
            className={`pointer-events-auto p-4 rounded-xl shadow-xl flex items-center justify-between border max-w-md w-80 translate-y-0 transition-transform cursor-pointer animate-in fade-in slide-in-from-bottom-5 duration-300 ${
              toast.type === 'success'
                ? 'bg-white border-emerald-100 text-emerald-800 shadow-emerald-500/5'
                : toast.type === 'error'
                ? 'bg-rose-50 border-rose-100 text-rose-800 shadow-rose-500/5'
                : 'bg-indigo-50 border-indigo-100 text-indigo-800 shadow-indigo-500/5'
            }`}
          >
            <div className="flex items-center space-x-2">
              <span className="text-lg">
                {toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️'}
              </span>
              <p className="text-xs font-semibold leading-tight">{toast.message}</p>
            </div>
            <button className="text-xs font-bold text-slate-400 hover:text-slate-600 pl-2">
              &times;
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
