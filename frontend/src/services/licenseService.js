import axios from 'axios';
import { getMachineId, getMachineName } from '../utils/machineId';
import upgradeService from './upgradeService';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://127.0.0.1:8001';

/**
 * License Service
 * Handles activation, validation, and tool configuration
 */
class LicenseService {
  /**
   * Activate license with activation key
   */
  async activateLicense(activationKey) {
    try {
      const machineId = await getMachineId();
      const machineName = getMachineName();

      // Call licensing API (mock for now)
      const response = await axios.post(`${API_BASE_URL}/api/license/activate`, {
        activationKey,
        machineId,
        machineName,
      });

      if (response.data.success) {
        // Store the activated config in database
        await this.saveActivatedConfig(response.data.toolConfig, machineId, activationKey);
        
        // Store license data locally for upgrade preservation
        upgradeService.storeLicenseData({
          activationKey,
          isActivated: true,
          licenseType: response.data.toolConfig.licenseType || 'premium',
          activatedAt: new Date().toISOString()
        });
        
        return {
          success: true,
          toolConfig: response.data.toolConfig,
          message: response.data.message,
        };
      } else {
        return {
          success: false,
          message: response.data.message || 'Activation failed',
        };
      }
    } catch (error) {
      console.error('License activation error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to activate license. Please try again.',
      };
    }
  }

  /**
   * Save activated config to database
   */
  async saveActivatedConfig(toolConfig, machineId, activationKey) {
    try {
      await axios.post(`${API_BASE_URL}/api/license/config`, {
        toolConfig,
        machineId,
        activationKey,
        activatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error saving activated config:', error);
      throw error;
    }
  }

  /**
   * Get current license configuration
   */
  async getLicenseConfig() {
    try {
      // Check if this is an upgrade or fresh install
      const upgradeStatus = upgradeService.handleUpgrade();
      console.log('🔄 Upgrade status:', upgradeStatus);
      
      const machineId = await getMachineId();
      
      // Always load the base config first
      const baseConfig = await this.getDefaultConfig();
      
      // For fresh installs, don't even try to get license data
      if (upgradeStatus.isFreshInstall) {
        console.log('🆕 Fresh install - using default config');
        return {
          success: true,
          toolConfig: baseConfig,
          isActivated: false,
        };
      }
      
      // Check if there's an activated license for this machine
      const response = await axios.get(`${API_BASE_URL}/api/license/config`, {
        params: { machineId },
      });

      if (response.data.success && response.data.toolConfig) {
        const licenseData = response.data.toolConfig;
        
        // Merge license data with base config
        const mergedConfig = {
          ...baseConfig,
          isActivated: licenseData.isActivated || false,
          licenseType: licenseData.licenseType || 'free',
          activatedTools: licenseData.activatedTools || [],
        };
        
        console.log('License loaded from server:', {
          isActivated: mergedConfig.isActivated,
          licenseType: mergedConfig.licenseType,
          toolsCount: mergedConfig.tools?.length || 0,
        });
        
        // Store license data for future upgrades
        upgradeService.storeLicenseData({
          isActivated: mergedConfig.isActivated,
          licenseType: mergedConfig.licenseType,
        });
        
        return {
          success: true,
          toolConfig: mergedConfig,
          isActivated: mergedConfig.isActivated,
        };
      } else if (upgradeStatus.isUpgrade && upgradeStatus.preserveLicense) {
        // If this is an upgrade, try to use preserved license data
        const preservedLicense = upgradeService.getPreservedLicenseData();
        
        if (preservedLicense && preservedLicense.isActivated) {
          console.log('📦 Using preserved license data after upgrade:', preservedLicense);
          
          // If we have an activation key, try to reactivate
          if (preservedLicense.activationKey) {
            try {
              console.log('🔄 Auto-reactivating license after upgrade...');
              const reactivationResult = await this.activateLicense(preservedLicense.activationKey);
              
              if (reactivationResult.success) {
                console.log('✅ License auto-reactivated after upgrade');
                return reactivationResult;
              }
            } catch (reactivateError) {
              console.error('Failed to auto-reactivate license:', reactivateError);
            }
          }
          
          // If reactivation failed or no key, use preserved data with base config
          const mergedConfig = {
            ...baseConfig,
            isActivated: preservedLicense.isActivated,
            licenseType: preservedLicense.licenseType || 'free',
          };
          
          return {
            success: true,
            toolConfig: mergedConfig,
            isActivated: mergedConfig.isActivated,
            isPreservedLicense: true,
          };
        }
      }
      
      // Return default free config if no license found
      console.log('No license found, using default config');
      return {
        success: true,
        toolConfig: baseConfig,
        isActivated: false,
      };
    } catch (error) {
      console.error('Error getting license config:', error);
      // Fallback to default config
      const baseConfig = await this.getDefaultConfig();
      return {
        success: true,
        toolConfig: baseConfig,
        isActivated: false,
      };
    }
  }

  /**
   * Get default tool configuration (free tools only)
   */
  async getDefaultConfig() {
    try {
      const response = await fetch('/toolconfig.json');
      const config = await response.json();
      return config;
    } catch (error) {
      console.error('Error loading default config:', error);
      throw error;
    }
  }

  /**
   * Validate if a tool is accessible
   */
  isToolAccessible(tool, toolConfig) {
    if (!tool || !toolConfig) return false;

    // Find tool in config
    const configTool = toolConfig.tools.find(t => t.id === tool.id);
    if (!configTool) return false;

    // Check if enabled
    if (!configTool.enabled) return false;

    // Free tools are always accessible
    if (configTool.tier === 'free') return true;

    // Premium tools require activation
    // This will be checked against the activated config
    return toolConfig.isActivated === true;
  }

  /**
   * Deactivate license (for testing)
   */
  async deactivateLicense() {
    try {
      const machineId = await getMachineId();
      await axios.delete(`${API_BASE_URL}/api/license/config`, {
        params: { machineId },
      });
      return { success: true };
    } catch (error) {
      console.error('Error deactivating license:', error);
      return { success: false, message: error.message };
    }
  }
}

export default new LicenseService();
