import { useState } from 'react';
import {
  generateMultipleDesigns,
  generateCompleteCertificate
} from '../utils/aiCertificateGenerator';

const AICertificateGenerator = ({ onCertificateGenerated }) => {
  console.log('🎯 AICertificateGenerator initialized with callback:', !!onCertificateGenerated);
  const [eventData, setEventData] = useState({
    name: '',
    category: 'academic',
    date: '',
    description: ''
  });
  
  const [designOptions, setDesignOptions] = useState({
    style: 'academic',
    customPrompt: ''
  });

  const [organizerData, setOrganizerData] = useState({
    name: '',
    organizationName: '',
    title: ''
  });
  
  const [generatedDesigns, setGeneratedDesigns] = useState([]);
  const [selectedDesign, setSelectedDesign] = useState(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Input, 2: Generate, 3: Preview, 4: Complete
  const [finalCertificate, setFinalCertificate] = useState(null);

  const designStyles = [
    { value: 'academic', label: '🎓 Academic', description: 'Traditional, formal, university-style' },
    { value: 'corporate', label: '💼 Corporate', description: 'Professional, modern, business-focused' },
    { value: 'creative', label: '🎨 Creative', description: 'Artistic, innovative, contemporary' },
    { value: 'tech', label: '💻 Technology', description: 'Futuristic, digital, high-tech' },
    { value: 'conference', label: '🏛️ Conference', description: 'Event-focused, professional, memorable' }
  ];

  const categories = [
    'academic', 'corporate', 'technology', 'healthcare', 'education', 
    'arts', 'science', 'business', 'conference', 'workshop'
  ];

  // Handle form input changes
  const handleEventDataChange = (field, value) => {
    setEventData(prev => ({ ...prev, [field]: value }));
  };

  const handleDesignOptionsChange = (field, value) => {
    setDesignOptions(prev => ({ ...prev, [field]: value }));
  };

  const handleOrganizerDataChange = (field, value) => {
    setOrganizerData(prev => ({ ...prev, [field]: value }));
  };

  // Generate multiple design options
  const handleGenerateDesigns = async () => {
    if (!eventData.name.trim()) {
      alert('Please enter an event name');
      return;
    }

    setLoading(true);
    try {
      const styles = [designOptions.style];
      if (designOptions.style === 'academic') {
        styles.push('corporate', 'creative');
      } else {
        styles.push('academic', 'creative');
      }

      const result = await generateMultipleDesigns(eventData, styles, organizerData);
      
      if (result.success) {
        setGeneratedDesigns(result.designs);
        setStep(2);
      } else {
        alert('Failed to generate designs: ' + result.error);
      }
    } catch (error) {
      alert('Error generating designs: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Select a design and move to preview
  const handleSelectDesign = (design) => {
    setSelectedDesign(design);
    setStep(3);
  };

  // Generate final certificate with selected design
  const handleGenerateFinalCertificate = async () => {
    if (!selectedDesign) return;

    setLoading(true);
    try {
      const result = await generateCompleteCertificate(eventData, {
        style: selectedDesign.style,
        customPrompt: designOptions.customPrompt
      }, organizerData);

      if (result.success) {
        setFinalCertificate(result);
        setStep(4);

        console.log('✅ Final certificate generated successfully');
        console.log('📦 Certificate data:', result);

        // Don't call onCertificateGenerated here - wait for user to click Continue button
        // This allows user to review the certificate first
      } else {
        console.error('❌ Failed to generate final certificate:', result.error);
        alert('Failed to generate final certificate: ' + result.error);
      }
    } catch (error) {
      alert('Error generating final certificate: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Reset to start over
  const handleStartOver = () => {
    setEventData({ name: '', category: 'academic', date: '', description: '' });
    setDesignOptions({ style: 'academic', customPrompt: '' });
    setOrganizerData({ name: '', organizationName: '', title: '' });
    setGeneratedDesigns([]);
    setSelectedDesign(null);
    setFinalCertificate(null);
    setStep(1);
  };

  return (
    <div className="ai-certificate-generator">
      <div className="card">
        <div className="card-header bg-gradient-primary text-white">
          <h4 className="mb-0">🤖 AI Certificate Design Generator</h4>
          <small>Create unique, professional certificate designs using AI</small>
        </div>
        
        <div className="card-body">
          {/* Progress Steps */}
          <div className="row mb-4">
            <div className="col-12">
              <div className="progress mb-2" style={{height: '8px'}}>
                <div 
                  className="progress-bar bg-primary" 
                  style={{width: `${(step / 4) * 100}%`}}
                ></div>
              </div>
              <div className="d-flex justify-content-between small text-muted">
                <span className={step >= 1 ? 'text-primary fw-bold' : ''}>1. Event Details</span>
                <span className={step >= 2 ? 'text-primary fw-bold' : ''}>2. Design Options</span>
                <span className={step >= 3 ? 'text-primary fw-bold' : ''}>3. Preview</span>
                <span className={step >= 4 ? 'text-primary fw-bold' : ''}>4. Complete</span>
              </div>
            </div>
          </div>

          {/* Step 1: Event Details Input */}
          {step === 1 && (
            <div>
              <h5>📝 Event Information</h5>
              <div className="row">
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">Event Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={eventData.name}
                      onChange={(e) => handleEventDataChange('name', e.target.value)}
                      placeholder="e.g., ISFCR Conference 2024"
                    />
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label">Category</label>
                    <select
                      className="form-select"
                      value={eventData.category}
                      onChange={(e) => handleEventDataChange('category', e.target.value)}
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>
                          {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label">Event Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={eventData.date}
                      onChange={(e) => handleEventDataChange('date', e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">Description</label>
                    <textarea
                      className="form-control"
                      rows="2"
                      value={eventData.description}
                      onChange={(e) => handleEventDataChange('description', e.target.value)}
                      placeholder="Brief description of the event or achievement"
                    />
                  </div>

                  <div className="row">
                    <div className="col-6">
                      <div className="mb-3">
                        <label className="form-label">Organizer Name</label>
                        <input
                          type="text"
                          className="form-control"
                          value={organizerData.name}
                          onChange={(e) => handleOrganizerDataChange('name', e.target.value)}
                          placeholder="Your name"
                        />
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="mb-3">
                        <label className="form-label">Organization</label>
                        <input
                          type="text"
                          className="form-control"
                          value={organizerData.organizationName}
                          onChange={(e) => handleOrganizerDataChange('organizationName', e.target.value)}
                          placeholder="Organization name"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label">Design Style</label>
                    <div className="row">
                      {designStyles.map(style => (
                        <div key={style.value} className="col-12 mb-2">
                          <div 
                            className={`card cursor-pointer ${designOptions.style === style.value ? 'border-primary bg-light' : ''}`}
                            onClick={() => handleDesignOptionsChange('style', style.value)}
                          >
                            <div className="card-body py-2">
                              <div className="d-flex align-items-center">
                                <input
                                  type="radio"
                                  className="form-check-input me-2"
                                  checked={designOptions.style === style.value}
                                  readOnly
                                />
                                <div>
                                  <strong>{style.label}</strong>
                                  <br />
                                  <small className="text-muted">{style.description}</small>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mb-3">
                <label className="form-label">Custom Design Instructions (Optional)</label>
                <textarea
                  className="form-control"
                  rows="2"
                  value={designOptions.customPrompt}
                  onChange={(e) => handleDesignOptionsChange('customPrompt', e.target.value)}
                  placeholder="Any specific design requirements or preferences..."
                />
              </div>
              
              <div className="text-center">
                <button 
                  className="btn btn-primary btn-lg"
                  onClick={handleGenerateDesigns}
                  disabled={loading || !eventData.name.trim()}
                >
                  {loading ? '🎨 Generating Designs...' : '🎨 Generate AI Designs'}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Design Selection */}
          {step === 2 && (
            <div>
              <h5>🎨 Choose Your Design</h5>
              <p className="text-muted">Select the design that best fits your event:</p>
              
              <div className="row">
                {generatedDesigns.map((design, index) => (
                  <div key={design.id} className="col-md-4 mb-3">
                    <div className="card h-100">
                      <img 
                        src={design.imageUrl} 
                        className="card-img-top" 
                        alt={`Design ${index + 1}`}
                        style={{height: '200px', objectFit: 'cover'}}
                      />
                      <div className="card-body">
                        <h6 className="card-title">
                          {designStyles.find(s => s.value === design.style)?.label || design.style}
                        </h6>
                        <p className="card-text small">
                          {designStyles.find(s => s.value === design.style)?.description}
                        </p>
                        <button 
                          className="btn btn-primary w-100"
                          onClick={() => handleSelectDesign(design)}
                        >
                          Select This Design
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="text-center mt-3">
                <button className="btn btn-outline-secondary" onClick={() => setStep(1)}>
                  ← Back to Edit Details
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Preview */}
          {step === 3 && selectedDesign && (
            <div>
              <h5>👀 Preview Selected Design</h5>
              
              <div className="row">
                <div className="col-md-6">
                  <img 
                    src={selectedDesign.imageUrl} 
                    className="img-fluid rounded border"
                    alt="Selected Design"
                  />
                </div>
                <div className="col-md-6">
                  <h6>Design Details:</h6>
                  <ul className="list-unstyled">
                    <li><strong>Style:</strong> {designStyles.find(s => s.value === selectedDesign.style)?.label}</li>
                    <li><strong>Event:</strong> {eventData.name}</li>
                    <li><strong>Category:</strong> {eventData.category}</li>
                    <li><strong>AI Service:</strong> {selectedDesign.service}</li>
                  </ul>
                  
                  <div className="alert alert-info">
                    <h6>🎯 What happens next:</h6>
                    <ul className="mb-0">
                      <li>✅ Generate final certificate metadata</li>
                      <li>✅ Upload design and data to IPFS</li>
                      <li>✅ Auto-fill certificate creation form</li>
                      <li>✅ Skip to participant addresses step</li>
                      <li>🚀 Ready for smart contract deployment!</li>
                    </ul>
                  </div>
                  
                  <div className="d-grid gap-2">
                    <button 
                      className="btn btn-success btn-lg"
                      onClick={handleGenerateFinalCertificate}
                      disabled={loading}
                    >
                      {loading ? '🚀 Creating Certificate...' : '🚀 Generate Final Certificate'}
                    </button>
                    <button 
                      className="btn btn-outline-secondary"
                      onClick={() => setStep(2)}
                    >
                      ← Choose Different Design
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Complete */}
          {step === 4 && finalCertificate && (
            <div>
              <div className="alert alert-success">
                <h5>🎉 AI Certificate Generated Successfully!</h5>
                <p className="mb-2">Your AI-generated certificate is ready for deployment.</p>
                <div className="row">
                  <div className="col-md-6">
                    <strong>✅ What's Ready:</strong>
                    <ul className="mb-0">
                      <li>Certificate design created</li>
                      <li>Metadata generated</li>
                      <li>Uploaded to IPFS</li>
                      <li>Token URI created</li>
                    </ul>
                  </div>
                  <div className="col-md-6">
                    <strong>🚀 Next Steps:</strong>
                    <ul className="mb-0">
                      <li>Form will be auto-filled</li>
                      <li>Add participant addresses</li>
                      <li>Deploy smart contract</li>
                      <li>Start issuing certificates!</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <div className="row">
                <div className="col-md-6">
                  <img 
                    src={finalCertificate.design.imageUrl} 
                    className="img-fluid rounded border"
                    alt="Final Certificate"
                  />
                </div>
                <div className="col-md-6">
                  <h6>📋 Certificate Details:</h6>
                  <div className="card">
                    <div className="card-body">
                      <p><strong>Token URI:</strong></p>
                      <code className="small d-block bg-light p-2 rounded">
                        {finalCertificate.tokenURI}
                      </code>
                      
                      <p className="mt-3"><strong>IPFS Gateway:</strong></p>
                      <a 
                        href={finalCertificate.ipfs.gatewayUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="btn btn-sm btn-outline-primary"
                      >
                        View on IPFS
                      </a>
                      
                      <p className="mt-3"><strong>Design Style:</strong> {selectedDesign.style}</p>
                      <p><strong>AI Service:</strong> {finalCertificate.design.service}</p>
                    </div>
                  </div>
                  
                  <div className="d-grid gap-2 mt-3">
                    <button
                      className="btn btn-success btn-lg"
                      onClick={() => {
                        console.log('🚀 Continue to Certificate Creation clicked');

                        if (onCertificateGenerated && finalCertificate) {
                          console.log('📤 Switching to certificate creation with data:', finalCertificate);
                          onCertificateGenerated(finalCertificate);
                        } else {
                          console.error('❌ Missing callback or certificate data');
                          console.error('- onCertificateGenerated:', !!onCertificateGenerated);
                          console.error('- finalCertificate:', !!finalCertificate);
                          alert('Error: Cannot proceed to certificate creation. Please try generating the certificate again.');
                        }
                      }}
                    >
                      🚀 Continue to Certificate Creation
                    </button>
                    <button
                      className="btn btn-outline-primary"
                      onClick={() => {
                        navigator.clipboard.writeText(finalCertificate.tokenURI);
                        alert('Token URI copied to clipboard!');
                      }}
                    >
                      📋 Copy Token URI
                    </button>
                    <button
                      className="btn btn-outline-secondary"
                      onClick={handleStartOver}
                    >
                      🔄 Generate Another Certificate
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AICertificateGenerator;
