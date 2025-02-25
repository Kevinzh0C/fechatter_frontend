/**
 * SSL Certificate Handler
 * Helps users handle self-signed certificate issues
 */

const BACKEND_URL = 'https://45.77.178.85:8443';

/**
 * Check if backend is accessible
 */
export async function checkBackendSSL() {
  try {
    const response = await fetch(`${BACKEND_URL}/health`, {
      method: 'GET',
      mode: 'cors'
    });
    return response.ok;
  } catch (error) {
    if (error.message.includes('certificate') || error.message.includes('SSL')) {
      return 'ssl_error';
    }
    return false;
  }
}

/**
 * Open backend URL in new tab for certificate acceptance
 */
export function openBackendForCertificateAcceptance() {
  const url = `${BACKEND_URL}/health`;
  window.open(url, '_blank');
}

/**
 * Show SSL certificate instructions
 */
export function getSSLInstructions() {
  return {
    title: 'SSL Certificate Setup Required',
    message: 'To use Fechatter, you need to accept the backend SSL certificate.',
    steps: [
      '1. Click "Accept Certificate" button below',
      '2. A new tab will open to the backend server',
      '3. Click "Advanced" or "Show Details"',
      '4. Click "Proceed to 45.77.178.85 (unsafe)" or "Accept Risk"',
      '5. Close the tab and return here',
      '6. Refresh this page and try logging in again'
    ],
    buttonText: 'Accept Certificate',
    action: openBackendForCertificateAcceptance
  };
}

/**
 * Create SSL error component data
 */
export function createSSLErrorComponent() {
  return {
    show: true,
    instructions: getSSLInstructions(),
    onAccept: openBackendForCertificateAcceptance,
    onRetry: () => window.location.reload()
  };
} 