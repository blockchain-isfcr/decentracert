import React from 'react';
import { Link } from 'react-router-dom';

const Navbar = ({ account, connectWallet, disconnectWallet, isConnecting, networkName }) => {
  // Truncate wallet address for display
  const truncateAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-light">
      <div className="container">
        <Link className="navbar-brand" to="/">
          <strong>Certificate NFT System</strong>
        </Link>
        
        <button 
          className="navbar-toggler" 
          type="button" 
          data-bs-toggle="collapse" 
          data-bs-target="#navbarNav" 
          aria-controls="navbarNav" 
          aria-expanded="false" 
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav me-auto">
            <li className="nav-item">
              <Link className="nav-link" to="/">Home</Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/student">Student Portal</Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/organizer">Organizer Portal</Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/verify">🔍 Verify Certificate</Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/my-certificates">🎓 My Certificates</Link>
            </li>
          </ul>
          
          <div className="d-flex align-items-center">
            {account ? (
              <div className="d-flex align-items-center">
                <span className="me-2">
                  <span className="wallet-address">{truncateAddress(account)}</span>
                  <span className={`network-badge ${networkName === 'sepolia' ? 'network-sepolia' : 'network-unknown'}`}>
                    {networkName === 'sepolia' ? 'Sepolia' : networkName || 'Unknown Network'}
                  </span>
                </span>
                <button 
                  className="btn btn-sm btn-disconnect" 
                  onClick={disconnectWallet}
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button 
                className="btn btn-sm btn-connect" 
                onClick={connectWallet}
                disabled={isConnecting}
              >
                {isConnecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 