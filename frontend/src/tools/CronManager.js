import React, { useState, useEffect, useRef } from 'react';
import { Cron } from 'croner';
import { Plus, Trash2, Edit2, Power, PowerOff, Clock, Calendar, Info, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';

/**
 * Cron Manager
 * Manage cron jobs with live countdown to next run
 */
function CronManager({ tab, tabs, setTabs }) {
  const [cronJobs, setCronJobs] = useState(tab.data?.cronJobs || []);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [nextRunTimes, setNextRunTimes] = useState({});
  const [timeToNext, setTimeToNext] = useState({});
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    expression: '*/5 * * * *',
    command: '',
    enabled: true,
    description: ''
  });

  // Common cron expressions
  const COMMON_EXPRESSIONS = [
    { label: 'Every minute', value: '* * * * *' },
    { label: 'Every 5 minutes', value: '*/5 * * * *' },
    { label: 'Every 15 minutes', value: '*/15 * * * *' },
    { label: 'Every 30 minutes', value: '*/30 * * * *' },
    { label: 'Every hour', value: '0 * * * *' },
    { label: 'Every day at midnight', value: '0 0 * * *' },
    { label: 'Every day at noon', value: '0 12 * * *' },
    { label: 'Every Monday at 9 AM', value: '0 9 * * 1' },
    { label: 'Every weekday at 9 AM', value: '0 9 * * 1-5' },
    { label: 'First day of month', value: '0 0 1 * *' },
  ];

  const timerRef = useRef(null);

  // Update tab data
  useEffect(() => {
    const updatedTabs = tabs.map(t => 
      t.tabId === tab.tabId 
        ? { ...t, data: { cronJobs } }
        : t
    );
    setTabs(updatedTabs);
  }, [cronJobs]);

  // Calculate next run times and countdown
  useEffect(() => {
    const calculateTimes = () => {
      const nextRuns = {};
      const timeTo = {};
      
      cronJobs.forEach(job => {
        if (job.enabled) {
          try {
            const cron = Cron(job.expression);
            const next = cron.next();
            if (next) {
              nextRuns[job.id] = next;
              const diff = next.getTime() - Date.now();
              timeTo[job.id] = diff;
            }
          } catch (err) {
            console.error(`Invalid cron expression for ${job.name}:`, err);
          }
        }
      });
      
      setNextRunTimes(nextRuns);
      setTimeToNext(timeTo);
    };

    calculateTimes();
    timerRef.current = setInterval(calculateTimes, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [cronJobs]);

  // Format time difference
  const formatTimeDiff = (ms) => {
    if (ms <= 0) return 'Running...';
    
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  // Validate cron expression
  const validateExpression = (expr) => {
    try {
      const cron = Cron(expr);
      const next = cron.next();
      return { valid: true, next };
    } catch (err) {
      return { valid: false, error: err.message };
    }
  };

  // Add or update cron job
  const saveCronJob = async () => {
    if (!formData.name.trim() || !formData.expression.trim() || !formData.command.trim()) {
      toast.error('Name, expression, and command are required');
      return;
    }

    // Validate expression
    const validation = validateExpression(formData.expression);
    if (!validation.valid) {
      toast.error(`Invalid cron expression: ${validation.error}`);
      return;
    }

    try {
      if (editingId) {
        // Update existing
        const response = await axios.put(`/api/cron/${editingId}`, formData);
        setCronJobs(cronJobs.map(j => j.id === editingId ? response.data : j));
        toast.success('Cron job updated');
      } else {
        // Add new
        const response = await axios.post('/api/cron/create', formData);
        setCronJobs([...cronJobs, response.data]);
        toast.success('Cron job created');
      }
      resetForm();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save cron job');
    }
  };

  // Delete cron job
  const deleteCronJob = async (id) => {
    if (!window.confirm('Delete this cron job?')) return;

    try {
      await axios.delete(`/api/cron/${id}`);
      setCronJobs(cronJobs.filter(j => j.id !== id));
      toast.success('Cron job deleted');
    } catch (err) {
      toast.error('Failed to delete cron job');
    }
  };

  // Toggle enabled
  const toggleEnabled = async (id) => {
    const job = cronJobs.find(j => j.id === id);
    if (!job) return;

    try {
      const response = await axios.patch(`/api/cron/${id}/toggle`);
      setCronJobs(cronJobs.map(j => j.id === id ? response.data : j));
      toast.success(response.data.enabled ? 'Cron job enabled' : 'Cron job disabled');
    } catch (err) {
      toast.error('Failed to toggle cron job');
    }
  };

  // Edit cron job
  const editCronJob = (job) => {
    setFormData({
      name: job.name,
      expression: job.expression,
      command: job.command,
      enabled: job.enabled,
      description: job.description || ''
    });
    setEditingId(job.id);
    setShowAddDialog(true);
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      expression: '*/5 * * * *',
      command: '',
      enabled: true,
      description: ''
    });
    setEditingId(null);
    setShowAddDialog(false);
  };

  // Load cron jobs from backend
  const loadCronJobs = async () => {
    try {
      const response = await axios.get('/api/cron/list');
      setCronJobs(response.data.jobs || []);
    } catch (err) {
      // Fallback to local state if backend not available
      console.log('Using local cron jobs');
    }
  };

  useEffect(() => {
    loadCronJobs();
  }, []);

  // Preview next run
  const previewNextRun = () => {
    const validation = validateExpression(formData.expression);
    if (validation.valid && validation.next) {
      return validation.next.toLocaleString();
    }
    return 'Invalid expression';
  };

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">Cron Manager</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Manage scheduled tasks with live countdown
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} size="sm" className="bg-[var(--accent-primary)] text-white">
          <Plus className="w-4 h-4 mr-2" />
          Add Cron Job
        </Button>
      </div>

      {/* Cron Jobs List */}
      <div className="flex-1 overflow-auto">
        {cronJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Clock className="w-16 h-16 text-[var(--text-secondary)] mb-4" />
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">No Cron Jobs</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              Create your first scheduled task
            </p>
            <Button onClick={() => setShowAddDialog(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Cron Job
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {cronJobs.map(job => (
              <div
                key={job.id}
                className={`p-4 border-2 rounded-lg ${
                  job.enabled 
                    ? 'border-[var(--border-primary)] bg-[var(--bg-secondary)]' 
                    : 'border-[var(--border-primary)] bg-[var(--bg-tertiary)] opacity-60'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold text-[var(--text-primary)]">{job.name}</h3>
                      {job.enabled ? (
                        <span className="px-2 py-0.5 text-xs rounded bg-green-500/20 text-green-500 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-xs rounded bg-gray-500/20 text-gray-500">
                          Disabled
                        </span>
                      )}
                    </div>
                    {job.description && (
                      <p className="text-sm text-[var(--text-secondary)] mb-2">{job.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)]">
                      <span className="font-mono bg-[var(--bg-tertiary)] px-2 py-1 rounded">
                        {job.expression}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {job.lastRun ? new Date(job.lastRun).toLocaleString() : 'Never run'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => toggleEnabled(job.id)}
                      className="p-2 hover:bg-[var(--bg-tertiary)] rounded"
                      title={job.enabled ? 'Disable' : 'Enable'}
                    >
                      {job.enabled ? (
                        <Power className="w-4 h-4 text-green-500" />
                      ) : (
                        <PowerOff className="w-4 h-4 text-gray-500" />
                      )}
                    </button>
                    <button
                      onClick={() => editCronJob(job)}
                      className="p-2 hover:bg-[var(--bg-tertiary)] rounded"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4 text-[var(--text-secondary)]" />
                    </button>
                    <button
                      onClick={() => deleteCronJob(job.id)}
                      className="p-2 hover:bg-[var(--bg-tertiary)] rounded"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>

                {/* Command */}
                <div className="mb-3 p-2 bg-[var(--bg-tertiary)] rounded">
                  <p className="text-xs text-[var(--text-secondary)] mb-1">Command:</p>
                  <code className="text-xs text-[var(--text-primary)] font-mono">{job.command}</code>
                </div>

                {/* Next Run Countdown */}
                {job.enabled && nextRunTimes[job.id] && (
                  <div className="flex items-center justify-between p-3 bg-blue-500/10 border border-blue-500/30 rounded">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-500" />
                      <span className="text-sm font-medium text-[var(--text-primary)]">Next Run:</span>
                      <span className="text-sm text-[var(--text-secondary)]">
                        {nextRunTimes[job.id].toLocaleString()}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-500 font-mono">
                        {formatTimeDiff(timeToNext[job.id])}
                      </div>
                      <div className="text-xs text-[var(--text-secondary)]">remaining</div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-primary)] border-2 border-[var(--border-primary)] rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-auto">
            <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-4">
              {editingId ? 'Edit Cron Job' : 'Add Cron Job'}
            </h3>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Daily Backup"
                  className="w-full px-3 py-2 border rounded bg-[var(--bg-secondary)] border-[var(--border-primary)] text-[var(--text-primary)]"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description"
                  className="w-full px-3 py-2 border rounded bg-[var(--bg-secondary)] border-[var(--border-primary)] text-[var(--text-primary)]"
                />
              </div>

              {/* Cron Expression */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  Cron Expression <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.expression}
                  onChange={(e) => setFormData({ ...formData, expression: e.target.value })}
                  placeholder="*/5 * * * *"
                  className="w-full px-3 py-2 border rounded bg-[var(--bg-secondary)] border-[var(--border-primary)] text-[var(--text-primary)] font-mono"
                />
                <div className="mt-2 p-2 bg-blue-500/10 border border-blue-500/30 rounded">
                  <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                    <Info className="w-3 h-3" />
                    <span>Next run: <strong>{previewNextRun()}</strong></span>
                  </div>
                </div>
              </div>

              {/* Common Expressions */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Common Expressions
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {COMMON_EXPRESSIONS.map((expr, idx) => (
                    <button
                      key={idx}
                      onClick={() => setFormData({ ...formData, expression: expr.value })}
                      className="px-3 py-2 text-xs text-left border rounded hover:bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)]"
                    >
                      <div className="font-medium">{expr.label}</div>
                      <div className="text-[var(--text-secondary)] font-mono">{expr.value}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Command */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  Command <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.command}
                  onChange={(e) => setFormData({ ...formData, command: e.target.value })}
                  placeholder="e.g., /usr/bin/backup.sh"
                  rows={3}
                  className="w-full px-3 py-2 border rounded bg-[var(--bg-secondary)] border-[var(--border-primary)] text-[var(--text-primary)] font-mono text-sm"
                />
              </div>

              {/* Enabled */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="enabled"
                  checked={formData.enabled}
                  onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="enabled" className="text-sm text-[var(--text-primary)]">
                  Enable this cron job
                </label>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <Button onClick={saveCronJob} size="sm" className="bg-[var(--accent-primary)] text-white">
                {editingId ? 'Update' : 'Create'} Cron Job
              </Button>
              <Button onClick={resetForm} size="sm" variant="outline">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CronManager;
