import React, { useState } from 'react';
import LoginForm from './LoginForm';
import SignupForm from './SignupForm';
import { isSignupAllowed } from '../../services/authService';

const AuthPage = ({ onSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const signupEnabled = isSignupAllowed();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto pt-8">
        {signupEnabled && (
          <div className="text-center mb-8">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              {isLogin ? 'Need an account? Sign up' : 'Already have an account? Log in'}
            </button>
          </div>
        )}

        {isLogin ? (
          <LoginForm onSuccess={onSuccess} />
        ) : signupEnabled ? (
          <SignupForm onSuccess={() => setIsLogin(true)} />
        ) : null}
      </div>
    </div>
  );
};

export default AuthPage;
