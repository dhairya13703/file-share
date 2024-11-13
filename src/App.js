import React from 'react';
import { Toaster } from 'react-hot-toast';
import FileSharing from './components/FileSharing';

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <span className="text-2xl font-bold text-blue-600">FreeShare</span>
            </div>
          </div>
        </div>
      </nav>

      <main>
        <FileSharing />
      </main>

      <footer className="bg-white mt-auto">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-gray-500 text-sm">
            © {new Date().getFullYear()} FreeShare. All rights reserved.
          </p>
        </div>
      </footer>

      <Toaster />
    </div>
  );
}

export default App;