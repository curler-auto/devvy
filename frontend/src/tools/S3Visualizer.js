import React, { useState, useEffect } from 'react';
import { 
  FolderOpen, File, Upload, Download, Trash2, RefreshCw, 
  Settings, Database, ArrowLeft, Search, Eye, Copy, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';

/**
 * AWS S3 Visualizer
 * Browse S3 buckets with LocalStack support
 * Uses environment variables: AWS_ENDPOINT, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION
 */
function S3Visualizer({ tab, tabs, setTabs }) {
  const [buckets, setBuckets] = useState([]);
  const [currentBucket, setCurrentBucket] = useState(null);
  const [currentPath, setCurrentPath] = useState('');
  const [objects, setObjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState('');
  const [copiedUrl, setCopiedUrl] = useState(null);
  
  // Connection settings (from environment variables)
  const [config, setConfig] = useState({
    endpoint: '',
    accessKeyId: '',
    secretAccessKey: '',
    region: 'us-east-1',
    useLocalStack: false
  });

  // Load environment variables
  useEffect(() => {
    loadEnvConfig();
  }, []);

  const loadEnvConfig = async () => {
    try {
      const response = await axios.get('/api/env/get-all');
      const env = response.data.variables || {};
      
      setConfig({
        endpoint: env.AWS_ENDPOINT || '',
        accessKeyId: env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY || '',
        region: env.AWS_REGION || 'us-east-1',
        useLocalStack: env.AWS_ENDPOINT?.includes('localstack') || false
      });
    } catch (err) {
      console.log('No environment variables configured');
    }
  };

  // List buckets
  const listBuckets = async () => {
    if (!config.accessKeyId || !config.secretAccessKey) {
      toast.error('AWS credentials not configured. Please set environment variables.');
      setShowSettings(true);
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/api/s3/list-buckets', config);
      setBuckets(response.data.buckets || []);
      toast.success(`Found ${response.data.buckets?.length || 0} buckets`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to list buckets');
    } finally {
      setLoading(false);
    }
  };

  // List objects in bucket
  const listObjects = async (bucket, prefix = '') => {
    setLoading(true);
    try {
      const response = await axios.post('/api/s3/list-objects', {
        ...config,
        bucket,
        prefix
      });
      
      setObjects(response.data.objects || []);
      setCurrentBucket(bucket);
      setCurrentPath(prefix);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to list objects');
    } finally {
      setLoading(false);
    }
  };

  // Navigate to folder
  const navigateToFolder = (folderKey) => {
    listObjects(currentBucket, folderKey);
  };

  // Go back
  const goBack = () => {
    if (!currentPath) {
      setCurrentBucket(null);
      setObjects([]);
      return;
    }
    
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    const newPath = parts.length > 0 ? parts.join('/') + '/' : '';
    listObjects(currentBucket, newPath);
  };

  // Download file
  const downloadFile = async (key) => {
    try {
      const response = await axios.post('/api/s3/download', {
        ...config,
        bucket: currentBucket,
        key
      }, { responseType: 'blob' });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', key.split('/').pop());
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('File downloaded');
    } catch (err) {
      toast.error('Failed to download file');
    }
  };

  // Delete object
  const deleteObject = async (key, isFolder = false) => {
    if (!window.confirm(`Delete ${isFolder ? 'folder' : 'file'}: ${key}?`)) return;

    try {
      await axios.post('/api/s3/delete', {
        ...config,
        bucket: currentBucket,
        key
      });
      
      toast.success('Deleted successfully');
      listObjects(currentBucket, currentPath);
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  // Preview file
  const previewFile = async (key) => {
    try {
      const response = await axios.post('/api/s3/preview', {
        ...config,
        bucket: currentBucket,
        key
      });
      
      setPreviewContent(response.data.content);
      setSelectedFile(key);
      setShowPreview(true);
    } catch (err) {
      toast.error('Failed to preview file');
    }
  };

  // Get presigned URL
  const getPresignedUrl = async (key) => {
    try {
      const response = await axios.post('/api/s3/presigned-url', {
        ...config,
        bucket: currentBucket,
        key
      });
      
      await navigator.clipboard.writeText(response.data.url);
      setCopiedUrl(key);
      setTimeout(() => setCopiedUrl(null), 2000);
      toast.success('URL copied to clipboard');
    } catch (err) {
      toast.error('Failed to generate URL');
    }
  };

  // Upload file
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('config', JSON.stringify(config));
    formData.append('bucket', currentBucket);
    formData.append('prefix', currentPath);

    try {
      await axios.post('/api/s3/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      toast.success('File uploaded');
      listObjects(currentBucket, currentPath);
    } catch (err) {
      toast.error('Failed to upload file');
    }
    
    event.target.value = '';
  };

  // Format file size
  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Filter objects by search
  const filteredObjects = objects.filter(obj => 
    obj.key.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">S3 Visualizer</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {config.useLocalStack ? '🟢 LocalStack' : '🔵 AWS S3'} • 
            {currentBucket ? ` ${currentBucket}${currentPath ? '/' + currentPath : ''}` : ' Select a bucket'}
          </p>
        </div>
        <div className="flex gap-2">
          {currentBucket && (
            <>
              <label>
                <Button as="span" size="sm" variant="outline">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </Button>
                <input type="file" onChange={handleFileUpload} className="hidden" />
              </label>
              <Button onClick={goBack} size="sm" variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </>
          )}
          <Button onClick={() => currentBucket ? listObjects(currentBucket, currentPath) : listBuckets()} size="sm" variant="outline" disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => setShowSettings(true)} size="sm" variant="outline">
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Search */}
      {currentBucket && objects.length > 0 && (
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files and folders..."
              className="w-full pl-10 pr-4 py-2 border rounded bg-[var(--bg-secondary)] border-[var(--border-primary)] text-[var(--text-primary)]"
            />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {!currentBucket ? (
          /* Buckets List */
          <div>
            {buckets.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <Database className="w-16 h-16 text-[var(--text-secondary)] mb-4" />
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">No Buckets</h3>
                <p className="text-sm text-[var(--text-secondary)] mb-4">
                  {config.accessKeyId ? 'Click refresh to load buckets' : 'Configure AWS credentials first'}
                </p>
                <Button onClick={config.accessKeyId ? listBuckets : () => setShowSettings(true)} size="sm">
                  {config.accessKeyId ? 'Load Buckets' : 'Configure'}
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {buckets.map(bucket => (
                  <div
                    key={bucket.name}
                    onClick={() => listObjects(bucket.name)}
                    className="p-4 border-2 border-[var(--border-primary)] rounded-lg bg-[var(--bg-secondary)] hover:border-[var(--accent-primary)] cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Database className="w-8 h-8 text-[var(--accent-primary)]" />
                      <div className="flex-1">
                        <h3 className="font-semibold text-[var(--text-primary)]">{bucket.name}</h3>
                        <p className="text-xs text-[var(--text-secondary)]">
                          Created: {new Date(bucket.creationDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Objects List */
          <div>
            {filteredObjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <FolderOpen className="w-16 h-16 text-[var(--text-secondary)] mb-4" />
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                  {searchQuery ? 'No matches found' : 'Empty folder'}
                </h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  {searchQuery ? 'Try a different search term' : 'Upload files to get started'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredObjects.map(obj => (
                  <div
                    key={obj.key}
                    className="flex items-center justify-between p-3 border border-[var(--border-primary)] rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {obj.isFolder ? (
                        <FolderOpen className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                      ) : (
                        <File className="w-5 h-5 text-blue-500 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p 
                          className="font-medium text-[var(--text-primary)] truncate cursor-pointer hover:text-[var(--accent-primary)]"
                          onClick={() => obj.isFolder ? navigateToFolder(obj.key) : null}
                        >
                          {obj.name}
                        </p>
                        {!obj.isFolder && (
                          <p className="text-xs text-[var(--text-secondary)]">
                            {formatSize(obj.size)} • {new Date(obj.lastModified).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {!obj.isFolder && (
                        <>
                          <button
                            onClick={() => previewFile(obj.key)}
                            className="p-2 hover:bg-[var(--bg-tertiary)] rounded"
                            title="Preview"
                          >
                            <Eye className="w-4 h-4 text-[var(--text-secondary)]" />
                          </button>
                          <button
                            onClick={() => getPresignedUrl(obj.key)}
                            className="p-2 hover:bg-[var(--bg-tertiary)] rounded"
                            title="Copy URL"
                          >
                            {copiedUrl === obj.key ? (
                              <Check className="w-4 h-4 text-green-500" />
                            ) : (
                              <Copy className="w-4 h-4 text-[var(--text-secondary)]" />
                            )}
                          </button>
                          <button
                            onClick={() => downloadFile(obj.key)}
                            className="p-2 hover:bg-[var(--bg-tertiary)] rounded"
                            title="Download"
                          >
                            <Download className="w-4 h-4 text-blue-500" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => deleteObject(obj.key, obj.isFolder)}
                        className="p-2 hover:bg-[var(--bg-tertiary)] rounded"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Settings Dialog */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-primary)] border-2 border-[var(--border-primary)] rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-4">S3 Configuration</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              Configure in Settings → Environment Variables
            </p>
            
            <div className="space-y-3 mb-6">
              <div className="p-3 bg-[var(--bg-secondary)] rounded border border-[var(--border-primary)]">
                <p className="text-xs font-mono text-[var(--text-secondary)] mb-1">AWS_ENDPOINT</p>
                <p className="text-sm text-[var(--text-primary)]">{config.endpoint || 'Not set'}</p>
              </div>
              <div className="p-3 bg-[var(--bg-secondary)] rounded border border-[var(--border-primary)]">
                <p className="text-xs font-mono text-[var(--text-secondary)] mb-1">AWS_ACCESS_KEY_ID</p>
                <p className="text-sm text-[var(--text-primary)]">{config.accessKeyId ? '••••••••' : 'Not set'}</p>
              </div>
              <div className="p-3 bg-[var(--bg-secondary)] rounded border border-[var(--border-primary)]">
                <p className="text-xs font-mono text-[var(--text-secondary)] mb-1">AWS_SECRET_ACCESS_KEY</p>
                <p className="text-sm text-[var(--text-primary)]">{config.secretAccessKey ? '••••••••' : 'Not set'}</p>
              </div>
              <div className="p-3 bg-[var(--bg-secondary)] rounded border border-[var(--border-primary)]">
                <p className="text-xs font-mono text-[var(--text-secondary)] mb-1">AWS_REGION</p>
                <p className="text-sm text-[var(--text-primary)]">{config.region || 'us-east-1'}</p>
              </div>
            </div>

            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded mb-4">
              <p className="text-xs text-[var(--text-secondary)]">
                <strong>LocalStack:</strong> Set AWS_ENDPOINT to http://localhost:4566
              </p>
            </div>

            <Button onClick={() => setShowSettings(false)} size="sm" className="w-full">
              Close
            </Button>
          </div>
        </div>
      )}

      {/* Preview Dialog */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-primary)] border-2 border-[var(--border-primary)] rounded-lg p-6 w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">{selectedFile}</h3>
              <Button onClick={() => setShowPreview(false)} size="sm" variant="outline">
                Close
              </Button>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-[var(--bg-secondary)] rounded border border-[var(--border-primary)]">
              <pre className="text-sm text-[var(--text-primary)] whitespace-pre-wrap font-mono">
                {previewContent}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default S3Visualizer;
