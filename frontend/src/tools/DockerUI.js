import React, { useState, useEffect } from 'react';
import { 
  Container, Play, Square, Trash2, RefreshCw, Terminal, 
  Download, Upload, Search, Eye, Package, Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';

/**
 * Docker UI
 * Manage Docker containers, images, and builds
 */
function DockerUI({ tab, tabs, setTabs }) {
  const [activeTab, setActiveTab] = useState('containers');
  const [containers, setContainers] = useState([]);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContainer, setSelectedContainer] = useState(null);
  const [logs, setLogs] = useState('');
  const [showLogs, setShowLogs] = useState(false);
  
  // Build state
  const [buildContext, setBuildContext] = useState('');
  const [dockerfile, setDockerfile] = useState('FROM node:18\nWORKDIR /app\nCOPY . .\nRUN npm install\nCMD ["npm", "start"]');
  const [imageName, setImageName] = useState('my-app:latest');
  const [buildOutput, setBuildOutput] = useState('');

  // Load containers
  const loadContainers = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/docker/containers');
      setContainers(response.data.containers || []);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to load containers');
    } finally {
      setLoading(false);
    }
  };

  // Load images
  const loadImages = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/docker/images');
      setImages(response.data.images || []);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to load images');
    } finally {
      setLoading(false);
    }
  };

  // Start container
  const startContainer = async (id) => {
    try {
      await axios.post(`/api/docker/containers/${id}/start`);
      toast.success('Container started');
      loadContainers();
    } catch (err) {
      toast.error('Failed to start container');
    }
  };

  // Stop container
  const stopContainer = async (id) => {
    try {
      await axios.post(`/api/docker/containers/${id}/stop`);
      toast.success('Container stopped');
      loadContainers();
    } catch (err) {
      toast.error('Failed to stop container');
    }
  };

  // Remove container
  const removeContainer = async (id) => {
    if (!window.confirm('Remove this container?')) return;
    
    try {
      await axios.delete(`/api/docker/containers/${id}`);
      toast.success('Container removed');
      loadContainers();
    } catch (err) {
      toast.error('Failed to remove container');
    }
  };

  // View logs
  const viewLogs = async (id, name) => {
    try {
      const response = await axios.get(`/api/docker/containers/${id}/logs`);
      setLogs(response.data.logs || '');
      setSelectedContainer(name);
      setShowLogs(true);
    } catch (err) {
      toast.error('Failed to fetch logs');
    }
  };

  // Remove image
  const removeImage = async (id) => {
    if (!window.confirm('Remove this image?')) return;
    
    try {
      await axios.delete(`/api/docker/images/${id}`);
      toast.success('Image removed');
      loadImages();
    } catch (err) {
      toast.error('Failed to remove image');
    }
  };

  // Build image
  const buildImage = async () => {
    if (!dockerfile.trim() || !imageName.trim()) {
      toast.error('Dockerfile and image name are required');
      return;
    }

    try {
      setBuildOutput('Building image...\n');
      const response = await axios.post('/api/docker/build', {
        dockerfile,
        imageName,
        context: buildContext
      });
      
      setBuildOutput(response.data.output || 'Build completed');
      toast.success('Image built successfully');
      loadImages();
    } catch (err) {
      setBuildOutput('Build failed: ' + (err.response?.data?.detail || err.message));
      toast.error('Build failed');
    }
  };

  // Pull image
  const pullImage = async () => {
    const image = prompt('Enter image name (e.g., nginx:latest):');
    if (!image) return;

    try {
      toast.info('Pulling image...');
      await axios.post('/api/docker/pull', { image });
      toast.success('Image pulled');
      loadImages();
    } catch (err) {
      toast.error('Failed to pull image');
    }
  };

  // Load data on mount
  useEffect(() => {
    if (activeTab === 'containers') {
      loadContainers();
    } else if (activeTab === 'images') {
      loadImages();
    }
  }, [activeTab]);

  // Format size
  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Filter items
  const filteredContainers = containers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.image.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredImages = images.filter(img => 
    img.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">Docker UI</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Manage Docker containers, images, and builds
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'images' && (
            <Button onClick={pullImage} size="sm" variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Pull Image
            </Button>
          )}
          <Button 
            onClick={activeTab === 'containers' ? loadContainers : activeTab === 'images' ? loadImages : null} 
            size="sm" 
            variant="outline"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 border-b border-[var(--border-primary)]">
        <button
          onClick={() => setActiveTab('containers')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'containers'
              ? 'text-[var(--accent-primary)] border-b-2 border-[var(--accent-primary)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Container className="w-4 h-4 inline mr-2" />
          Containers
        </button>
        <button
          onClick={() => setActiveTab('images')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'images'
              ? 'text-[var(--accent-primary)] border-b-2 border-[var(--accent-primary)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Layers className="w-4 h-4 inline mr-2" />
          Images
        </button>
        <button
          onClick={() => setActiveTab('build')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'build'
              ? 'text-[var(--accent-primary)] border-b-2 border-[var(--accent-primary)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Package className="w-4 h-4 inline mr-2" />
          Build
        </button>
      </div>

      {/* Search */}
      {(activeTab === 'containers' || activeTab === 'images') && (
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${activeTab}...`}
              className="w-full pl-10 pr-4 py-2 border rounded bg-[var(--bg-secondary)] border-[var(--border-primary)] text-[var(--text-primary)]"
            />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {/* Containers Tab */}
        {activeTab === 'containers' && (
          <div className="space-y-2">
            {filteredContainers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <Container className="w-16 h-16 text-[var(--text-secondary)] mb-4" />
                <p className="text-sm text-[var(--text-secondary)]">
                  {searchQuery ? 'No containers match your search' : 'No containers found'}
                </p>
              </div>
            ) : (
              filteredContainers.map(container => (
                <div
                  key={container.id}
                  className="p-4 border border-[var(--border-primary)] rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-[var(--text-primary)]">{container.name}</h3>
                        <span className={`px-2 py-0.5 text-xs rounded ${
                          container.state === 'running' 
                            ? 'bg-green-500/20 text-green-500' 
                            : 'bg-gray-500/20 text-gray-500'
                        }`}>
                          {container.state}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] mb-2">
                        Image: {container.image}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)] font-mono">
                        ID: {container.id.substring(0, 12)}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {container.state === 'running' ? (
                        <button
                          onClick={() => stopContainer(container.id)}
                          className="p-2 hover:bg-[var(--bg-tertiary)] rounded"
                          title="Stop"
                        >
                          <Square className="w-4 h-4 text-red-500" />
                        </button>
                      ) : (
                        <button
                          onClick={() => startContainer(container.id)}
                          className="p-2 hover:bg-[var(--bg-tertiary)] rounded"
                          title="Start"
                        >
                          <Play className="w-4 h-4 text-green-500" />
                        </button>
                      )}
                      <button
                        onClick={() => viewLogs(container.id, container.name)}
                        className="p-2 hover:bg-[var(--bg-tertiary)] rounded"
                        title="View Logs"
                      >
                        <Terminal className="w-4 h-4 text-blue-500" />
                      </button>
                      <button
                        onClick={() => removeContainer(container.id)}
                        className="p-2 hover:bg-[var(--bg-tertiary)] rounded"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Images Tab */}
        {activeTab === 'images' && (
          <div className="space-y-2">
            {filteredImages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <Layers className="w-16 h-16 text-[var(--text-secondary)] mb-4" />
                <p className="text-sm text-[var(--text-secondary)]">
                  {searchQuery ? 'No images match your search' : 'No images found'}
                </p>
              </div>
            ) : (
              filteredImages.map(image => (
                <div
                  key={image.id}
                  className="p-4 border border-[var(--border-primary)] rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-[var(--text-primary)] mb-1">
                        {image.tags?.[0] || 'Untagged'}
                      </h3>
                      <div className="flex gap-4 text-xs text-[var(--text-secondary)]">
                        <span>Size: {formatSize(image.size)}</span>
                        <span>ID: {image.id.substring(0, 12)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => removeImage(image.id)}
                      className="p-2 hover:bg-[var(--bg-tertiary)] rounded"
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Build Tab */}
        {activeTab === 'build' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Image Name
              </label>
              <input
                type="text"
                value={imageName}
                onChange={(e) => setImageName(e.target.value)}
                placeholder="my-app:latest"
                className="w-full px-3 py-2 border rounded bg-[var(--bg-secondary)] border-[var(--border-primary)] text-[var(--text-primary)]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Dockerfile
              </label>
              <textarea
                value={dockerfile}
                onChange={(e) => setDockerfile(e.target.value)}
                rows={10}
                className="w-full px-3 py-2 border rounded bg-[var(--bg-secondary)] border-[var(--border-primary)] text-[var(--text-primary)] font-mono text-sm"
              />
            </div>

            <Button onClick={buildImage} size="sm" className="bg-[var(--accent-primary)] text-white">
              <Package className="w-4 h-4 mr-2" />
              Build Image
            </Button>

            {buildOutput && (
              <div className="p-4 border border-[var(--border-primary)] rounded bg-[var(--bg-secondary)]">
                <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Build Output</h4>
                <pre className="text-xs text-[var(--text-primary)] font-mono whitespace-pre-wrap">
                  {buildOutput}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Logs Dialog */}
      {showLogs && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-primary)] border-2 border-[var(--border-primary)] rounded-lg p-6 w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                Logs: {selectedContainer}
              </h3>
              <Button onClick={() => setShowLogs(false)} size="sm" variant="outline">
                Close
              </Button>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-[var(--bg-secondary)] rounded border border-[var(--border-primary)]">
              <pre className="text-xs text-[var(--text-primary)] font-mono whitespace-pre-wrap">
                {logs || 'No logs available'}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DockerUI;
