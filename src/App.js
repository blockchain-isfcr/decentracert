import React, { useState, useEffect } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { ethers } from 'ethers';
import { motion, AnimatePresence } from 'framer-motion';
import StudentPortal from './components/StudentPortal';
import OrganizerPortal from './components/OrganizerPortal';
import CertificateVerifier from './components/CertificateVerifier';
import MyCertificatesDashboard from './components/MyCertificatesDashboard';
import Navbar from './components/Navbar';
import HomePage from './components/HomePage';
import './App.css';

function App() {
  const [account, setAccount] = useState('');
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [networkName, setNetworkName] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState('');

  // Check if MetaMask is installed
  const checkIfMetaMaskIsInstalled = () => {
    return window.ethereum !== undefined;
  };

  // Initialize ethers provider and check account
  useEffect(() => {
    const initializeProvider = async () => {
      if (checkIfMetaMaskIsInstalled()) {
        try {
          // Set up provider
          const provider = new ethers.providers.Web3Provider(window.ethereum);
          setProvider(provider);

          // Get network
          const network = await provider.getNetwork();
          setNetworkName(network.name);

          // Check if already connected
          const accounts = await provider.listAccounts();
          if (accounts.length > 0) {
            setAccount(accounts[0]);
            setSigner(provider.getSigner());
          }

          // Listen for account changes
          window.ethereum.on('accountsChanged', (accounts) => {
            if (accounts.length > 0) {
              setAccount(accounts[0]);
              setSigner(provider.getSigner());
            } else {
              setAccount('');
              setSigner(null);
            }
          });

          // Listen for chain changes
          window.ethereum.on('chainChanged', () => {
            window.location.reload();
          });
        } catch (error) {
          console.error("Error initializing provider:", error);
          setError("Failed to connect to Ethereum network");
        }
      } else {
        setError("MetaMask is not installed. install MetaMask to use this app.");
      }
    };

    initializeProvider();
  }, []);

  // Connect wallet function
  const connectWallet = async () => {
    if (!checkIfMetaMaskIsInstalled()) {
      setError("MetaMask is not installed. Please install MetaMask to use this app.");
      return;
    }

    setIsConnecting(true);
    setError('');

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });
      
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        
        // Set up provider and signer
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        setProvider(provider);
        setSigner(provider.getSigner());
        
        // Get network
        const network = await provider.getNetwork();
        setNetworkName(network.name);

        // Check if on Sepolia
        if (network.name !== 'sepolia') {
          setError('Please connect to the Sepolia test network');
        }
      }
    } catch (error) {
      console.error("Error connecting wallet:", error);
      setError("Failed to connect wallet");
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect wallet function
  const disconnectWallet = () => {
    setAccount('');
    setSigner(null);
  };

  return (
    <motion.div 
      className="app"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Navbar 
        account={account} 
        connectWallet={connectWallet} 
        disconnectWallet={disconnectWallet} 
        isConnecting={isConnecting}
        networkName={networkName}
      />
      
      <AnimatePresence>
        {error && (
          <motion.div 
            className="container mt-3"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="alert alert-danger premium-alert" role="alert">
              {error}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        className="container py-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <Routes>
          <Route path="/" element={<HomePage account={account} connectWallet={connectWallet} />} />
          <Route 
            path="/student" 
            element={
              <StudentPortal 
                account={account} 
                provider={provider} 
                signer={signer} 
                connectWallet={connectWallet}
              />
            } 
          />
          <Route
            path="/organizer"
            element={
              <OrganizerPortal
                account={account}
                provider={provider}
                signer={signer}
                connectWallet={connectWallet}
              />
            }
          />
          <Route
            path="/verify"
            element={<CertificateVerifier />}
          />
          <Route
            path="/my-certificates"
            element={
              <MyCertificatesDashboard
                account={account}
                provider={provider}
                connectWallet={connectWallet}
              />
            }
          />
        </Routes>
      </motion.div>
      
      <motion.footer 
        className="footer mt-auto py-4 premium-footer"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.5 }}
      >
        <div className="container text-center">
          <span className="text-muted body-font">DecentraCert &copy; {new Date().getFullYear()}</span>
        </div>
      </motion.footer>
    </motion.div>
  );
}

export default App; 
