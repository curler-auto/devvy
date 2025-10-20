import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, RefreshCw, Search, Filter, Download, Play, Pause,
  Calendar, Clock, ChevronDown, ChevronRight, Copy, Check, Settings,
  Trash2, AlertCircle, TrendingUp, Activity, Server
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import axios from 'axios';

/**
 * Filebeat Viewer
 * View and analyze Filebeat logs with advanced filtering
 */
function FilebeatViewer({ tab, tabs, setTabs, editorTheme = 'vs-dark' }) {
  const [filebeatConfigs, setFilebeatConfigs] = useState([]);
  const [selectedConfig, setSelectedConfig] = useState('');
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(5000);
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [expandedLogs, setExpandedLogs] = useState(new Set());
  const [logLevel, setLogLevel] = useState('all');
  const [source, setSource] = useState('all');
  const [sources, setSources] = useState([]);
  const [limit, setLimit] = useState(100);
  const [showSettings, setShowSettings] = useState(false);
  const [stats, setStats] = useState(null);
  const [copied, setCopied] = useState(null);
  const intervalRef = useRef(null);

  // Load Filebeat configurations
  useEffect(() => {
    loadFilebeatConfigs();
  }, []);

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh && selectedConfig) {
      intervalRef.current = setInterval(() => {
        fetchLogs(false);
      }, refreshInterval);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh, selectedConfig, refreshInterval]);

  // Filter logs
  useEffect(() => {
    filterLogs();
  }, [logs, searchQuery, startDate, endDate, logLevel, source]);

  const loadFilebeatConfigs = () => {
    try {
      const stored = localStorage.getItem('filebeat_configs');
      if (stored) {
        const configs = JSON.parse(stored);
        setFilebeatConfigs(configs);
        if (configs.length > 0) {
          setSelectedConfig(configs[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load Filebeat configs:', err);
    }
  };

  const fetchLogs = async (showToast = true) => {
    try {
      setLoading(true);
      const config = filebeatConfigs.find(c => c.id === selectedConfig);
      if (!config) return;

      const params = {
        limit,
        from: startDate || undefined,
        to: endDate || undefined,
      };

      const response = await axios.get(
        `${config.apiUrl}/logs`,
        {
          headers: {
            'Authorization': `Bearer ${config.token || ''}`,
          },
          params
        }
      );

      const logData = response.data.logs || response.data.hits?.hits || [];
      const processedLogs = logData.map(log => {
        // Handle Elasticsearch format
        if (log._source) {
          return {
            ...log._source,
            _id: log._id,
            _index: log._index
          };
        }
        return log;
      });

      setLogs(processedLogs);
      
      // Extract unique sources
      const uniqueSources = [...new Set(processedLogs.map(l => l.source || l.log?.file?.path || 'unknown'))];
      setSources(uniqueSources);

      // Calculate stats
      const stats = {
        total: processedLogs.length,
        levels: processedLogs.reduce((acc, log) => {
          const level = log.level || log.log?.level || 'unknown';
          acc[level] = (acc[level] || 0) + 1;
          return acc;
        }, {}),
        sources: uniqueSources.length,
        timeRange: processedLogs.length > 0 ? {
          start: new Date(Math.min(...processedLogs.map(l => new Date(l['@timestamp'] || l.timestamp)))),
          end: new Date(Math.max(...processedLogs.map(l => new Date(l['@timestamp'] || l.timestamp))))
        } : null
      };
      setStats(stats);

      if (showToast) {
        toast.success(`Loaded ${processedLogs.length} logs`);
      }
    } catch (err) {
      console.error('Failed to fetch logs:', err);
      toast.error(`Failed to fetch logs: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const filterLogs = () => {
    let filtered = [...logs];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(log => {
        const logStr = JSON.stringify(log).toLowerCase();
        return logStr.includes(query);
      });
    }

    // Date range filter
    if (startDate) {
      const start = new Date(startDate);
      filtered = filtered.filter(log => new Date(log['@timestamp'] || log.timestamp) >= start);
    }
    if (endDate) {
      const end = new Date(endDate);
      filtered = filtered.filter(log => new Date(log['@timestamp'] || log.timestamp) <= end);
    }

    // Log level filter
    if (logLevel !== 'all') {
      filtered = filtered.filter(log => {
        const level = (log.level || log.log?.level || 'unknown').toLowerCase();
        return level === logLevel.toLowerCase();
      });
    }

    // Source filter
    if (source !== 'all') {
      filtered = filtered.filter(log => {
        const logSource = log.source || log.log?.file?.path || 'unknown';
        return logSource === source;
      });
    }

    setFilteredLogs(filtered);
  };

  const toggleLog = (index) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedLogs(newExpanded);
  };

  const copyLog = (log, index) => {
    navigator.clipboard.writeText(JSON.stringify(log, null, 2));
    setCopied(index);
    toast.success('Log copied to clipboard');
    setTimeout(() => setCopied(null), 2000);
  };

  const exportLogs = () => {
    const dataStr = JSON.stringify(filteredLogs, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `filebeat-logs-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Logs exported');
  };

  const clearLogs = () => {
    setLogs([]);
    setFilteredLogs([]);
    setStats(null);
    toast.success('Logs cleared');
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const getLevelColor = (level) => {
    const levelLower = (level || 'unknown').toLowerCase();
    const colors = {
      error: 'text-red-500',
      warn: 'text-yellow-500',
      warning: 'text-yellow-500',
      info: 'text-blue-500',
      debug: 'text-gray-500',
      trace: 'text-gray-400',
    };
    return colors[levelLower] || 'text-[var(--text-primary)]';
  };

  return (
    <div className="tool-container">
      <div className="tool-header">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          <h2>Filebeat Viewer</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setAutoRefresh(!autoRefresh)}
            size="sm"
            variant={autoRefresh ? 'default' : 'outline'}
          >
            {autoRefresh ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
            {autoRefresh ? 'Pause' : 'Auto-Refresh'}
          </Button>
          <Button onClick={() => setShowSettings(!showSettings)} size="sm" variant="outline">
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {showSettings && (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-md p-4 mb-4">
          <h3 className="text-sm font-semibold mb-2">Filebeat Configuration</h3>
          <p className="text-xs text-[var(--text-secondary)] mb-2">
            Configure Filebeat/Elasticsearch endpoints in Settings → Environment
          </p>
          <p className="text-xs text-[var(--text-secondary)]">
            Required: API URL (Elasticsearch/Kibana), Index Pattern, Authentication
          </p>
        </div>
      )}

      {/* Controls */}
      <div className="p-4 border-b border-[var(--border-primary)]">
        <div className="grid grid-cols-4 gap-2 mb-3">
          <select
            value={selectedConfig}
            onChange={(e) => setSelectedConfig(e.target.value)}
            className="px-3 py-2 border rounded-md bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)]"
            disabled={filebeatConfigs.length === 0}
          >
            <option value="">Select Filebeat Source</option>
            {filebeatConfigs.map(config => (
              <option key={config.id} value={config.id}>{config.name}</option>
            ))}
          </select>

          <select
            value={logLevel}
            onChange={(e) => setLogLevel(e.target.value)}
            className="px-3 py-2 border rounded-md bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)]"
          >
            <option value="all">All Levels</option>
            <option value="error">Error</option>
            <option value="warn">Warning</option>
            <option value="info">Info</option>
            <option value="debug">Debug</option>
            <option value="trace">Trace</option>
          </select>

          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="px-3 py-2 border rounded-md bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)]"
          >
            <option value="all">All Sources</option>
            {sources.map(s => (
              <option key={s} value={s}>{s.split('/').pop() || s}</option>
            ))}
          </select>

          <Button
            onClick={() => fetchLogs(true)}
            disabled={!selectedConfig || loading}
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Fetch Logs
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Input
            placeholder="Search logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <Input
            type="datetime-local"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            placeholder="Start date"
          />

          <Input
            type="datetime-local"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            placeholder="End date"
          />
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="p-4 bg-[var(--bg-secondary)] border-b border-[var(--border-primary)]">
          <div className="grid grid-cols-5 gap-4 text-sm">
            <div>
              <div className="text-[var(--text-secondary)] text-xs">Total Logs</div>
              <div className="font-semibold">{stats.total}</div>
            </div>
            <div>
              <div className="text-[var(--text-secondary)] text-xs">Sources</div>
              <div className="font-semibold">{stats.sources}</div>
            </div>
            <div>
              <div className="text-[var(--text-secondary)] text-xs">Errors</div>
              <div className="font-semibold text-red-500">{stats.levels.error || 0}</div>
            </div>
            <div>
              <div className="text-[var(--text-secondary)] text-xs">Warnings</div>
              <div className="font-semibold text-yellow-500">{stats.levels.warn || stats.levels.warning || 0}</div>
            </div>
            <div>
              <div className="text-[var(--text-secondary)] text-xs">Filtered</div>
              <div className="font-semibold">{filteredLogs.length}</div>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="p-2 border-b border-[var(--border-primary)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--text-secondary)]">
            Showing {filteredLogs.length} of {logs.length} logs
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={exportLogs} size="sm" variant="outline" disabled={filteredLogs.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button onClick={clearLogs} size="sm" variant="outline" disabled={logs.length === 0}>
            <Trash2 className="w-4 h-4 mr-2" />
            Clear
          </Button>
        </div>
      </div>

      {/* Logs List */}
      <div className="flex-1 overflow-auto p-4">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-8 text-[var(--text-secondary)]">
            <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No logs to display</p>
            <p className="text-xs mt-1">Select a source and click Fetch Logs</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredLogs.map((log, index) => {
              const timestamp = log['@timestamp'] || log.timestamp;
              const level = log.level || log.log?.level || 'unknown';
              const message = log.message || log.log?.message || '';
              const logSource = log.source || log.log?.file?.path || 'unknown';

              return (
                <div
                  key={index}
                  className="border border-[var(--border-primary)] rounded-md bg-[var(--bg-secondary)]"
                >
                  <div
                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-[var(--bg-tertiary)]"
                    onClick={() => toggleLog(index)}
                  >
                    <div className="flex items-center gap-2 flex-1">
                      {expandedLogs.has(index) ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 text-sm mb-1">
                          <span className={`font-mono text-xs font-semibold uppercase ${getLevelColor(level)}`}>
                            {level}
                          </span>
                          <span className="text-[var(--text-secondary)] text-xs">
                            <Clock className="w-3 h-3 inline-block mr-1" />
                            {formatTimestamp(timestamp)}
                          </span>
                          <span className="text-[var(--text-secondary)] text-xs truncate max-w-xs">
                            <Server className="w-3 h-3 inline-block mr-1" />
                            {logSource.split('/').pop()}
                          </span>
                        </div>
                        <div className="text-sm truncate">{message}</div>
                      </div>
                    </div>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyLog(log, index);
                      }}
                      size="sm"
                      variant="ghost"
                    >
                      {copied === index ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>

                  {expandedLogs.has(index) && (
                    <div className="p-3 border-t border-[var(--border-primary)]">
                      <pre className="text-xs font-mono bg-[var(--bg-primary)] p-3 rounded overflow-auto max-h-96">
                        {JSON.stringify(log, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// Tool metadata
FilebeatViewer.metadata = {
  id: 'filebeat-viewer',
  name: 'Filebeat Viewer',
  description: 'View and analyze Filebeat logs with advanced filtering and search',
  category: 'devops',
  requiresBackend: false,
};

export default FilebeatViewer;
