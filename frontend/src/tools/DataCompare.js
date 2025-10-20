import React, { useState, useEffect } from 'react';
import { Database, FileSpreadsheet, RefreshCw, GitCompare, Settings, ChevronRight, ChevronDown, AlertCircle, CheckCircle, XCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';

function DataCompare({ tab, tabs, setTabs, editorTheme = 'vs-dark' }) {
  const [dataSourceConfigs, setDataSourceConfigs] = useState([]);
  const [leftSource, setLeftSource] = useState('');
  const [rightSource, setRightSource] = useState('');
  const [leftType, setLeftType] = useState('');
  const [rightType, setRightType] = useState('');
  const [leftDatabases, setLeftDatabases] = useState([]);
  const [rightDatabases, setRightDatabases] = useState([]);
  const [leftDb, setLeftDb] = useState('');
  const [rightDb, setRightDb] = useState('');
  const [leftTables, setLeftTables] = useState([]);
  const [rightTables, setRightTables] = useState([]);
  const [selectedLeftTables, setSelectedLeftTables] = useState([]);
  const [selectedRightTables, setSelectedRightTables] = useState([]);
  const [compareData, setCompareData] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [expandedTables, setExpandedTables] = useState(new Set());
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    loadDataSourceConfigs();
  }, []);

  const loadDataSourceConfigs = () => {
    try {
      const stored = localStorage.getItem('datasource_configs');
      if (stored) {
        const configs = JSON.parse(stored);
        setDataSourceConfigs(configs);
      }
    } catch (err) {
      console.error('Failed to load configs:', err);
    }
  };

  const fetchDatabases = async (sourceId, side) => {
    try {
      setLoading(true);
      const config = dataSourceConfigs.find(c => c.id === sourceId);
      if (!config) return;

      const response = await axios.get(`${config.apiUrl}/databases`, {
        headers: { 'Authorization': `Bearer ${config.token || ''}` }
      });

      const dbs = response.data.databases || [];
      if (side === 'left') {
        setLeftDatabases(dbs);
        setLeftType(config.type);
      } else {
        setRightDatabases(dbs);
        setRightType(config.type);
      }
    } catch (err) {
      toast.error(`Failed to fetch databases: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchTables = async (sourceId, dbName, side) => {
    try {
      setLoading(true);
      const config = dataSourceConfigs.find(c => c.id === sourceId);
      if (!config) return;

      const response = await axios.get(`${config.apiUrl}/databases/${dbName}/tables`, {
        headers: { 'Authorization': `Bearer ${config.token || ''}` }
      });

      const tables = response.data.tables || [];
      if (side === 'left') {
        setLeftTables(tables);
        setSelectedLeftTables(tables.map(t => t.name));
      } else {
        setRightTables(tables);
        setSelectedRightTables(tables.map(t => t.name));
      }
    } catch (err) {
      toast.error(`Failed to fetch tables: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const compareSchemas = async () => {
    try {
      setLoading(true);
      const leftConfig = dataSourceConfigs.find(c => c.id === leftSource);
      const rightConfig = dataSourceConfigs.find(c => c.id === rightSource);

      const response = await axios.post('/api/compare/schemas', {
        left: { config: leftConfig, database: leftDb, tables: selectedLeftTables },
        right: { config: rightConfig, database: rightDb, tables: selectedRightTables },
        compareData
      });

      setResults(response.data);
      setShowResults(true);
      toast.success('Comparison complete');
    } catch (err) {
      toast.error(`Comparison failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleTable = (tableName) => {
    const newExpanded = new Set(expandedTables);
    if (newExpanded.has(tableName)) {
      newExpanded.delete(tableName);
    } else {
      newExpanded.add(tableName);
    }
    setExpandedTables(newExpanded);
  };

  const getStatusIcon = (status) => {
    if (status === 'match') return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (status === 'mismatch') return <XCircle className="w-4 h-4 text-red-500" />;
    return <AlertCircle className="w-4 h-4 text-yellow-500" />;
  };

  return (
    <div className="tool-container">
      <div className="tool-header">
        <div className="flex items-center gap-2">
          <GitCompare className="w-5 h-5" />
          <h2>Data Compare</h2>
        </div>
        <Button onClick={() => setShowSettings(!showSettings)} size="sm" variant="outline">
          <Settings className="w-4 h-4" />
        </Button>
      </div>

      {showSettings && (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-md p-4 mb-4">
          <h3 className="text-sm font-semibold mb-2">Data Source Configuration</h3>
          <p className="text-xs text-[var(--text-secondary)]">
            Configure data sources in Settings → Environment (SQL, NoSQL, Excel)
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 p-4">
        <div className="border border-[var(--border-primary)] rounded-md p-4">
          <h3 className="font-semibold mb-3">Left Source</h3>
          <div className="space-y-2">
            <select value={leftSource} onChange={(e) => { setLeftSource(e.target.value); fetchDatabases(e.target.value, 'left'); }}
              className="w-full px-3 py-2 border rounded-md bg-[var(--bg-tertiary)] border-[var(--border-primary)]">
              <option value="">Select Source</option>
              {dataSourceConfigs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={leftDb} onChange={(e) => { setLeftDb(e.target.value); fetchTables(leftSource, e.target.value, 'left'); }}
              className="w-full px-3 py-2 border rounded-md bg-[var(--bg-tertiary)] border-[var(--border-primary)]" disabled={!leftSource}>
              <option value="">Select Database</option>
              {leftDatabases.map(db => <option key={db} value={db}>{db}</option>)}
            </select>
            <div className="border rounded-md p-2 max-h-64 overflow-auto">
              {leftTables.map(t => (
                <label key={t.name} className="flex items-center gap-2 p-1 hover:bg-[var(--bg-tertiary)] cursor-pointer">
                  <input type="checkbox" checked={selectedLeftTables.includes(t.name)}
                    onChange={(e) => setSelectedLeftTables(e.target.checked ? [...selectedLeftTables, t.name] : selectedLeftTables.filter(n => n !== t.name))} />
                  <span className="text-sm">{t.name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="border border-[var(--border-primary)] rounded-md p-4">
          <h3 className="font-semibold mb-3">Right Source</h3>
          <div className="space-y-2">
            <select value={rightSource} onChange={(e) => { setRightSource(e.target.value); fetchDatabases(e.target.value, 'right'); }}
              className="w-full px-3 py-2 border rounded-md bg-[var(--bg-tertiary)] border-[var(--border-primary)]">
              <option value="">Select Source</option>
              {dataSourceConfigs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={rightDb} onChange={(e) => { setRightDb(e.target.value); fetchTables(rightSource, e.target.value, 'right'); }}
              className="w-full px-3 py-2 border rounded-md bg-[var(--bg-tertiary)] border-[var(--border-primary)]" disabled={!rightSource}>
              <option value="">Select Database</option>
              {rightDatabases.map(db => <option key={db} value={db}>{db}</option>)}
            </select>
            <div className="border rounded-md p-2 max-h-64 overflow-auto">
              {rightTables.map(t => (
                <label key={t.name} className="flex items-center gap-2 p-1 hover:bg-[var(--bg-tertiary)] cursor-pointer">
                  <input type="checkbox" checked={selectedRightTables.includes(t.name)}
                    onChange={(e) => setSelectedRightTables(e.target.checked ? [...selectedRightTables, t.name] : selectedRightTables.filter(n => n !== t.name))} />
                  <span className="text-sm">{t.name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-[var(--border-primary)] flex items-center justify-between">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={compareData} onChange={(e) => setCompareData(e.target.checked)} />
          <span className="text-sm">Compare data (row counts & samples)</span>
        </label>
        <Button onClick={compareSchemas} disabled={!leftSource || !rightSource || loading}>
          <GitCompare className="w-4 h-4 mr-2" />
          {loading ? 'Comparing...' : 'Compare'}
        </Button>
      </div>

      {showResults && results && (
        <div className="fixed right-0 top-0 h-full w-1/2 bg-[var(--bg-primary)] border-l border-[var(--border-primary)] shadow-lg overflow-auto z-50">
          <div className="p-4 border-b border-[var(--border-primary)] flex items-center justify-between sticky top-0 bg-[var(--bg-primary)]">
            <h3 className="font-semibold">Comparison Results</h3>
            <Button onClick={() => setShowResults(false)} size="sm" variant="ghost">✕</Button>
          </div>
          <div className="p-4 space-y-3">
            {results.tables?.map(table => (
              <div key={table.name} className="border border-[var(--border-primary)] rounded-md">
                <div className="p-3 cursor-pointer hover:bg-[var(--bg-tertiary)] flex items-center justify-between"
                  onClick={() => toggleTable(table.name)}>
                  <div className="flex items-center gap-2">
                    {expandedTables.has(table.name) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    <span className="font-medium">{table.name}</span>
                    {getStatusIcon(table.status)}
                  </div>
                  <span className="text-xs text-[var(--text-secondary)]">{table.differences?.length || 0} differences</span>
                </div>
                {expandedTables.has(table.name) && (
                  <div className="p-3 border-t border-[var(--border-primary)] space-y-2">
                    {table.differences?.map((diff, i) => (
                      <div key={i} className="text-sm p-2 bg-[var(--bg-secondary)] rounded">
                        <div className="font-medium">{diff.field}</div>
                        <div className="text-xs text-[var(--text-secondary)]">{diff.description}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

DataCompare.metadata = {
  id: 'data-compare',
  name: 'Data Compare',
  description: 'Compare schemas and data across SQL, NoSQL, and Excel sources',
  category: 'utilities',
  requiresBackend: true,
};

export default DataCompare;
