/**
 * Upgrade Service
 * Handles version tracking and upgrade detection
 * Used to preserve license data during upgrades but clear it on fresh installs
 */

// App version - update this when releasing new versions
const APP_VERSION = '0.1.0';

// Local storage keys
const APP_VERSION_KEY = 'devvy-app-version';
const INSTALL_ID_KEY = 'devvy-install-id';

/**
 * Get current app version
 */
export const getCurrentVersion = () => {
  return APP_VERSION;
};

/**
 * Generate a unique installation ID
 */
const generateInstallId = () => {
  return `inst_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
};

/**
 * Check if this is a fresh install or an upgrade
 * @returns {Promise<Object>} Status object with isUpgrade, isFirstRun, etc.
 */
export const checkUpgradeStatus = () => {
  try {
    // Get current app version
    const currentVersion = getCurrentVersion();
    
    // Get stored version and install ID
    const storedVersion = localStorage.getItem(APP_VERSION_KEY);
    const storedInstallId = localStorage.getItem(INSTALL_ID_KEY);
    
    // Determine if this is a fresh install, upgrade, or same version
    const isFirstRun = !storedVersion;
    const isUpgrade = storedVersion && storedVersion !== currentVersion;
    const isFreshInstall = !storedInstallId;
    
    // For first run or if no install ID exists, generate and store a new install ID
    if (isFirstRun || isFreshInstall) {
      const newInstallId = generateInstallId();
      localStorage.setItem(INSTALL_ID_KEY, newInstallId);
    }
    
    // Always update the stored version to current
    localStorage.setItem(APP_VERSION_KEY, currentVersion);
    
    // Return status object
    return {
      currentVersion,
      previousVersion: storedVersion,
      isFirstRun,
      isUpgrade,
      isFreshInstall,
      installId: localStorage.getItem(INSTALL_ID_KEY),
    };
  } catch (error) {
    console.error('Error checking upgrade status:', error);
    return {
      error: true,
      message: error.message,
      isFirstRun: true, // Assume first run on error
      isUpgrade: false,
      isFreshInstall: true,
    };
  }
};

/**
 * Handle app upgrade
 * - Preserve license data during upgrades
 * - Clear license data on fresh installs
 */
export const handleUpgrade = () => {
  const status = checkUpgradeStatus();
  
  console.log('📦 App upgrade status:', status);
  
  if (status.isUpgrade) {
    console.log(`🔄 Upgrading from ${status.previousVersion} to ${status.currentVersion}`);
    // Preserve license data during upgrade
    // (License data is already stored in backend or localStorage)
    
    // Show upgrade notification
    return {
      isUpgrade: true,
      message: `Upgraded from ${status.previousVersion} to ${status.currentVersion}`,
      preserveLicense: true,
    };
  }
  
  if (status.isFirstRun || status.isFreshInstall) {
    console.log('🆕 Fresh installation detected');
    // Clear any existing license data on fresh install
    localStorage.removeItem('devvy-license-key');
    localStorage.removeItem('devvy-license-status');
    
    return {
      isUpgrade: false,
      isFreshInstall: true,
      message: 'Fresh installation detected',
      preserveLicense: false,
    };
  }
  
  return {
    isUpgrade: false,
    isFreshInstall: false,
    message: 'No changes detected',
    preserveLicense: true,
  };
};

/**
 * Store license data for preservation during upgrades
 */
export const storeLicenseData = (licenseData) => {
  try {
    if (!licenseData) return;
    
    // Store minimal license data locally
    localStorage.setItem('devvy-license-key', licenseData.activationKey || '');
    localStorage.setItem('devvy-license-status', JSON.stringify({
      isActivated: licenseData.isActivated || false,
      licenseType: licenseData.licenseType || 'free',
      activatedAt: licenseData.activatedAt || new Date().toISOString(),
    }));
    
    console.log('✅ License data stored for upgrade preservation');
  } catch (error) {
    console.error('Failed to store license data:', error);
  }
};

/**
 * Get preserved license data after upgrade
 */
export const getPreservedLicenseData = () => {
  try {
    const licenseKey = localStorage.getItem('devvy-license-key');
    const licenseStatusStr = localStorage.getItem('devvy-license-status');
    
    if (!licenseKey || !licenseStatusStr) return null;
    
    const licenseStatus = JSON.parse(licenseStatusStr);
    
    return {
      activationKey: licenseKey,
      ...licenseStatus,
    };
  } catch (error) {
    console.error('Failed to retrieve preserved license data:', error);
    return null;
  }
};

export default {
  checkUpgradeStatus,
  handleUpgrade,
  getCurrentVersion,
  storeLicenseData,
  getPreservedLicenseData,
};
