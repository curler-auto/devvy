import React, { useState, useEffect, useRef } from 'react';
import { 
  Database, RefreshCw, Search, Filter, Download, Play, Pause,
  Calendar, Clock, ChevronDown, ChevronRight, Copy, Check, Settings,
  Trash2, Eye, EyeOff, AlertCircle, TrendingUp, Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import axios from 'axios';

/**
 * Kafka Topic Viewer
 * Real-time Kafka topic message viewer with advanced filtering
 */
function KafkaTopicViewer({ tab, tabs, setTabs, editorTheme = 'vs-dark' }) {
  const [kafkaConfigs, setKafkaConfigs] = useState([]);
  const [selectedConfig, setSelectedConfig] = useState('');
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState('');
  const [messages, setMessages] = useState([]);
  const [filteredMessages, setFilteredMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(5000);
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [expandedMessages, setExpandedMessages] = useState(new Set());
  const [selectedPartition, setSelectedPartition] = useState('all');
  const [partitions, setPartitions] = useState([]);
  const [offset, setOffset] = useState('latest');
  const [limit, setLimit] = useState(100);
  const [showSettings, setShowSettings] = useState(false);
  const [stats, setStats] = useState(null);
  const [copied, setCopied] = useState(null);
  const intervalRef = useRef(null);

  // Load Kafka configurations
  useEffect(() => {
    loadKafkaConfigs();
  }, []);

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh && selectedTopic) {
      intervalRef.current = setInterval(() => {
        fetchMessages(false);
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
  }, [autoRefresh, selectedTopic, refreshInterval]);

  // Filter messages
  useEffect(() => {
    filterMessages();
  }, [messages, searchQuery, startDate, endDate, selectedPartition]);

  const loadKafkaConfigs = () => {
    try {
      const stored = localStorage.getItem('kafka_configs');
      if (stored) {
        const configs = JSON.parse(stored);
        setKafkaConfigs(configs);
        if (configs.length > 0) {
          setSelectedConfig(configs[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load Kafka configs:', err);
    }
  };

  const fetchTopics = async () => {
    try {
      setLoading(true);
      const config = kafkaConfigs.find(c => c.id === selectedConfig);
      if (!config) return;

      const response = await axios.get(`${config.apiUrl}/topics`, {
        headers: {
          'Authorization': `Bearer ${config.token || ''}`,
        }
      });

      setTopics(response.data.topics || []);
      toast.success('Topics loaded');
    } catch (err) {
      console.error('Failed to fetch topics:', err);
      toast.error(`Failed to fetch topics: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchPartitions = async (topic) => {
    try {
      const config = kafkaConfigs.find(c => c.id === selectedConfig);
      if (!config) return;

      const response = await axios.get(`${config.apiUrl}/topics/${topic}/partitions`, {
        headers: {
          'Authorization': `Bearer ${config.token || ''}`,
        }
      });

      setPartitions(response.data.partitions || []);
    } catch (err) {
      console.error('Failed to fetch partitions:', err);
    }
  };

  const fetchMessages = async (showToast = true) => {
    try {
      setLoading(true);
      const config = kafkaConfigs.find(c => c.id === selectedConfig);
      if (!config || !selectedTopic) return;

      const params = {
        offset,
        limit,
        partition: selectedPartition !== 'all' ? selectedPartition : undefined,
      };

      const response = await axios.get(
        `${config.apiUrl}/topics/${selectedTopic}/messages`,
        {
          headers: {
            'Authorization': `Bearer ${config.token || ''}`,
          },
          params
        }
      );

      const msgs = response.data.messages || [];
      setMessages(msgs);
      
      // Calculate stats
      const stats = {
        total: msgs.length,
        partitions: [...new Set(msgs.map(m => m.partition))].length,
        avgSize: msgs.length > 0 ? msgs.reduce((sum, m) => sum + (m.size || 0), 0) / msgs.length : 0,
        timeRange: msgs.length > 0 ? {
          start: new Date(Math.min(...msgs.map(m => new Date(m.timestamp)))),
          end: new Date(Math.max(...msgs.map(m => new Date(m.timestamp))))
        } : null
      };
      setStats(stats);

      if (showToast) {
        toast.success(`Loaded ${msgs.length} messages`);
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
      toast.error(`Failed to fetch messages: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const filterMessages = () => {
    let filtered = [...messages];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(msg => {
        const msgStr = JSON.stringify(msg).toLowerCase();
        return msgStr.includes(query);
      });
    }

    // Date range filter
    if (startDate) {
      const start = new Date(startDate);
      filtered = filtered.filter(msg => new Date(msg.timestamp) >= start);
    }
    if (endDate) {
      const end = new Date(endDate);
      filtered = filtered.filter(msg => new Date(msg.timestamp) <= end);
    }

    // Partition filter
    if (selectedPartition !== 'all') {
      filtered = filtered.filter(msg => msg.partition === parseInt(selectedPartition));
    }

    setFilteredMessages(filtered);
  };

  const toggleMessage = (index) => {
    const newExpanded = new Set(expandedMessages);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedMessages(newExpanded);
  };

  const copyMessage = (message, index) => {
    navigator.clipboard.writeText(JSON.stringify(message, null, 2));
    setCopied(index);
    toast.success('Message copied to clipboard');
    setTimeout(() => setCopied(null), 2000);
  };

  const exportMessages = () => {
    const dataStr = JSON.stringify(filteredMessages, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kafka-${selectedTopic}-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Messages exported');
  };

  const clearMessages = () => {
    setMessages([]);
    setFilteredMessages([]);
    setStats(null);
    toast.success('Messages cleared');
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="tool-container">
      <div className="tool-header">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          <h2>Kafka Topic Viewer</h2>
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
          <h3 className="text-sm font-semibold mb-2">Kafka Configuration</h3>
          <p className="text-xs text-[var(--text-secondary)] mb-2">
            Configure Kafka brokers in Settings → Environment
          </p>
          <p className="text-xs text-[var(--text-secondary)]">
            Required: Broker URL, API URL, Authentication Token (if needed)
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
            disabled={kafkaConfigs.length === 0}
          >
            <option value="">Select Kafka Cluster</option>
            {kafkaConfigs.map(config => (
              <option key={config.id} value={config.id}>{config.name}</option>
            ))}
          </select>

          <select
            value={selectedTopic}
            onChange={(e) => {
              setSelectedTopic(e.target.value);
              if (e.target.value) {
                fetchPartitions(e.target.value);
              }
            }}
            className="px-3 py-2 border rounded-md bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)]"
            disabled={!selectedConfig}
          >
            <option value="">Select Topic</option>
            {topics.map(topic => (
              <option key={topic} value={topic}>{topic}</option>
            ))}
          </select>

          <select
            value={selectedPartition}
            onChange={(e) => setSelectedPartition(e.target.value)}
            className="px-3 py-2 border rounded-md bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)]"
          >
            <option value="all">All Partitions</option>
            {partitions.map(p => (
              <option key={p} value={p}>Partition {p}</option>
            ))}
          </select>

          <Button
            onClick={fetchTopics}
            disabled={!selectedConfig || loading}
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Load Topics
          </Button>
        </div>

        <div className="grid grid-cols-5 gap-2">
          <Input
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="col-span-2"
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

          <Button
            onClick={() => fetchMessages(true)}
            disabled={!selectedTopic || loading}
            size="sm"
          >
            <Activity className="w-4 h-4 mr-2" />
            Fetch
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="p-4 bg-[var(--bg-secondary)] border-b border-[var(--border-primary)]">
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-[var(--text-secondary)] text-xs">Total Messages</div>
              <div className="font-semibold">{stats.total}</div>
            </div>
            <div>
              <div className="text-[var(--text-secondary)] text-xs">Partitions</div>
              <div className="font-semibold">{stats.partitions}</div>
            </div>
            <div>
              <div className="text-[var(--text-secondary)] text-xs">Avg Size</div>
              <div className="font-semibold">{formatSize(stats.avgSize)}</div>
            </div>
            <div>
              <div className="text-[var(--text-secondary)] text-xs">Filtered</div>
              <div className="font-semibold">{filteredMessages.length}</div>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="p-2 border-b border-[var(--border-primary)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--text-secondary)]">
            Showing {filteredMessages.length} of {messages.length} messages
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={exportMessages} size="sm" variant="outline" disabled={filteredMessages.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button onClick={clearMessages} size="sm" variant="outline" disabled={messages.length === 0}>
            <Trash2 className="w-4 h-4 mr-2" />
            Clear
          </Button>
        </div>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-auto p-4">
        {filteredMessages.length === 0 ? (
          <div className="text-center py-8 text-[var(--text-secondary)]">
            <Database className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No messages to display</p>
            <p className="text-xs mt-1">Select a topic and click Fetch to load messages</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredMessages.map((message, index) => (
              <div
                key={index}
                className="border border-[var(--border-primary)] rounded-md bg-[var(--bg-secondary)]"
              >
                <div
                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-[var(--bg-tertiary)]"
                  onClick={() => toggleMessage(index)}
                >
                  <div className="flex items-center gap-2 flex-1">
                    {expandedMessages.has(index) ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-mono text-xs bg-[var(--bg-tertiary)] px-2 py-1 rounded">
                          Partition {message.partition}
                        </span>
                        <span className="font-mono text-xs bg-[var(--bg-tertiary)] px-2 py-1 rounded">
                          Offset {message.offset}
                        </span>
                        <span className="text-[var(--text-secondary)] text-xs">
                          <Clock className="w-3 h-3 inline-block mr-1" />
                          {formatTimestamp(message.timestamp)}
                        </span>
                        {message.key && (
                          <span className="text-[var(--text-secondary)] text-xs">
                            Key: {message.key}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      copyMessage(message, index);
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

                {expandedMessages.has(index) && (
                  <div className="p-3 border-t border-[var(--border-primary)]">
                    <pre className="text-xs font-mono bg-[var(--bg-primary)] p-3 rounded overflow-auto max-h-96">
                      {JSON.stringify(message.value, null, 2)}
                    </pre>
                    {message.headers && Object.keys(message.headers).length > 0 && (
                      <div className="mt-2">
                        <div className="text-xs font-semibold mb-1">Headers:</div>
                        <pre className="text-xs font-mono bg-[var(--bg-primary)] p-2 rounded">
                          {JSON.stringify(message.headers, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Tool metadata
KafkaTopicViewer.metadata = {
  id: 'kafka-topic-viewer',
  name: 'Kafka Topic Viewer',
  description: 'Real-time Kafka topic message viewer with advanced filtering and search',
  category: 'devops',
  requiresBackend: false,
};

export default KafkaTopicViewer;
