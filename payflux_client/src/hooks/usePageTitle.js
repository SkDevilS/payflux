import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Map routes to page titles
const routeTitles = {
  '/': 'Dashboard',
  '/login': 'Login',
  
  // Transactions
  '/transactions/payin-report': 'PayIN Report',
  '/transactions/payout-report': 'PayOUT Report',
  
  // Wallet
  '/wallet/overview': 'Wallet Overview',
  '/wallet/statement': 'Wallet Statement',
  
  // Fund Manager
  '/fund-manager/settle': 'Settle Fund',
  '/fund-manager/request': 'Fund Request',
  
  // Security
  '/security/change-password': 'Change Password',
  '/security/change-pin': 'Change PIN',
  
  // Developer Zone
  '/developer/documentation': 'API Documentation',
  '/developer/credentials': 'API Credentials',
  
  // Settings
  '/settings/bank': 'Bank Management',
  
  // Generate QR
  '/generate-qr': 'Collect Payment',
  
  // My Commercials
  '/my-commercials': 'Rates',
};

export const usePageTitle = (customTitle = null) => {
  const location = useLocation();

  useEffect(() => {
    const pageTitle = customTitle || routeTitles[location.pathname] || 'Payflux Merchant';
    document.title = customTitle ? customTitle : `${pageTitle} | Payflux Merchant`;
  }, [location.pathname, customTitle]);
};
