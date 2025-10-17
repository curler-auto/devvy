/**
 * JSON Utility Functions
 * Reusable functions for JSON operations across tools
 */

/**
 * Beautify/Format JSON string
 * @param {string} jsonString - JSON string to beautify
 * @param {number} indent - Number of spaces for indentation (default: 2)
 * @returns {Object} - { success: boolean, result: string, error: string }
 */
export const beautifyJSON = (jsonString, indent = 2) => {
  try {
    if (!jsonString || !jsonString.trim()) {
      return {
        success: false,
        result: '',
        error: 'Please enter JSON first'
      };
    }

    const parsed = JSON.parse(jsonString);
    const formatted = JSON.stringify(parsed, null, indent);
    
    return {
      success: true,
      result: formatted,
      error: null
    };
  } catch (err) {
    return {
      success: false,
      result: jsonString,
      error: err.message
    };
  }
};

/**
 * Validate JSON string
 * @param {string} jsonString - JSON string to validate
 * @returns {Object} - { isValid: boolean, error: string }
 */
export const validateJSON = (jsonString) => {
  try {
    if (!jsonString || !jsonString.trim()) {
      return { isValid: false, error: 'Empty input' };
    }
    JSON.parse(jsonString);
    return { isValid: true, error: null };
  } catch (err) {
    return { isValid: false, error: err.message };
  }
};

/**
 * Minify JSON string
 * @param {string} jsonString - JSON string to minify
 * @returns {Object} - { success: boolean, result: string, error: string }
 */
export const minifyJSON = (jsonString) => {
  try {
    if (!jsonString || !jsonString.trim()) {
      return {
        success: false,
        result: '',
        error: 'Please enter JSON first'
      };
    }

    const parsed = JSON.parse(jsonString);
    const minified = JSON.stringify(parsed);
    
    return {
      success: true,
      result: minified,
      error: null
    };
  } catch (err) {
    return {
      success: false,
      result: jsonString,
      error: err.message
    };
  }
};

/**
 * Copy to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} - Success status
 */
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Copy error:', err);
    return false;
  }
};
