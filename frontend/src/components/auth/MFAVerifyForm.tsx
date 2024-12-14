import React, { useState } from 'react';
import apiUtils from '../../lib/api';

interface MFAVerifyFormProps {
    onSuccess: () => void;
    onCancel: () => void;
  }
  
  const MFAVerifyForm: React.FC<MFAVerifyFormProps> = ({ onSuccess, onCancel }) => {
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
  
    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!code) return;
  
      try {
        setIsLoading(true);
        setError('');
        const response = await apiUtils.auth.mfa.verify(code);
        if (response.status === 'success') {
          onSuccess();
        } else {
          setError(response.message || 'Verification failed');
        }
      } catch (error: any) {
        setError(error.message || 'Verification failed');
      } finally {
        setIsLoading(false);
      }
    };
  
    return (
      <div>
        <h2 className="text-center text-2xl font-bold text-gray-900">
          Two-Factor Authentication
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Enter the verification code from your authenticator app
        </p>
  
        {error && (
          <div className="mt-4 bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded relative">
            <span className="block sm:inline">{error}</span>
          </div>
        )}
  
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="code" className="sr-only">
              Verification Code
            </label>
            <input
              type="text"
              id="code"
              maxLength={6}
              className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Enter 6-digit code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required
            />
          </div>
  
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={isLoading || code.length !== 6}
              className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400"
            >
              {isLoading ? 'Verifying...' : 'Verify'}
            </button>
          </div>
        </form>
      </div>
    );
  };
  export default MFAVerifyForm;