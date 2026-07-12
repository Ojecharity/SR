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
import { db } from './lib/firebase';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  writeBatch, 
  getDocs 
} from 'firebase/firestore';

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
  // 1. Firebase Synchronized States
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [supplies, setSupplies] = useState<SupplyRecord[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [activeSupplier, setActiveSupplier] = useState<Supplier | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // UI State
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedOutletIdForLedger, setSelectedOutletIdForLedger] = useState('');
  const [toasts, setToasts] = useState<Toast[]>([]);

  // 2. Real-Time Sync & Seeding with Firebase Firestore
  useEffect(() => {
    let unsubscribeSuppliers: () => void;
    let unsubscribeOutlets: () => void;
    let unsubscribeSupplies: () => void;
    let unsubscribePayments: () => void;

    async function initFirebase() {
      try {
        const suppliersCol = collection(db, 'suppliers');
        const querySnapshot = await getDocs(suppliersCol);
        
        if (querySnapshot.empty) {
          console.log('Firestore is empty. Seeding initial data...');
          const batch = writeBatch(db);
          
          initialSuppliers.forEach(s => {
            batch.set(doc(db, 'suppliers', s.id), s);
          });
          initialOutlets.forEach(o => {
            batch.set(doc(db, 'outlets', o.id), o);
          });
          initialSupplies.forEach(s => {
            batch.set(doc(db, 'supplies', s.id), s);
          });
          initialPayments.forEach(p => {
            batch.set(doc(db, 'payments', p.id), p);
          });
          
          await batch.commit();
          console.log('Seeding completed.');
        }
      } catch (err) {
        console.error('Failed to initialize or seed database:', err);
      } finally {
        setIsLoading(false);
      }

      // Hook up live Firestore listeners
      unsubscribeSuppliers = onSnapshot(collection(db, 'suppliers'), (snapshot) => {
        const list: Supplier[] = [];
        snapshot.forEach((doc) => {
          list.push(doc.data() as Supplier);
        });
        setSuppliers(list);
      }, (err) => console.error(err));

      unsubscribeOutlets = onSnapshot(collection(db, 'outlets'), (snapshot) => {
        const list: Outlet[] = [];
        snapshot.forEach((doc) => {
          list.push(doc.data() as Outlet);
        });
        setOutlets(list);
      }, (err) => console.error(err));

      unsubscribeSupplies = onSnapshot(collection(db, 'supplies'), (snapshot) => {
        const list: SupplyRecord[] = [];
        snapshot.forEach((doc) => {
          list.push(doc.data() as SupplyRecord);
        });
        setSupplies(list);
      }, (err) => console.error(err));

      unsubscribePayments = onSnapshot(collection(db, 'payments'), (snapshot) => {
        const list: PaymentRecord[] = [];
        snapshot.forEach((doc) => {
          list.push(doc.data() as PaymentRecord);
        });
        setPayments(list);
      }, (err) => console.error(err));
    }

    initFirebase();

    return () => {
      if (unsubscribeSuppliers) unsubscribeSuppliers();
      if (unsubscribeOutlets) unsubscribeOutlets();
      if (unsubscribeSupplies) unsubscribeSupplies();
      if (unsubscribePayments) unsubscribePayments();
    };
  }, []);

  // Set active supplier once suppliers are loaded
  useEffect(() => {
    if (suppliers.length > 0) {
      const storedActiveId = localStorage.getItem('vendor_active_supplier_id');
      const found = suppliers.find((s) => s.id === storedActiveId);
      if (found) {
        setActiveSupplier(found);
      } else if (!activeSupplier) {
        setActiveSupplier(suppliers[0]);
      }
    }
  }, [suppliers, activeSupplier]);

  useEffect(() => {
    if (activeSupplier) {
      localStorage.setItem('vendor_active_supplier_id', activeSupplier.id);
    } else {
      localStorage.removeItem('vendor_active_supplier_id');
    }
  }, [activeSupplier]);

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
  const handleAddOutlet = async (
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
    try {
      await setDoc(doc(db, 'outlets', newOutlet.id), newOutlet);
      addToast(`Outlet "${name}" added to current portfolio`, 'success');
    } catch (err) {
      console.error(err);
      addToast('Failed to add outlet to Firebase', 'error');
    }
  };

  const handleUpdateOutlet = async (
    id: string, 
    name: string, 
    phone: string
  ) => {
    try {
      await updateDoc(doc(db, 'outlets', id), { name, phone });
      addToast(`Outlet profile "${name}" updated`, 'success');
    } catch (err) {
      console.error(err);
      addToast('Failed to update outlet in Firebase', 'error');
    }
  };

  const handleDeleteOutlet = async (id: string) => {
    const hasSupplies = supplies.some((s) => s.outletId === id);
    const hasPayments = payments.some((p) => p.outletId === id);

    if (hasSupplies || hasPayments) {
      if (confirm('Warning: This outlet has recorded transaction logs. Deleting this outlet profile will also remove its corresponding supplies and payments history. Do you wish to proceed?')) {
        try {
          const batch = writeBatch(db);
          batch.delete(doc(db, 'outlets', id));
          
          supplies.filter((s) => s.outletId === id).forEach((s) => {
            batch.delete(doc(db, 'supplies', s.id));
          });
          payments.filter((p) => p.outletId === id).forEach((p) => {
            batch.delete(doc(db, 'payments', p.id));
          });
          
          await batch.commit();
          addToast('Outlet and all related ledger entries successfully deleted', 'info');
        } catch (err) {
          console.error(err);
          addToast('Failed to delete outlet and transactions from Firebase', 'error');
        }
      }
    } else {
      try {
        await deleteDoc(doc(db, 'outlets', id));
        addToast('Outlet profile deleted', 'info');
      } catch (err) {
        console.error(err);
        addToast('Failed to delete outlet from Firebase', 'error');
      }
    }
  };

  // -- Supply Actions
  const handleAddSupply = async (record: Omit<SupplyRecord, 'id' | 'createdAt'>) => {
    const newRecord: SupplyRecord = {
      ...record,
      id: `sup-rec-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    try {
      await setDoc(doc(db, 'supplies', newRecord.id), newRecord);
      addToast(`Supply Invoice ${record.invoiceNumber} successfully posted!`, 'success');
    } catch (err) {
      console.error(err);
      addToast('Failed to post invoice to Firebase', 'error');
    }
  };

  const handleUpdateSupplyStatus = async (id: string, status: 'pending' | 'partial' | 'paid') => {
    try {
      await updateDoc(doc(db, 'supplies', id), { status });
      addToast(`Invoice status updated to ${status.toUpperCase()}`, 'success');
    } catch (err) {
      console.error(err);
      addToast('Failed to update invoice status in Firebase', 'error');
    }
  };

  const handleDeleteSupply = async (id: string) => {
    if (confirm('Are you sure you want to delete this supply record? This is irreversible.')) {
      try {
        await deleteDoc(doc(db, 'supplies', id));
        addToast('Supply record removed from ledger', 'info');
      } catch (err) {
        console.error(err);
        addToast('Failed to delete supply record from Firebase', 'error');
      }
    }
  };

  // -- Payment Actions
  const handleAddPayment = async (record: Omit<PaymentRecord, 'id' | 'createdAt'>) => {
    const newRecord: PaymentRecord = {
      ...record,
      id: `pay-rec-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'payments', newRecord.id), newRecord);

      // Intelligently auto-resolve pending supplies for this outlet!
      const outletPendingInvoices = supplies
        .filter((s) => s.outletId === record.outletId && s.status !== 'paid')
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      let remainingPayment = record.amount;

      for (const invoice of outletPendingInvoices) {
        if (remainingPayment <= 0) break;
        if (remainingPayment >= invoice.totalAmount) {
          batch.update(doc(db, 'supplies', invoice.id), { status: 'paid' });
          remainingPayment -= invoice.totalAmount;
        } else {
          batch.update(doc(db, 'supplies', invoice.id), { status: 'partial' });
          remainingPayment = 0;
        }
      }

      await batch.commit();
      addToast(`Payment receipt recorded! Deposited ₦${record.amount.toFixed(2)}`, 'success');
    } catch (err) {
      console.error(err);
      addToast('Failed to record payment receipt in Firebase', 'error');
    }
  };

  const handleDeletePayment = async (id: string) => {
    if (confirm('Are you sure you want to delete this payment record? Balance histories will adjust.')) {
      try {
        await deleteDoc(doc(db, 'payments', id));
        addToast('Payment receipt removed from ledger', 'info');
      } catch (err) {
        console.error(err);
        addToast('Failed to delete payment from Firebase', 'error');
      }
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

  const handleImportData = async (jsonString: string) => {
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

      const batch = writeBatch(db);

      // Clean/Set records in Firebase
      parsed.suppliers.forEach((s: Supplier) => {
        batch.set(doc(db, 'suppliers', s.id), s);
      });
      parsed.outlets.forEach((o: Outlet) => {
        batch.set(doc(db, 'outlets', o.id), o);
      });
      parsed.supplies.forEach((s: SupplyRecord) => {
        batch.set(doc(db, 'supplies', s.id), s);
      });
      parsed.payments.forEach((p: PaymentRecord) => {
        batch.set(doc(db, 'payments', p.id), p);
      });

      await batch.commit();
      
      if (parsed.suppliers.length > 0) {
        setActiveSupplier(parsed.suppliers[0]);
      }

      addToast('Records imported successfully! Database updated.', 'success');
    } catch (err) {
      console.error(err);
      addToast('Failed to import backup. Please ensure the file is valid JSON.', 'error');
    }
  };

  const handleSetAllPaymentsToZero = async () => {
    try {
      const batch = writeBatch(db);
      payments.forEach((p) => {
        batch.update(doc(db, 'payments', p.id), { amount: 0 });
      });
      supplies.forEach((s) => {
        batch.update(doc(db, 'supplies', s.id), { status: 'pending' });
      });
      await batch.commit();
      addToast('All payment amounts set to ₦0.00. Invoice statuses updated to PENDING.', 'info');
    } catch (err) {
      console.error(err);
      addToast('Failed to reset all payments to zero', 'error');
    }
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <h2 className="text-sm font-semibold text-slate-600 animate-pulse">Connecting to Secure Firebase Database...</h2>
        </div>
      </div>
    );
  }

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
            &copy; 2026 VendorLedger. Secure Firestore database ledger accounting system.
          </div>
          <div className="flex items-center space-x-4 text-xs font-semibold text-slate-500">
            <span className="flex items-center space-x-1.5 text-emerald-600">
              <span className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
              <span>Firebase Cloud Synced</span>
            </span>
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
