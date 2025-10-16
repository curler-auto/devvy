import axios from 'axios';
import { getMachineId, getMachineName } from '../utils/machineId';

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
      const machineId = await getMachineId();
      
      // Check if there's an activated license for this machine
      const response = await axios.get(`${API_BASE_URL}/api/license/config`, {
        params: { machineId },
      });

      if (response.data.success && response.data.toolConfig) {
        return {
          success: true,
          toolConfig: response.data.toolConfig,
          isActivated: true,
        };
      } else {
        // Return default free config
        return {
          success: true,
          toolConfig: await this.getDefaultConfig(),
          isActivated: false,
        };
      }
    } catch (error) {
      console.error('Error getting license config:', error);
      // Fallback to default config
      return {
        success: true,
        toolConfig: await this.getDefaultConfig(),
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
