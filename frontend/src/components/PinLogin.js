import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Lock } from 'lucide-react';
import { API_BASE_URL } from '../config/api';

const PinLogin = ({ onSuccess }) => {
  const [pin, setPin] = useState(['', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  // const correctPin = process.env.REACT_APP_STATS_PIN || '1234'; // Default PIN: 1234

  const handlePinChange = (index, value) => {
    if (isNaN(value)) return;
    
    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);

    // Auto-focus next input
    if (value !== '' && index < 3) {
      document.getElementById(`pin-${index + 1}`).focus();
    }

    // Check PIN when all digits are entered
    if (index === 3 && value !== '') {
      const enteredPin = [...newPin.slice(0, 3), value].join('');
      handleSubmit(enteredPin);
    }
  };

  const handleSubmit = async (enteredPin) => {
    setIsLoading(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/verify-stats-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: enteredPin })
      });

      const data = await response.json();
      
      if (data.success) {
        localStorage.setItem('statsToken', data.token);
        localStorage.setItem('statsAuth', Date.now().toString());
        onSuccess();
        toast.success('Access granted');
      } else {
        toast.error('Invalid PIN');
        setPin(['', '', '', '']);
        document.getElementById('pin-0').focus();
      }
    } catch (error) {
      toast.error('Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === 'Backspace' && index > 0 && pin[index] === '') {
      document.getElementById(`pin-${index - 1}`).focus();
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-sm max-w-md w-full">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-50 rounded-full mb-4">
            <Lock className="h-8 w-8 text-blue-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Enter PIN</h2>
          <p className="text-gray-500 mt-2">Please enter the PIN to access statistics</p>
        </div>

        <div className="flex justify-center space-x-4 mb-6">
          {pin.map((digit, index) => (
            <input
              key={index}
              id={`pin-${index}`}
              type="password"
              maxLength="1"
              value={digit}
              onChange={(e) => handlePinChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className="w-12 h-12 text-center text-xl font-semibold border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoading}
              autoFocus={index === 0}
            />
          ))}
        </div>

        {isLoading && (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PinLogin;