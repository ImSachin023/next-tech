import React, { useState } from 'react';
import { getEnvironmentInfo, getApiUrl } from '../config/api';

const EnvironmentInfo: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const envInfo = getEnvironmentInfo();
  const apiUrl = getApiUrl();

  // Only show in development and test environments
  if (envInfo.isProduction && !envInfo.debugMode) {
    return null;
  }

  const toggleVisibility = () => {
    setIsVisible(!isVisible);
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={toggleVisibility}
        className="fixed bottom-4 left-4 z-50 bg-gray-800 text-white p-2 rounded-full shadow-lg hover:bg-gray-700 transition-colors"
        title="Environment Info"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      {/* Environment Info Panel */}
      {isVisible && (
        <div className="fixed bottom-16 left-4 z-50 bg-white border border-gray-300 rounded-lg shadow-xl p-4 max-w-sm">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-gray-800">Environment Info</h3>
            <button
              onClick={toggleVisibility}
              className="text-gray-500 hover:text-gray-700"
            >
              ×
            </button>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Environment:</span>
              <span className={`font-semibold ${
                envInfo.isDevelopment ? 'text-green-600' :
                envInfo.isTest ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {envInfo.envName}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">API URL:</span>
              <span className="font-mono text-xs text-blue-600 break-all">
                {apiUrl}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Debug Mode:</span>
              <span className={envInfo.debugMode ? 'text-green-600' : 'text-red-600'}>
                {envInfo.debugMode ? 'ON' : 'OFF'}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Node ENV:</span>
              <span className="font-mono text-xs">
                {process.env.NODE_ENV}
              </span>
            </div>
            
            {envInfo.isDevelopment && (
              <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-xs">
                <strong>Development Mode:</strong> Full debugging enabled
              </div>
            )}
            
            {envInfo.isTest && (
              <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                <strong>Test Mode:</strong> Testing environment with isolated database
              </div>
            )}
            
            {envInfo.isProduction && (
              <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs">
                <strong>Production Mode:</strong> Live environment - be careful!
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default EnvironmentInfo;