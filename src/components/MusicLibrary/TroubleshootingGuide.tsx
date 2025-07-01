import React from 'react';
import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import {
  XMarkIcon,
  ExclamationTriangleIcon,
  WifiIcon,
  ArrowPathIcon,
  KeyIcon,
  QuestionMarkCircleIcon
} from '@heroicons/react/24/outline';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function TroubleshootingGuide({ isOpen, onClose }: Props) {
  const commonIssues = [
    {
      title: 'Authentication Required',
      icon: KeyIcon,
      description: 'You must be logged in to create playlists.',
      steps: [
        'Click the "Sign In" button in the top right',
        'Enter your email and password',
        'Try creating the playlist again after signing in'
      ]
    },
    {
      title: 'Connection Issues',
      icon: WifiIcon,
      description: 'A stable internet connection is required.',
      steps: [
        'Check your internet connection',
        'Try refreshing the page',
        'If using Wi-Fi, ensure you have a strong signal',
        'Try switching to a different network if available'
      ]
    },
    {
      title: 'Cache/Data Issues',
      icon: ArrowPathIcon,
      description: 'Outdated data might cause problems.',
      steps: [
        'Clear your browser cache',
        'Log out and log back in',
        'Refresh the page',
        'If issues persist, try using a different browser'
      ]
    }
  ];

  const reportIssue = () => {
    // Collect system information
    const systemInfo = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      timestamp: new Date().toISOString()
    };

    console.log('Issue Report:', systemInfo);
    // In a real app, this would send the report to your support system
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/80" aria-hidden="true" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-xl bg-primary-800 p-6 shadow-xl transition-all">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <ExclamationTriangleIcon className="h-6 w-6 text-status-warning" />
                    <Dialog.Title className="text-lg font-medium text-primary-50">
                      Playlist Creation Troubleshooting
                    </Dialog.Title>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="text-primary-400 hover:text-primary-300"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-6">
                  {commonIssues.map((issue, index) => (
                    <div
                      key={index}
                      className="bg-primary-700 rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-center space-x-3">
                        <issue.icon className="h-5 w-5 text-primary-300" />
                        <h3 className="text-primary-50 font-medium">
                          {issue.title}
                        </h3>
                      </div>
                      <p className="text-primary-300 text-sm">
                        {issue.description}
                      </p>
                      <ul className="list-disc list-inside space-y-1">
                        {issue.steps.map((step, stepIndex) => (
                          <li
                            key={stepIndex}
                            className="text-sm text-primary-200"
                          >
                            {step}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}

                  <div className="mt-8 border-t border-primary-700 pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <QuestionMarkCircleIcon className="h-5 w-5 text-primary-300" />
                        <span className="text-sm text-primary-200">
                          Still having issues?
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={reportIssue}
                        className="inline-flex items-center rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500"
                      >
                        Report Problem
                      </button>
                    </div>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}