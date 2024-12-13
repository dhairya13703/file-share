import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { BarChart } from 'lucide-react';
import FileSharing from './components/FileSharing';
import Stats from './pages/Stats';
import ProtectedRoute from './components/ProtectedRoute';
import AuthPage from './components/auth/AuthPage';
import { getCurrentUser, onAuthStateChange, signOut } from './services/authService';
import { LogOut, User } from 'lucide-react';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe;
    
    const initAuth = async () => {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
        
        // Set up auth state listener
        unsubscribe = await onAuthStateChange((user) => {
          setUser(user);
        });
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
        {user ? (
          <nav className="bg-white shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <div className="flex items-center">
                  <Link to="/" className="text-2xl font-bold text-blue-600">
                    FreeShare
                  </Link>
                </div>
                <div className="flex items-center space-x-4">
                  <Link 
                    to="/stats" 
                    className="flex items-center space-x-1 text-gray-600 hover:text-blue-600 transition-colors"
                  >
                    <BarChart className="h-5 w-5" />
                    <span>Stats</span>
                  </Link>
                  <div className="flex items-center text-gray-700">
                    <User className="w-5 h-5 mr-2" />
                    <span>{user.email}</span>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          </nav>
        ) : (
          <header className="bg-white shadow-sm">
            <div className="max-w-6xl mx-auto px-4 py-4">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">File Share</h1>
              </div>
            </div>
          </header>
        )}
        
        <main>
          <Routes>
            <Route path="/" element={user ? <FileSharing /> : <AuthPage onSuccess={() => {}} />} />
            <Route 
              path="/stats" 
              element={
                user ? (
                  <ProtectedRoute>
                    <Stats />
                  </ProtectedRoute>
                ) : (
                  <AuthPage onSuccess={() => {}} />
                )
              } 
            />
          </Routes>
        </main>

        <footer className="bg-white mt-auto">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <p className="text-center text-gray-500 text-sm">
              {new Date().getFullYear()} FreeShare. All rights reserved.
            </p>
          </div>
        </footer>

        <Toaster 
          position="bottom-right"
          toastOptions={{
            duration: 5000,
            style: {
              background: '#fff',
              color: '#363636',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              borderRadius: '0.5rem',
              padding: '1rem',
            },
          }}
        />
      </div>
    </Router>
  );
}

export default App;