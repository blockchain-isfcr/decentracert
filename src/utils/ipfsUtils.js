/**
 * Convert a file to base64 string
 */
export const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      // Remove the data URL prefix (e.g., "data:image/png;base64,")
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
};

/**
 * Upload file to IPFS via Vercel API
 */
export const uploadFileToIPFS = async (file, metadata = {}) => {
  try {
    console.log('📤 Converting file to base64...');
    const fileData = await fileToBase64(file);
    
    const uploadData = {
      fileData,
      fileName: file.name,
      fileType: file.type,
      metadata
    };

    console.log('📤 Sending to Vercel API...');
    const response = await fetch('/api/upload-ipfs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(uploadData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Server response error:', errorText);
      
      let errorMessage = 'Failed to upload to IPFS';
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error || errorMessage;
      } catch (parseError) {
        console.error('❌ Could not parse error response:', parseError);
        errorMessage = `Server error: ${response.status} ${response.statusText}`;
      }
      
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log('✅ File uploaded successfully:', result.ipfsHash);
    return result.ipfsHash;
  } catch (error) {
    console.error('❌ Error uploading file to IPFS:', error);
    throw error;
  }
};

/**
 * Upload metadata to IPFS
 */
export const uploadMetadataToIPFS = async (metadata) => {
  try {
    console.log('📤 Uploading metadata to IPFS...');
    
    const response = await fetch('/api/upload-metadata', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metadata),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Metadata upload error:', errorText);
      
      let errorMessage = 'Failed to upload metadata to IPFS';
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error || errorMessage;
      } catch (parseError) {
        console.error('❌ Could not parse error response:', parseError);
        errorMessage = `Server error: ${response.status} ${response.statusText}`;
      }
      
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log('✅ Metadata uploaded successfully:', result.ipfsHash);
    return result.ipfsHash;
  } catch (error) {
    console.error('❌ Error uploading metadata to IPFS:', error);
    throw error;
  }
};

/**
 * Upload data URL (from canvas or AI generation) to IPFS
 */
export const uploadDataUrlToIPFS = async (dataUrl, fileName = 'certificate.png', metadata = {}) => {
  try {
    console.log('📤 Converting data URL to base64...');
    
    // Convert data URL to base64
    const base64 = dataUrl.split(',')[1];
    
    const uploadData = {
      fileData: base64,
      fileName,
      fileType: 'image/png',
      metadata
    };

    console.log('📤 Sending to Vercel API...');
    const response = await fetch('/api/upload-ipfs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(uploadData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Server response error:', errorText);
      
      let errorMessage = 'Failed to upload to IPFS';
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error || errorMessage;
      } catch (parseError) {
        console.error('❌ Could not parse error response:', parseError);
        errorMessage = `Server error: ${response.status} ${response.statusText}`;
      }
      
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log('✅ Data URL uploaded successfully:', result.ipfsHash);
    return result.ipfsHash;
  } catch (error) {
    console.error('❌ Error uploading data URL to IPFS:', error);
    throw error;
  }
}; 