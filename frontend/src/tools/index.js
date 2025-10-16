/**
 * Tool Registry
 * Central registry for all tools in the application
 * 
 * This file manages:
 * - Tool imports
 * - Tool metadata
 * - Tool routing
 * - Tool availability
 * 
 * To add a new tool:
 * 1. Create component in tools/ directory
 * 2. Import it here
 * 3. Add to TOOL_COMPONENTS object
 * 4. Tool will be automatically available based on toolconfig.json
 */

import JSONBeautifier from './JSONBeautifier';
// Import other tools here as they are created
// import JSONValidator from './JSONValidator';
// import Base64Encoder from './Base64Encoder';
// import URLEncoder from './URLEncoder';
// import RestApiTester from './RestApiTester';
// etc...

/**
 * Tool Components Registry
 * Maps tool IDs to their React components
 */
export const TOOL_COMPONENTS = {
  'json-beautifier': JSONBeautifier,
  // Add more tools here:
  // 'json-validator': JSONValidator,
  // 'base64-encoder': Base64Encoder,
  // 'url-encoder': URLEncoder,
  // 'rest-api-tester': RestApiTester,
  // 'grpc-tester': GrpcTester,
  // 'graphql-playground': GraphQLPlayground,
  // 'websocket-tester': WebSocketTester,
  // 'ui-recorder': UiRecorder,
  // 'diff-checker': DiffChecker,
  // 'jwt-decoder': JWTDecoder,
  // 'hash-generator': HashGenerator,
  // 'uuid-generator': UUIDGenerator,
  // 'regex-tester': RegexTester,
  // 'markdown-preview': MarkdownPreview,
  // 'xml-formatter': XMLFormatter,
  // 'yaml-formatter': YAMLFormatter,
  // 'sql-formatter': SQLFormatter,
  // 'color-picker': ColorPicker,
  // 'cron-builder': CronBuilder,
  // 'image-optimizer': ImageOptimizer,
};

/**
 * Get tool component by ID
 * @param {string} toolId - Tool identifier
 * @returns {React.Component|null} Tool component or null if not found
 */
export const getToolComponent = (toolId) => {
  return TOOL_COMPONENTS[toolId] || null;
};

/**
 * Get tool metadata
 * @param {string} toolId - Tool identifier
 * @returns {Object|null} Tool metadata or null if not found
 */
export const getToolMetadata = (toolId) => {
  const component = TOOL_COMPONENTS[toolId];
  return component?.metadata || null;
};

/**
 * Check if tool requires backend
 * @param {string} toolId - Tool identifier
 * @returns {boolean} True if tool requires backend API
 */
export const toolRequiresBackend = (toolId) => {
  const metadata = getToolMetadata(toolId);
  return metadata?.requiresBackend || false;
};

/**
 * Get all registered tools
 * @returns {Array} Array of tool IDs
 */
export const getAllToolIds = () => {
  return Object.keys(TOOL_COMPONENTS);
};

/**
 * Check if tool is registered
 * @param {string} toolId - Tool identifier
 * @returns {boolean} True if tool is registered
 */
export const isToolRegistered = (toolId) => {
  return toolId in TOOL_COMPONENTS;
};

/**
 * Tool Categories
 * Helps organize tools by functionality
 */
export const TOOL_CATEGORIES = {
  JSON: 'json',
  API: 'api',
  AUTOMATION: 'automation',
  ENCODING: 'encoding',
  FORMATTING: 'formatting',
  UTILITIES: 'utilities',
  TESTING: 'testing',
  CONVERSION: 'conversion',
};

/**
 * Get tools by category
 * @param {string} category - Category identifier
 * @returns {Array} Array of tool IDs in the category
 */
export const getToolsByCategory = (category) => {
  return Object.entries(TOOL_COMPONENTS)
    .filter(([_, component]) => component.metadata?.category === category)
    .map(([id]) => id);
};

export default TOOL_COMPONENTS;
