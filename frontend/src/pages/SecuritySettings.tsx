// src/pages/SecuritySettings.tsx
import React, { useState, useEffect } from 'react';
import { Shield } from 'lucide-react';
import apiUtils from '../lib/api';
import MFASetupModal from '../components/auth/MFASetupModal';

const SecuritySettings = () => {
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [showMFASetup, setShowMFASetup] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkMFAStatus();
  }, []);

  const checkMFAStatus = async () => {
    try {
      const status = await apiUtils.auth.mfa.getStatus();
      setMfaEnabled(status.mfa_enabled);
    } catch (error) {
      console.error('Failed to get MFA status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisableMFA = async () => {
    if (!window.confirm('Are you sure you want to disable 2FA? This will make your account less secure.')) {
      return;
    }

    try {
      await apiUtils.auth.mfa.disable();
      setMfaEnabled(false);
    } catch (error) {
      console.error('Failed to disable MFA:', error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900">
            Security Settings
          </h3>

          <div className="mt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Shield className="h-8 w-8 text-gray-400" />
                <div className="ml-3">
                  <h4 className="text-lg font-medium text-gray-900">
                    Two-Factor Authentication (2FA)
                  </h4>
                  <p className="text-sm text-gray-500">
                    Add an extra layer of security to your account by requiring both your password and an authentication code.
                  </p>
                </div>
              </div>
              <div>
                {!isLoading && (
                  mfaEnabled ? (
                    <button
                      onClick={handleDisableMFA}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      Disable 2FA
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowMFASetup(true)}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Enable 2FA
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showMFASetup && (
        <MFASetupModal
          onClose={() => setShowMFASetup(false)}
          onSuccess={() => {
            setShowMFASetup(false);
            setMfaEnabled(true);
          }}
        />
      )}
    </div>
  );
};

export default SecuritySettings;