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
import YAMLFormatter from './YAMLFormatter';
import XMLFormatter from './XMLFormatter';
import TOMLFormatter from './TOMLFormatter';
import JSONCompare from './JSONCompare';
import JSONPathFinder from './JSONPathFinder';
import JSONPathExtract from './JSONPathExtract';
import JSONTreeView from './JSONTreeView';
import JSONAggregator from './JSONAggregator';
import JSONFilter from './JSONFilter';
import RandomJSONGenerator from './RandomJSONGenerator';
import FlattenJSON from './FlattenJSON';
import UnflattenJSON from './UnflattenJSON';
import JSONEscapeUnescape from './JSONEscapeUnescape';
import RandomXMLGenerator from './RandomXMLGenerator';
import FakerTool from './FakerTool';
import DataGenerator from './DataGenerator';
import YAMLToJSON from './YAMLToJSON';
import JSONToYAML from './JSONToYAML';
import JSONToXML from './JSONToXML';
import XMLToJSON from './XMLToJSON';
import YAMLToTOML from './YAMLToTOML';
import TOMLToYAML from './TOMLToYAML';
import JSONToTOML from './JSONToTOML';
import TOMLToJSON from './TOMLToJSON';
import SQLFormatter from './SQLFormatter';
import JSONSchemaValidator from './JSONSchemaValidator';
import TimestampConverter from './TimestampConverter';
import HashGenerator from './HashGenerator';
import UUIDGenerator from './UUIDGenerator';
import JWTDecoder from './JWTDecoder';
import Base64Tool from './Base64Tool';
import StringOperations from './StringOperations';
import QRCodeGenerator from './QRCodeGenerator';
import RegexTester from './RegexTester';
import MarkdownVisualizer from './MarkdownVisualizer';
import SSHKeyGenerator from './SSHKeyGenerator';
import SSLCertGenerator from './SSLCertGenerator';
import TOTPGenerator from './TOTPGenerator';
import ShellExecutor from './ShellExecutor';
import CronManager from './CronManager';
import S3Visualizer from './S3Visualizer';
import SwaggerPayloadBuilder from './SwaggerPayloadBuilder';
import RepaymentCalculator from './RepaymentCalculator';
import DockerUI from './DockerUI';
import CodeCompare from './CodeCompare';
import KafkaTopicViewer from './KafkaTopicViewer';
import FilebeatViewer from './FilebeatViewer';
import VectorViewer from './VectorViewer';
import DataCompare from './DataCompare';
import CodeExecutor from './CodeExecutor';

/**
 * Tool Components Registry
 * Maps tool IDs to their React components
 */
export const TOOL_COMPONENTS = {
  'json-beautifier': JSONBeautifier,
  'yaml-formatter': YAMLFormatter,
  'xml-formatter': XMLFormatter,
  'toml-formatter': TOMLFormatter,
  'json-compare': JSONCompare,
  'json-path-finder': JSONPathFinder,
  'json-path-extract': JSONPathExtract,
  'json-tree-view': JSONTreeView,
  'json-aggregator': JSONAggregator,
  'json-filter': JSONFilter,
  'random-json-generator': RandomJSONGenerator,
  'flatten-json': FlattenJSON,
  'unflatten-json': UnflattenJSON,
  'json-escape-unescape': JSONEscapeUnescape,
  'random-xml-generator': RandomXMLGenerator,
  'faker-tool': FakerTool,
  'data-generator': DataGenerator,
  'yaml-to-json': YAMLToJSON,
  'json-to-yaml': JSONToYAML,
  'json-to-xml': JSONToXML,
  'xml-to-json': XMLToJSON,
  'yaml-to-toml': YAMLToTOML,
  'toml-to-yaml': TOMLToYAML,
  'json-to-toml': JSONToTOML,
  'toml-to-json': TOMLToJSON,
  'sql-formatter': SQLFormatter,
  'json-schema-validator': JSONSchemaValidator,
  'timestamp-converter': TimestampConverter,
  'hash-generator': HashGenerator,
  'uuid-generator': UUIDGenerator,
  'jwt-decoder': JWTDecoder,
  'base64-encoder': Base64Tool,
  'string-operations': StringOperations,
  'qr-code-generator': QRCodeGenerator,
  'regex-tester': RegexTester,
  'markdown-preview': MarkdownVisualizer,
  'ssh-key-generator': SSHKeyGenerator,
  'ssl-cert-generator': SSLCertGenerator,
  'totp-generator': TOTPGenerator,
  'shell-executor': ShellExecutor,
  'cron-manager': CronManager,
  's3-visualizer': S3Visualizer,
  'swagger-payload-builder': SwaggerPayloadBuilder,
  'repayment-calculator': RepaymentCalculator,
  'docker-ui': DockerUI,
  'code-compare': CodeCompare,
  'kafka-topic-viewer': KafkaTopicViewer,
  'filebeat-viewer': FilebeatViewer,
  'vector-viewer': VectorViewer,
  'data-compare': DataCompare,
  'code-executor': CodeExecutor,
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
  XML: 'xml',
  YAML: 'yaml',
  TOML: 'toml',
  API: 'api',
  AUTOMATION: 'automation',
  ENCODING: 'encoding',
  FORMATTERS: 'formatters',
  UTILITIES: 'utilities',
  TESTING: 'testing',
  CONVERTERS: 'converters',
  GENERATORS: 'generators',
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
