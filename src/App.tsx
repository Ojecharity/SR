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
import { db, auth, handleFirestoreError, OperationType } from './lib/firebase';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  writeBatch, 
  getDocs,
  query,
  where
} from 'firebase/firestore';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';

// Component Imports
import Navbar from './components/Navbar';
import DashboardOverview from './components/DashboardOverview';
import OutletsTab from './components/OutletsTab';
import SuppliesTab from './components/SuppliesTab';
import PaymentsTab from './components/PaymentsTab';
import LedgerTab from './components/LedgerTab';
import AuthScreen from './components/AuthScreen';

// Toast structure
interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export default function App() {
  // 1. Firebase Auth and Synchronized States
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
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

  // Listen to Firebase auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        setIsAuthLoading(false);
      } else {
        const savedGuest = localStorage.getItem('vendor_guest_user');
        if (savedGuest) {
          setCurrentUser(JSON.parse(savedGuest));
        } else {
          setCurrentUser(null);
        }
        setIsAuthLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  // 2. Real-Time Sync & Seeding with Firebase Firestore or local storage fallback
  useEffect(() => {
    if (!currentUser) {
      setSuppliers([]);
      setOutlets([]);
      setSupplies([]);
      setPayments([]);
      setActiveSupplier(null);
      setIsLoading(false);
      return;
    }

    if (currentUser.isGuest) {
      setIsLoading(true);
      const localSuppliers = localStorage.getItem(`suppliers_${currentUser.uid}`);
      const localOutlets = localStorage.getItem(`outlets_${currentUser.uid}`);
      const localSupplies = localStorage.getItem(`supplies_${currentUser.uid}`);
      const localPayments = localStorage.getItem(`payments_${currentUser.uid}`);

      if (localSuppliers && localOutlets && localSupplies && localPayments) {
        setSuppliers(JSON.parse(localSuppliers));
        setOutlets(JSON.parse(localOutlets));
        setSupplies(JSON.parse(localSupplies));
        setPayments(JSON.parse(localPayments));
      } else {
        const seededSuppliers = initialSuppliers.map(s => ({ ...s, userId: currentUser.uid }));
        const seededOutlets = initialOutlets.map(o => ({ ...o, userId: currentUser.uid }));
        const seededSupplies = initialSupplies.map(s => ({ ...s, userId: currentUser.uid }));
        const seededPayments = initialPayments.map(p => ({ ...p, userId: currentUser.uid }));

        setSuppliers(seededSuppliers);
        setOutlets(seededOutlets);
        setSupplies(seededSupplies);
        setPayments(seededPayments);

        localStorage.setItem(`suppliers_${currentUser.uid}`, JSON.stringify(seededSuppliers));
        localStorage.setItem(`outlets_${currentUser.uid}`, JSON.stringify(seededOutlets));
        localStorage.setItem(`supplies_${currentUser.uid}`, JSON.stringify(seededSupplies));
        localStorage.setItem(`payments_${currentUser.uid}`, JSON.stringify(seededPayments));
      }
      setIsLoading(false);
      return;
    }

    let unsubscribeSuppliers: () => void;
    let unsubscribeOutlets: () => void;
    let unsubscribeSupplies: () => void;
    let unsubscribePayments: () => void;

    async function initFirebase() {
      setIsLoading(true);
      try {
        const suppliersCol = collection(db, 'suppliers');
        const qSuppliers = query(suppliersCol, where('userId', '==', currentUser!.uid));
        
        let querySnapshot;
        try {
          querySnapshot = await getDocs(qSuppliers);
        } catch (getErr) {
          handleFirestoreError(getErr, OperationType.GET, 'suppliers');
          return;
        }
        
        if (querySnapshot.empty) {
          console.log('Firestore user data is empty. Seeding user initial data...');
          const batch = writeBatch(db);
          
          initialSuppliers.forEach(s => {
            const uniqueId = `${currentUser!.uid}_${s.id}`;
            batch.set(doc(db, 'suppliers', uniqueId), { ...s, id: uniqueId, userId: currentUser!.uid });
          });
          initialOutlets.forEach(o => {
            const uniqueId = `${currentUser!.uid}_${o.id}`;
            batch.set(doc(db, 'outlets', uniqueId), { ...o, id: uniqueId, userId: currentUser!.uid });
          });
          initialSupplies.forEach(s => {
            const uniqueId = `${currentUser!.uid}_${s.id}`;
            batch.set(doc(db, 'supplies', uniqueId), { ...s, id: uniqueId, userId: currentUser!.uid });
          });
          initialPayments.forEach(p => {
            const uniqueId = `${currentUser!.uid}_${p.id}`;
            batch.set(doc(db, 'payments', uniqueId), { ...p, id: uniqueId, userId: currentUser!.uid });
          });
          
          try {
            await batch.commit();
            console.log('Seeding completed.');
          } catch (writeErr) {
            handleFirestoreError(writeErr, OperationType.WRITE, 'suppliers/outlets/supplies/payments');
          }
        }
      } catch (err) {
        console.error('Failed to initialize or seed database:', err);
      } finally {
        setIsLoading(false);
      }

      // Hook up live Firestore listeners filtered by userId
      unsubscribeSuppliers = onSnapshot(
        query(collection(db, 'suppliers'), where('userId', '==', currentUser!.uid)),
        (snapshot) => {
          const list: Supplier[] = [];
          snapshot.forEach((doc) => {
            list.push(doc.data() as Supplier);
          });
          setSuppliers(list);
        },
        (err) => {
          handleFirestoreError(err, OperationType.GET, 'suppliers');
        }
      );

      unsubscribeOutlets = onSnapshot(
        query(collection(db, 'outlets'), where('userId', '==', currentUser!.uid)),
        (snapshot) => {
          const list: Outlet[] = [];
          snapshot.forEach((doc) => {
            list.push(doc.data() as Outlet);
          });
          setOutlets(list);
        },
        (err) => {
          handleFirestoreError(err, OperationType.GET, 'outlets');
        }
      );

      unsubscribeSupplies = onSnapshot(
        query(collection(db, 'supplies'), where('userId', '==', currentUser!.uid)),
        (snapshot) => {
          const list: SupplyRecord[] = [];
          snapshot.forEach((doc) => {
            list.push(doc.data() as SupplyRecord);
          });
          setSupplies(list);
        },
        (err) => {
          handleFirestoreError(err, OperationType.GET, 'supplies');
        }
      );

      unsubscribePayments = onSnapshot(
        query(collection(db, 'payments'), where('userId', '==', currentUser!.uid)),
        (snapshot) => {
          const list: PaymentRecord[] = [];
          snapshot.forEach((doc) => {
            list.push(doc.data() as PaymentRecord);
          });
          setPayments(list);
        },
        (err) => {
          handleFirestoreError(err, OperationType.GET, 'payments');
        }
      );
    }

    initFirebase();

    return () => {
      if (unsubscribeSuppliers) unsubscribeSuppliers();
      if (unsubscribeOutlets) unsubscribeOutlets();
      if (unsubscribeSupplies) unsubscribeSupplies();
      if (unsubscribePayments) unsubscribePayments();
    };
  }, [currentUser]);

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

  // Local persistence for guest session updates
  useEffect(() => {
    if (currentUser?.isGuest) {
      localStorage.setItem(`suppliers_${currentUser.uid}`, JSON.stringify(suppliers));
    }
  }, [suppliers, currentUser]);

  useEffect(() => {
    if (currentUser?.isGuest) {
      localStorage.setItem(`outlets_${currentUser.uid}`, JSON.stringify(outlets));
    }
  }, [outlets, currentUser]);

  useEffect(() => {
    if (currentUser?.isGuest) {
      localStorage.setItem(`supplies_${currentUser.uid}`, JSON.stringify(supplies));
    }
  }, [supplies, currentUser]);

  useEffect(() => {
    if (currentUser?.isGuest) {
      localStorage.setItem(`payments_${currentUser.uid}`, JSON.stringify(payments));
    }
  }, [payments, currentUser]);

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
  
  // -- Supplier Actions
  const handleAddSupplier = async (
    name: string,
    businessCategory: string,
    phone: string,
    address: string
  ) => {
    if (!currentUser) return;
    const newSupplier: Supplier = {
      id: `sup-${Date.now()}`,
      userId: currentUser.uid,
      name,
      businessCategory: businessCategory || 'General Supplier',
      phone: phone || '+234 901 000 0000',
      email: currentUser.email || '',
      address: address || 'Nigeria',
      createdAt: new Date().toISOString(),
    };

    if (currentUser.isGuest) {
      setSuppliers(prev => [...prev, newSupplier]);
      setActiveSupplier(newSupplier);
      addToast(`Supplier profile "${name}" successfully created!`, 'success');
      return;
    }

    try {
      await setDoc(doc(db, 'suppliers', newSupplier.id), newSupplier);
      setActiveSupplier(newSupplier);
      addToast(`Supplier profile "${name}" successfully created!`, 'success');
    } catch (err) {
      console.error(err);
      addToast('Failed to add supplier profile to database', 'error');
    }
  };

  // -- Outlet Actions
  const handleAddOutlet = async (
    name: string, 
    phone: string
  ) => {
    if (!activeSupplier || !currentUser) return;
    const newOutlet: Outlet = {
      id: `out-${Date.now()}`,
      userId: currentUser.uid,
      supplierId: activeSupplier.id,
      name,
      phone,
      createdAt: new Date().toISOString(),
    };

    if (currentUser.isGuest) {
      setOutlets(prev => [...prev, newOutlet]);
      addToast(`Outlet "${name}" added to current portfolio`, 'success');
      return;
    }

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
    if (currentUser?.isGuest) {
      setOutlets(prev => prev.map(o => o.id === id ? { ...o, name, phone } : o));
      addToast(`Outlet profile "${name}" updated`, 'success');
      return;
    }

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

    if (currentUser?.isGuest) {
      if (hasSupplies || hasPayments) {
        if (confirm('Warning: This outlet has recorded transaction logs. Deleting this outlet profile will also remove its corresponding supplies and payments history. Do you wish to proceed?')) {
          setOutlets(prev => prev.filter(o => o.id !== id));
          setSupplies(prev => prev.filter(s => s.outletId !== id));
          setPayments(prev => prev.filter(p => p.outletId !== id));
          addToast('Outlet and all related ledger entries successfully deleted', 'info');
        }
      } else {
        setOutlets(prev => prev.filter(o => o.id !== id));
        addToast('Outlet profile deleted', 'info');
      }
      return;
    }

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
    if (!currentUser) return;
    const newRecord: SupplyRecord = {
      ...record,
      userId: currentUser.uid,
      id: `sup-rec-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    if (currentUser.isGuest) {
      setSupplies(prev => [...prev, newRecord]);
      addToast(`Supply Invoice ${record.invoiceNumber} successfully posted!`, 'success');
      return;
    }

    try {
      await setDoc(doc(db, 'supplies', newRecord.id), newRecord);
      addToast(`Supply Invoice ${record.invoiceNumber} successfully posted!`, 'success');
    } catch (err) {
      console.error(err);
      addToast('Failed to post invoice to Firebase', 'error');
    }
  };

  const handleUpdateSupplyStatus = async (id: string, status: 'pending' | 'partial' | 'paid') => {
    if (currentUser?.isGuest) {
      setSupplies(prev => prev.map(s => s.id === id ? { ...s, status } : s));
      addToast(`Invoice status updated to ${status.toUpperCase()}`, 'success');
      return;
    }

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
      if (currentUser?.isGuest) {
        setSupplies(prev => prev.filter(s => s.id !== id));
        addToast('Supply record removed from ledger', 'info');
        return;
      }

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
    if (!currentUser) return;
    const newRecord: PaymentRecord = {
      ...record,
      userId: currentUser.uid,
      id: `pay-rec-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    if (currentUser.isGuest) {
      const outletPendingInvoices = supplies
        .filter((s) => s.outletId === record.outletId && s.status !== 'paid')
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      let remainingPayment = record.amount;
      const updatedSupplies = [...supplies];

      for (const invoice of outletPendingInvoices) {
        if (remainingPayment <= 0) break;
        const index = updatedSupplies.findIndex((s) => s.id === invoice.id);
        if (index !== -1) {
          if (remainingPayment >= invoice.totalAmount) {
            updatedSupplies[index] = { ...updatedSupplies[index], status: 'paid' };
            remainingPayment -= invoice.totalAmount;
          } else {
            updatedSupplies[index] = { ...updatedSupplies[index], status: 'partial' };
            remainingPayment = 0;
          }
        }
      }

      setSupplies(updatedSupplies);
      setPayments(prev => [...prev, newRecord]);
      addToast(`Payment receipt recorded! Deposited ₦${record.amount.toFixed(2)}`, 'success');
      return;
    }

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
      if (currentUser?.isGuest) {
        setPayments(prev => prev.filter(p => p.id !== id));
        addToast('Payment receipt removed from ledger', 'info');
        return;
      }

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
    if (!currentUser) return;
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

      if (currentUser?.isGuest) {
        setSuppliers(parsed.suppliers);
        setOutlets(parsed.outlets);
        setSupplies(parsed.supplies);
        setPayments(parsed.payments);
        if (parsed.suppliers.length > 0) {
          setActiveSupplier(parsed.suppliers[0]);
        }
        addToast('Records imported successfully! Local storage updated.', 'success');
        return;
      }

      const batch = writeBatch(db);

      // Clean/Set records in Firebase with user scope
      parsed.suppliers.forEach((s: Supplier) => {
        batch.set(doc(db, 'suppliers', s.id), { ...s, userId: currentUser.uid });
      });
      parsed.outlets.forEach((o: Outlet) => {
        batch.set(doc(db, 'outlets', o.id), { ...o, userId: currentUser.uid });
      });
      parsed.supplies.forEach((s: SupplyRecord) => {
        batch.set(doc(db, 'supplies', s.id), { ...s, userId: currentUser.uid });
      });
      parsed.payments.forEach((p: PaymentRecord) => {
        batch.set(doc(db, 'payments', p.id), { ...p, userId: currentUser.uid });
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
    if (currentUser?.isGuest) {
      setPayments(prev => prev.map(p => ({ ...p, amount: 0 })));
      setSupplies(prev => prev.map(s => ({ ...s, status: 'pending' })));
      addToast('All payment amounts set to ₦0.00. Invoice statuses updated to PENDING.', 'info');
      return;
    }

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
            onAddOutlet={handleAddOutlet}
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
            onAddOutlet={handleAddOutlet}
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

  const handleOfflineMode = () => {
    const guestUser = {
      uid: 'guest-user',
      email: 'guest@offline.local',
      displayName: 'Guest User',
      isGuest: true
    };
    localStorage.setItem('vendor_guest_user', JSON.stringify(guestUser));
    setCurrentUser(guestUser);
    addToast('Logged in as Offline Guest. Data is saved locally.', 'success');
  };

  const handleSignOut = () => {
    if (currentUser?.isGuest) {
      localStorage.removeItem('vendor_guest_user');
      setCurrentUser(null);
      addToast('Signed out of guest session successfully', 'info');
      return;
    }

    signOut(auth)
      .then(() => {
        addToast('Signed out successfully', 'info');
      })
      .catch((err) => {
        console.error(err);
        addToast('Failed to sign out', 'error');
      });
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <h2 className="text-sm font-semibold text-slate-600 animate-pulse">Verifying Authorization...</h2>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <>
        <AuthScreen 
          onAuthSuccess={() => addToast('Successfully signed in!', 'success')} 
          onOfflineMode={handleOfflineMode}
        />
        
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
      </>
    );
  }

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
        onAddSupplier={handleAddSupplier}
        onExportData={handleExportData}
        onImportData={handleImportData}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onSignOut={handleSignOut}
      />

      {/* Main Tab Workspace stage */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderTabContent()}
      </main>

      {/* Standard professional footer */}
      <footer className="bg-white border-t border-slate-200 py-6" id="app-footer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-400">
            &copy; 2026 VendorLedger. Secure {currentUser?.isGuest ? 'Local-First' : 'Firestore'} database ledger accounting system.
          </div>
          <div className="flex items-center space-x-4 text-xs font-semibold text-slate-500">
            {currentUser?.isGuest ? (
              <span className="flex items-center space-x-1.5 text-amber-600">
                <span className="h-2 w-2 bg-amber-500 rounded-full animate-pulse" />
                <span>Offline Guest Mode</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1.5 text-emerald-600">
                <span className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
                <span>Firebase Cloud Synced</span>
              </span>
            )}
            <div className="h-4 w-[1px] bg-slate-200" />
            <span>{currentUser?.isGuest ? 'Client-Side Sandbox' : 'Multi-Account Ledger Isolation'}</span>
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
