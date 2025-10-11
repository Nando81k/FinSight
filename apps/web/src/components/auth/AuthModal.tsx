/**
 * Authentication Modal
 * 
 * Modal wrapper for authentication components with state management
 */

import React, { useState, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Login } from './Login';
import { Register } from './Register';
import { PasswordReset } from './PasswordReset';

type AuthMode = 'login' | 'register' | 'forgot-password';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: AuthMode;
}

export const AuthModal: React.FC<AuthModalProps> = ({ 
  isOpen, 
  onClose, 
  initialMode = 'login' 
}) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);

  const handleClose = () => {
    setMode('login'); // Reset to login when modal closes
    onClose();
  };

  const switchToLogin = () => setMode('login');
  const switchToRegister = () => setMode('register');
  const switchToForgotPassword = () => setMode('forgot-password');

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white text-left align-middle shadow-xl transition-all">
                <div className="absolute right-0 top-0 pr-4 pt-4">
                  <button
                    type="button"
                    className="rounded-md bg-white text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    onClick={handleClose}
                  >
                    <span className="sr-only">Close</span>
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>

                <div className="p-6">
                  {mode === 'login' && (
                    <Login
                      onSwitchToRegister={switchToRegister}
                      onSwitchToForgotPassword={switchToForgotPassword}
                      onClose={handleClose}
                    />
                  )}

                  {mode === 'register' && (
                    <Register
                      onSwitchToLogin={switchToLogin}
                      onClose={handleClose}
                    />
                  )}

                  {mode === 'forgot-password' && (
                    <PasswordReset
                      onSwitchToLogin={switchToLogin}
                    />
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};