import React, { useState } from 'react';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { Mail, Lock, User, Sparkles, AlertCircle, Building2, Globe } from 'lucide-react';

interface AuthScreenProps {
  onAuthSuccess: () => void;
  onOfflineMode: () => void;
}

export default function AuthScreen({ onAuthSuccess, onOfflineMode }: AuthScreenProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        // Create user
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Update profile with name
        await updateProfile(user, {
          displayName: fullName || 'User'
        });

        // Initialize user record in Firestore if needed
        try {
          await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            email: user.email,
            displayName: fullName || 'User',
            businessName: businessName || 'My Vendor Supply',
            createdAt: new Date().toISOString()
          });
        } catch (dbErr) {
          handleFirestoreError(dbErr, OperationType.CREATE, `users/${user.uid}`);
        }

        // Also seed a default custom supplier for them if they entered a business name
        if (businessName) {
          const supplierId = `sup-${Date.now()}`;
          try {
            await setDoc(doc(db, 'suppliers', supplierId), {
              id: supplierId,
              userId: user.uid,
              name: businessName,
              businessCategory: 'General Supplier',
              phone: '+234 901 000 0000',
              address: 'Nigeria',
              logoUrl: 'https://images.unsplash.com/photo-1516876437184-593fda40c7ce?auto=format&fit=crop&w=150&q=80',
              rating: 5.0,
              activeInvoicesCount: 0,
              totalDispatchedValue: 0,
              isVerified: true,
              createdAt: new Date().toISOString()
            });
          } catch (dbErr) {
            handleFirestoreError(dbErr, OperationType.CREATE, `suppliers/${supplierId}`);
          }
        }
      } else {
        // Sign in
        await signInWithEmailAndPassword(auth, email, password);
      }
      onAuthSuccess();
    } catch (err: any) {
      console.error(err);
      let friendlyMessage = 'Authentication failed. Please check your credentials.';
      if (err.code === 'auth/email-already-in-use') {
        friendlyMessage = 'This email address is already in use.';
      } else if (err.code === 'auth/weak-password') {
        friendlyMessage = 'Password must be at least 6 characters long.';
      } else if (err.code === 'auth/invalid-credential') {
        friendlyMessage = 'Invalid email or password.';
      } else if (err.code === 'auth/user-not-found') {
        friendlyMessage = 'No account found with this email.';
      } else if (err.code === 'auth/wrong-password') {
        friendlyMessage = 'Incorrect password.';
      } else if (err.code === 'auth/operation-not-allowed') {
        friendlyMessage = 'Email/Password sign-in is not enabled on this Firebase project. To enable: Go to Firebase Console -> Authentication -> Sign-in method, click "Add new provider", and enable "Email/Password". Or use Google Sign-In or Offline Guest mode below.';
      }
      setError(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;

      // Check/create user record in Firestore
      try {
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || 'Authorized User',
          businessName: 'My Vendor Supply',
          createdAt: new Date().toISOString()
        }, { merge: true });
      } catch (dbErr) {
        handleFirestoreError(dbErr, OperationType.CREATE, `users/${user.uid}`);
      }

      onAuthSuccess();
    } catch (err: any) {
      console.error(err);
      let friendlyMessage = 'Google Sign-In failed.';
      if (err.code === 'auth/popup-blocked') {
        friendlyMessage = 'Sign-in popup was blocked by your browser. Please allow popups for this site.';
      } else if (err.code === 'auth/popup-closed-by-user') {
        friendlyMessage = 'Sign-in popup was closed before completing. Please try again.';
      } else if (err.code === 'auth/operation-not-allowed') {
        friendlyMessage = 'Google Sign-In is not enabled on this Firebase project.';
      } else {
        friendlyMessage = `Authentication failed: ${err.message || err.code || 'Unknown error'}`;
      }
      setError(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSignIn = async () => {
    setError('');
    setLoading(true);
    const demoEmail = 'demo@vendorledger.com';
    const demoPassword = 'password123';

    try {
      await signInWithEmailAndPassword(auth, demoEmail, demoPassword);
      onAuthSuccess();
    } catch (err: any) {
      // If demo account doesn't exist yet, register it dynamically
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, demoEmail, demoPassword);
          await updateProfile(userCredential.user, {
            displayName: 'Demo Manager'
          });
          try {
            await setDoc(doc(db, 'users', userCredential.user.uid), {
              uid: userCredential.user.uid,
              email: demoEmail,
              displayName: 'Demo Manager',
              businessName: 'Standard Bakery Supplies Ltd.',
              createdAt: new Date().toISOString()
            });
          } catch (dbErr) {
            handleFirestoreError(dbErr, OperationType.CREATE, `users/${userCredential.user.uid}`);
          }
          onAuthSuccess();
        } catch (createErr: any) {
          console.error(createErr);
          setError('Failed to initialize demo account.');
        }
      } else {
        setError('Failed to sign in as demo.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-8 text-center bg-gradient-to-b from-indigo-50/50 to-transparent border-b border-slate-50">
          <div className="mx-auto h-12 w-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-md shadow-indigo-200 mb-4 animate-bounce">
            VL
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">VendorLedger</h1>
          <p className="text-sm text-slate-500 mt-1.5">
            Cloud-synced multi-account supplier dispatch and ledger tracker
          </p>
        </div>

        <div className="p-8">
          {error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-100 text-rose-800 text-xs rounded-xl flex items-start gap-3 animate-in slide-in-from-top-2 duration-150">
              <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Authorization Error</span>
                <p className="mt-0.5 text-rose-600 font-medium leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3 h-4.5 w-4.5 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-11 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100/75 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                    Your Business Name (Optional)
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3.5 top-3 h-4.5 w-4.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="e.g. SugaRush Catering"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className="w-full pl-11 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100/75 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-colors"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 h-4.5 w-4.5 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100/75 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4.5 w-4.5 text-slate-400" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100/75 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center space-x-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-indigo-100 cursor-pointer mt-2"
            >
              {loading ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <span>{isSignUp ? 'Create Secure Account' : 'Sign In'}</span>
              )}
            </button>
          </form>

          <div className="relative flex items-center justify-center my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100" />
            </div>
            <span className="relative bg-white px-3 text-xs text-slate-400 font-semibold uppercase tracking-widest">
              Or Sign In With
            </span>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full inline-flex items-center justify-center space-x-2.5 px-4 py-2.5 border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 rounded-xl text-sm font-semibold transition-all cursor-pointer shadow-xs hover:shadow-xs"
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span>Continue with Google</span>
          </button>

          <div className="relative flex items-center justify-center my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100" />
            </div>
            <span className="relative bg-white px-3 text-xs text-slate-400 font-semibold uppercase tracking-widest">
              Or Explore
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleDemoSignIn}
              disabled={loading}
              className="inline-flex items-center justify-center space-x-1.5 px-3 py-2.5 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100/80 disabled:opacity-50 text-emerald-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5 text-emerald-600 animate-pulse" />
              <span>Demo Account</span>
            </button>

            <button
              type="button"
              onClick={onOfflineMode}
              disabled={loading}
              className="inline-flex items-center justify-center space-x-1.5 px-3 py-2.5 border border-amber-200 bg-amber-50 hover:bg-amber-100/80 disabled:opacity-50 text-amber-900 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <Globe className="h-3.5 w-3.5 text-amber-600" />
              <span>Offline Guest</span>
            </button>
          </div>

          <p className="text-center text-xs text-slate-500 mt-6">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
              }}
              className="text-indigo-600 hover:text-indigo-800 font-bold hover:underline cursor-pointer"
            >
              {isSignUp ? 'Sign In instead' : 'Register business account'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
