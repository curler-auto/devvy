import { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Settings, Users, Building2, Plus, Crown, Shield } from 'lucide-react';
import { useAuth } from '@/AuthContext';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function AdminPanel({ onClose }) {
  const [activeTab, setActiveTab] = useState('tools');
  const [toolsConfig, setToolsConfig] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const { token } = useAuth();

  useEffect(() => {
    if (activeTab === 'tools') {
      loadToolsConfig();
    } else if (activeTab === 'organizations') {
      loadOrganizations();
    }
  }, [activeTab]);

  const loadToolsConfig = async () => {
    try {
      console.log('Loading tools config with token:', token ? 'Token present' : 'No token');
      const response = await axios.get(`${API}/admin/tools-config`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setToolsConfig(response.data.tools);
    } catch (error) {
      console.error('Failed to load tools config:', error);
      console.error('Error details:', error.response?.data);
      toast.error('Failed to load tools configuration');
    }
  };

  const loadOrganizations = async () => {
    try {
      const response = await axios.get(`${API}/admin/organizations`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setOrganizations(response.data.organizations);
    } catch (error) {
      console.error('Failed to load organizations:', error);
      toast.error('Failed to load organizations');
    }
  };

  const toggleToolPremium = async (toolId, isPremium) => {
    try {
      await axios.post(
        `${API}/admin/configure-tool`,
        { tool_id: toolId, is_premium: isPremium },
        { 
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      toast.success(`Tool ${isPremium ? 'set to Premium' : 'set to Free'}`);
      loadToolsConfig();
    } catch (error) {
      console.error('Failed to update tool:', error);
      toast.error('Failed to update tool configuration');
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="admin-panel-dialog" data-testid="admin-panel">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-500" />
            Admin Panel
          </DialogTitle>
        </DialogHeader>

        <div className="admin-panel-tabs">
          <button
            className={`admin-tab ${activeTab === 'tools' ? 'active' : ''}`}
            onClick={() => setActiveTab('tools')}
            data-testid="admin-tab-tools"
          >
            <Settings className="w-4 h-4" />
            Tool Configuration
          </button>
          <button
            className={`admin-tab ${activeTab === 'organizations' ? 'active' : ''}`}
            onClick={() => setActiveTab('organizations')}
            data-testid="admin-tab-orgs"
          >
            <Building2 className="w-4 h-4" />
            Organizations
          </button>
        </div>

        <div className="admin-panel-content">
          {activeTab === 'tools' && (
            <div className="tools-config-section">
              <h3 className="text-sm font-semibold mb-4">Configure Tool Access Levels</h3>
              <div className="tools-config-list">
                {toolsConfig.map((tool) => (
                  <Card key={tool.tool_id} className="tool-config-card">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {tool.is_premium ? (
                          <Crown className="w-5 h-5 text-amber-500" />
                        ) : (
                          <div className="w-5 h-5 rounded bg-emerald-500/20 flex items-center justify-center">
                            <span className="text-xs text-emerald-500 font-bold">F</span>
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-sm">{tool.tool_name}</div>
                          <div className="text-xs text-gray-500">{tool.tool_id}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">
                          {tool.is_premium ? 'Premium' : 'Free'}
                        </span>
                        <Switch
                          checked={tool.is_premium}
                          onCheckedChange={(checked) => toggleToolPremium(tool.tool_id, checked)}
                          data-testid={`tool-switch-${tool.tool_id}`}
                        />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'organizations' && (
            <div className="organizations-section">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">Organizations</h3>
                <Button
                  size="sm"
                  onClick={() => setShowCreateOrg(true)}
                  data-testid="create-org-button"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Organization
                </Button>
              </div>
              <div className="organizations-list">
                {organizations.map((org) => (
                  <Card key={org.id} className="org-card">
                    <div className="org-card-header">
                      <div>
                        <div className="font-medium">{org.name}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          License Key: {org.license_key}
                        </div>
                      </div>
                      <div className={`license-badge ${org.license_tier}`}>
                        {org.license_tier === 'premium' ? (
                          <Crown className="w-3 h-3" />
                        ) : null}
                        {org.license_tier.toUpperCase()}
                      </div>
                    </div>
                    <div className="org-card-stats">
                      <div className="stat">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span>{org.active_licenses} / {org.max_licenses} licenses used</span>
                      </div>
                      {org.expiry_date && (
                        <div className="text-xs text-gray-500">
                          Expires: {new Date(org.expiry_date).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>

        {showCreateOrg && (
          <CreateOrganizationDialog
            onClose={() => setShowCreateOrg(false)}
            onCreated={() => {
              setShowCreateOrg(false);
              loadOrganizations();
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function CreateOrganizationDialog({ onClose, onCreated }) {
  const [formData, setFormData] = useState({
    name: '',
    license_tier: 'premium',
    max_licenses: 20,
    admin_email: '',
    admin_password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const { token } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await axios.post(`${API}/admin/create-organization`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      toast.success('Organization created successfully!');
      onCreated();
    } catch (error) {
      console.error('Failed to create organization:', error);
      toast.error(error.response?.data?.detail || 'Failed to create organization');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="create-org-dialog">
        <DialogHeader>
          <DialogTitle>Create New Organization</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="create-org-form">
          <div className="form-group">
            <label className="form-label">Organization Name</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="Acme Corporation"
            />
          </div>

          <div className="form-group">
            <label className="form-label">License Tier</label>
            <select
              value={formData.license_tier}
              onChange={(e) => setFormData({ ...formData, license_tier: e.target.value })}
              className="auth-input"
            >
              <option value="free">Free</option>
              <option value="premium">Premium</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Number of Licenses</label>
            <Input
              type="number"
              min="1"
              max="200"
              value={formData.max_licenses}
              onChange={(e) => setFormData({ ...formData, max_licenses: parseInt(e.target.value) })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Admin Email</label>
            <Input
              type="email"
              value={formData.admin_email}
              onChange={(e) => setFormData({ ...formData, admin_email: e.target.value })}
              required
              placeholder="admin@acme.com"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Admin Password</label>
            <Input
              type="password"
              value={formData.admin_password}
              onChange={(e) => setFormData({ ...formData, admin_password: e.target.value })}
              required
              minLength={6}
            />
          </div>

          <div className="flex gap-2 mt-6">
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? 'Creating...' : 'Create Organization'}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
