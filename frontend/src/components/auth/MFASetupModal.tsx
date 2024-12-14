// MFASetupModal.tsx
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import apiUtils from '../../lib/api';

interface MFASetupModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const MFASetupModal: React.FC<MFASetupModalProps> = ({ onClose, onSuccess }) => {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secretKey, setSecretKey] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    initiateMFASetup();
  }, []);

  const initiateMFASetup = async () => {
    try {
      setIsLoading(true);
      // This makes a POST request without a code to get QR code
      const response = await apiUtils.auth.mfa.setup();
      if (response.status === 'success' && response.qr_code && response.secret_key) {
        setQrCode(response.qr_code);
        setSecretKey(response.secret_key);
      }
    } catch (error) {
      setError(error.message || 'Failed to initialize MFA setup');
    } finally {
      setIsLoading(false);
    }
  };
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;
  
    try {
      setIsLoading(true);
      setError('');
      // Send the code in the correct format
      const response = await apiUtils.auth.mfa.setup({
        code: code.toString()
      });
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
  if (isLoading && !qrCode) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">Initializing MFA setup...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Set Up Two-Factor Authentication</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="h-6 w-6" />
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded relative">
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        <div className="space-y-6">
          <div>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
              <li>Install an authenticator app (like Google Authenticator)</li>
              <li>Scan the QR code below or enter the key manually</li>
              <li>Enter the 6-digit code from your app</li>
            </ol>
          </div>

          {qrCode && (
            <div className="flex justify-center">
              <img 
                src={`data:image/png;base64,${qrCode}`} 
                alt="QR Code" 
                className="h-48 w-48"
              />
            </div>
          )}

          {secretKey && (
            <div className="text-center">
              <p className="text-sm text-gray-600">Manual entry key:</p>
              <code className="block mt-1 bg-gray-100 p-2 rounded text-sm break-all">
                {secretKey}
              </code>
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700">
                Verification Code
              </label>
              <input
                type="text"
                id="code"
                maxLength={6}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter 6-digit code"
                required
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || code.length !== 6}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400"
              >
                {isLoading ? 'Verifying...' : 'Verify'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default MFASetupModal;