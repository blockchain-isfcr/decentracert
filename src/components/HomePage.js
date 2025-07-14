import React from 'react';
import { Link } from 'react-router-dom';

const HomePage = ({ account, connectWallet }) => {
  return (
    <div>
      <div className="hero-section text-center">
        <h1 className="display-4 fw-bold mb-3">University Certificate NFT System</h1>
        <p className="lead mb-4">
          A blockchain-based solution for issuing and verifying digital certificates
          for university clubs and events.
        </p>
        {!account && (
          <button
            className="btn btn-light btn-lg"
            onClick={connectWallet}
          >
            Connect Wallet to Get Started
          </button>
        )}
      </div>

      <div className="row mb-5">
        <div className="col-md-4 mb-4">
          <div className="card feature-card p-4">
            <div className="card-body text-center">
              <div className="feature-icon">🔐</div>
              <h5 className="card-title">Secure Verification</h5>
              <p className="card-text">
                Certificates are stored on the Ethereum blockchain, making them tamper-proof 
                and permanently verifiable.
              </p>
            </div>
          </div>
        </div>
        <div className="col-md-4 mb-4">
          <div className="card feature-card p-4">
            <div className="card-body text-center">
              <div className="feature-icon">🎓</div>
              <h5 className="card-title">For Students</h5>
              <p className="card-text">
                Easily claim your event attendance certificates as NFTs and showcase them in your digital wallet.
              </p>
              <Link to="/student" className="btn btn-primary mt-2">Student Portal</Link>
            </div>
          </div>
        </div>
        <div className="col-md-4 mb-4">
          <div className="card feature-card p-4">
            <div className="card-body text-center">
              <div className="feature-icon">🏢</div>
              <h5 className="card-title">For Organizers</h5>
              <p className="card-text">
                Create and distribute digital certificates for your events with just a few clicks.
              </p>
              <Link to="/organizer" className="btn btn-primary mt-2">Organizer Portal</Link>
            </div>
          </div>
        </div>
      </div>

      <div className="row mb-5">
        <div className="col-lg-6 mb-4">
          <h2 className="section-heading">How It Works</h2>
          <ol className="list-group list-group-numbered">
            <li className="list-group-item">Organizers create an event and upload the list of eligible participants</li>
            <li className="list-group-item">The system generates a Merkle Tree from the participant wallet addresses</li>
            <li className="list-group-item">Organizers deploy a smart contract with the Merkle root</li>
            <li className="list-group-item">Students can claim their certificate NFTs if they're on the event's whitelist</li>
            <li className="list-group-item">Certificates are minted as NFTs directly to students' wallets</li>
          </ol>
        </div>
        <div className="col-lg-6">
          <h2 className="section-heading">Why Use Blockchain Certificates?</h2>
          <div className="card mb-3">
            <div className="card-body">
              <h5 className="card-title">🔍 Verifiable</h5>
              <p className="card-text">Anyone can verify the authenticity of a certificate on the blockchain.</p>
            </div>
          </div>
          <div className="card mb-3">
            <div className="card-body">
              <h5 className="card-title">🌐 Portable</h5>
              <p className="card-text">Certificates are stored in your wallet and can be accessed anywhere.</p>
            </div>
          </div>
          <div className="card">
            <div className="card-body">
              <h5 className="card-title">🔄 Transferable</h5>
              <p className="card-text">Share your achievements with others through the blockchain.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage; 