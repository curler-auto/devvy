/**
 * Generate a unique machine identifier
 * This combines various system properties to create a fingerprint
 */
export const getMachineId = async () => {
  try {
    // Get system information from various sources
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('fingerprint', 2, 2);
    const canvasFingerprint = canvas.toDataURL();

    const screenFingerprint = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
    const timezoneFingerprint = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const languageFingerprint = navigator.language;
    const platformFingerprint = navigator.platform;
    const hardwareConcurrency = navigator.hardwareConcurrency || 'unknown';
    const deviceMemory = navigator.deviceMemory || 'unknown';

    // Combine all fingerprints
    const combined = `${canvasFingerprint}|${screenFingerprint}|${timezoneFingerprint}|${languageFingerprint}|${platformFingerprint}|${hardwareConcurrency}|${deviceMemory}`;

    // Generate hash
    const hash = await hashString(combined);
    return hash;
  } catch (error) {
    console.error('Error generating machine ID:', error);
    // Fallback to a simpler fingerprint
    return `${navigator.platform}-${navigator.language}-${Date.now()}`;
  }
};

/**
 * Get machine name (hostname)
 */
export const getMachineName = () => {
  // In browser, we can't get the actual hostname
  // But we can get user agent and platform info
  return `${navigator.platform}-${navigator.userAgent.split(' ').pop()}`;
};

/**
 * Simple hash function
 */
async function hashString(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}
