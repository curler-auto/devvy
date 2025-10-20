import React, { useState, useEffect, useRef } from 'react';
import { 
  Zap, RefreshCw, Search, Filter, Download, Play, Pause,
  Calendar, Clock, ChevronDown, ChevronRight, Copy, Check, Settings,
  Trash2, Activity, TrendingUp, Server
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import axios from 'axios';

/**
 * Vector Viewer
 * View and analyze Vector observability data
 */
function VectorViewer({ tab, tabs, setTabs, editorTheme = 'vs-dark' }) {
  const [vectorConfigs, setVectorConfigs] = useState([]);
  const [selectedConfig, setSelectedConfig] = useState('');
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(5000);
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [expandedEvents, setExpandedEvents] = useState(new Set());
  const [eventType, setEventType] = useState('all');
  const [component, setComponent] = useState('all');
  const [components, setComponents] = useState([]);
  const [limit, setLimit] = useState(100);
  const [showSettings, setShowSettings] = useState(false);
  const [stats, setStats] = useState(null);
  const [copied, setCopied] = useState(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    loadVectorConfigs();
  }, []);

  useEffect(() => {
    if (autoRefresh && selectedConfig) {
      intervalRef.current = setInterval(() => {
        fetchEvents(false);
      }, refreshInterval);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh, selectedConfig, refreshInterval]);

  useEffect(() => {
    filterEvents();
  }, [events, searchQuery, startDate, endDate, eventType, component]);

  const loadVectorConfigs = () => {
    try {
      const stored = localStorage.getItem('vector_configs');
      if (stored) {
        const configs = JSON.parse(stored);
        setVectorConfigs(configs);
        if (configs.length > 0) setSelectedConfig(configs[0].id);
      }
    } catch (err) {
      console.error('Failed to load Vector configs:', err);
    }
  };

  const fetchEvents = async (showToast = true) => {
    try {
      setLoading(true);
      const config = vectorConfigs.find(c => c.id === selectedConfig);
      if (!config) return;

      const params = { limit, from: startDate || undefined, to: endDate || undefined };
      const response = await axios.get(`${config.apiUrl}/events`, {
        headers: { 'Authorization': `Bearer ${config.token || ''}` },
        params
      });

      const eventData = response.data.events || response.data || [];
      setEvents(eventData);
      
      const uniqueComponents = [...new Set(eventData.map(e => e.component || e.source || 'unknown'))];
      setComponents(uniqueComponents);

      const stats = {
        total: eventData.length,
        types: eventData.reduce((acc, e) => {
          const type = e.type || 'unknown';
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {}),
        components: uniqueComponents.length,
        timeRange: eventData.length > 0 ? {
          start: new Date(Math.min(...eventData.map(e => new Date(e.timestamp)))),
          end: new Date(Math.max(...eventData.map(e => new Date(e.timestamp))))
        } : null
      };
      setStats(stats);

      if (showToast) toast.success(`Loaded ${eventData.length} events`);
    } catch (err) {
      console.error('Failed to fetch events:', err);
      toast.error(`Failed to fetch events: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const filterEvents = () => {
    let filtered = [...events];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(e => JSON.stringify(e).toLowerCase().includes(query));
    }

    if (startDate) {
      const start = new Date(startDate);
      filtered = filtered.filter(e => new Date(e.timestamp) >= start);
    }
    if (endDate) {
      const end = new Date(endDate);
      filtered = filtered.filter(e => new Date(e.timestamp) <= end);
    }

    if (eventType !== 'all') {
      filtered = filtered.filter(e => (e.type || 'unknown') === eventType);
    }

    if (component !== 'all') {
      filtered = filtered.filter(e => (e.component || e.source || 'unknown') === component);
    }

    setFilteredEvents(filtered);
  };

  const toggleEvent = (index) => {
    const newExpanded = new Set(expandedEvents);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedEvents(newExpanded);
  };

  const copyEvent = (event, index) => {
    navigator.clipboard.writeText(JSON.stringify(event, null, 2));
    setCopied(index);
    toast.success('Event copied to clipboard');
    setTimeout(() => setCopied(null), 2000);
  };

  const exportEvents = () => {
    const dataStr = JSON.stringify(filteredEvents, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vector-events-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Events exported');
  };

  const clearEvents = () => {
    setEvents([]);
    setFilteredEvents([]);
    setStats(null);
    toast.success('Events cleared');
  };

  const formatTimestamp = (timestamp) => new Date(timestamp).toLocaleString();

  return (
    <div className="tool-container">
      <div className="tool-header">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5" />
          <h2>Vector Viewer</h2>
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
          <h3 className="text-sm font-semibold mb-2">Vector Configuration</h3>
          <p className="text-xs text-[var(--text-secondary)] mb-2">
            Configure Vector API endpoints in Settings → Environment
          </p>
          <p className="text-xs text-[var(--text-secondary)]">
            Required: API URL, Authentication Token
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
            disabled={vectorConfigs.length === 0}
          >
            <option value="">Select Vector Instance</option>
            {vectorConfigs.map(config => (
              <option key={config.id} value={config.id}>{config.name}</option>
            ))}
          </select>

          <select
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
            className="px-3 py-2 border rounded-md bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)]"
          >
            <option value="all">All Types</option>
            <option value="log">Log</option>
            <option value="metric">Metric</option>
            <option value="trace">Trace</option>
          </select>

          <select
            value={component}
            onChange={(e) => setComponent(e.target.value)}
            className="px-3 py-2 border rounded-md bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)]"
          >
            <option value="all">All Components</option>
            {components.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <Button
            onClick={() => fetchEvents(true)}
            disabled={!selectedConfig || loading}
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Fetch Events
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Input
            placeholder="Search events..."
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
              <div className="text-[var(--text-secondary)] text-xs">Total Events</div>
              <div className="font-semibold">{stats.total}</div>
            </div>
            <div>
              <div className="text-[var(--text-secondary)] text-xs">Components</div>
              <div className="font-semibold">{stats.components}</div>
            </div>
            <div>
              <div className="text-[var(--text-secondary)] text-xs">Logs</div>
              <div className="font-semibold">{stats.types.log || 0}</div>
            </div>
            <div>
              <div className="text-[var(--text-secondary)] text-xs">Metrics</div>
              <div className="font-semibold">{stats.types.metric || 0}</div>
            </div>
            <div>
              <div className="text-[var(--text-secondary)] text-xs">Filtered</div>
              <div className="font-semibold">{filteredEvents.length}</div>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="p-2 border-b border-[var(--border-primary)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--text-secondary)]">
            Showing {filteredEvents.length} of {events.length} events
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={exportEvents} size="sm" variant="outline" disabled={filteredEvents.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button onClick={clearEvents} size="sm" variant="outline" disabled={events.length === 0}>
            <Trash2 className="w-4 h-4 mr-2" />
            Clear
          </Button>
        </div>
      </div>

      {/* Events List */}
      <div className="flex-1 overflow-auto p-4">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-8 text-[var(--text-secondary)]">
            <Zap className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No events to display</p>
            <p className="text-xs mt-1">Select an instance and click Fetch Events</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredEvents.map((event, index) => (
              <div
                key={index}
                className="border border-[var(--border-primary)] rounded-md bg-[var(--bg-secondary)]"
              >
                <div
                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-[var(--bg-tertiary)]"
                  onClick={() => toggleEvent(index)}
                >
                  <div className="flex items-center gap-2 flex-1">
                    {expandedEvents.has(index) ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-sm mb-1">
                        <span className="font-mono text-xs bg-[var(--bg-tertiary)] px-2 py-1 rounded">
                          {event.type || 'unknown'}
                        </span>
                        <span className="text-[var(--text-secondary)] text-xs">
                          <Clock className="w-3 h-3 inline-block mr-1" />
                          {formatTimestamp(event.timestamp)}
                        </span>
                        <span className="text-[var(--text-secondary)] text-xs">
                          <Server className="w-3 h-3 inline-block mr-1" />
                          {event.component || event.source || 'unknown'}
                        </span>
                      </div>
                      <div className="text-sm truncate">{event.message || JSON.stringify(event).substring(0, 100)}</div>
                    </div>
                  </div>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      copyEvent(event, index);
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

                {expandedEvents.has(index) && (
                  <div className="p-3 border-t border-[var(--border-primary)]">
                    <pre className="text-xs font-mono bg-[var(--bg-primary)] p-3 rounded overflow-auto max-h-96">
                      {JSON.stringify(event, null, 2)}
                    </pre>
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
VectorViewer.metadata = {
  id: 'vector-viewer',
  name: 'Vector Viewer',
  description: 'View and analyze Vector observability data with advanced filtering',
  category: 'devops',
  requiresBackend: false,
};

export default VectorViewer;
