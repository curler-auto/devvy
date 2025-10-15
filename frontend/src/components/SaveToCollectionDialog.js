import { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Folder, Plus } from 'lucide-react';
import { useAuth } from '@/AuthContextDesktop';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function SaveToCollectionDialog({ open, onClose, tab }) {
  const [collections, setCollections] = useState([]);
  const [folders, setFolders] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState('');
  const [selectedFolder, setSelectedFolder] = useState('');
  const [itemName, setItemName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const { token } = useAuth();

  useEffect(() => {
    if (open) {
      loadCollections();
      setItemName(tab.customName || tab.name);
    }
  }, [open, tab]);

  useEffect(() => {
    if (selectedCollection) {
      loadFolders(selectedCollection);
    }
  }, [selectedCollection]);

  const loadCollections = async () => {
    try {
      const response = await axios.get(`${API}/collections/list`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCollections(response.data.collections);
      if (response.data.collections.length > 0) {
        setSelectedCollection(response.data.collections[0].id);
      }
    } catch (error) {
      console.error('Failed to load collections:', error);
    }
  };

  const loadFolders = async (collectionId) => {
    try {
      const response = await axios.get(`${API}/folders/list/${collectionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFolders(response.data.folders);
    } catch (error) {
      console.error('Failed to load folders:', error);
    }
  };

  const createFolder = async () => {
    if (!newFolderName.trim() || !selectedCollection) return;

    try {
      await axios.post(
        `${API}/folders/create`,
        {
          name: newFolderName,
          collection_id: selectedCollection,
          parent_folder_id: selectedFolder || null
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Folder created!');
      setNewFolderName('');
      setShowNewFolder(false);
      loadFolders(selectedCollection);
    } catch (error) {
      console.error('Failed to create folder:', error);
      toast.error('Failed to create folder');
    }
  };

  const renderFolderOptions = (foldersList, level = 0, parentId = null) => {
    const filtered = foldersList.filter(f => f.parent_folder_id === parentId);
    const indent = '  '.repeat(level);
    
    return filtered.flatMap(folder => [
      <option key={folder.id} value={folder.id}>
        {indent}{level > 0 ? '└─ ' : ''}{folder.name}
      </option>,
      ...renderFolderOptions(foldersList, level + 1, folder.id)
    ]);
  };

  const handleSave = async () => {
    if (!itemName.trim() || !selectedCollection) {
      toast.error('Please provide a name and select a collection');
      return;
    }

    try {
      await axios.post(
        `${API}/saved-items/create`,
        {
          name: itemName,
          description: '',
          tool_id: tab.id,
          tool_data: tab.data || {},
          collection_id: selectedCollection,
          folder_id: selectedFolder || null
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Saved to collection!');
      onClose();
    } catch (error) {
      console.error('Failed to save item:', error);
      toast.error('Failed to save to collection');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="save-to-collection-dialog">
        <DialogHeader>
          <DialogTitle>Save to Collection</DialogTitle>
        </DialogHeader>

        <div className="save-form">
          <div className="form-group">
            <label className="form-label">Name</label>
            <Input
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="My Saved Work"
              data-testid="save-item-name"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Collection</label>
            <select
              value={selectedCollection}
              onChange={(e) => setSelectedCollection(e.target.value)}
              className="auth-input"
              data-testid="select-collection"
            >
              {collections.map((col) => (
                <option key={col.id} value={col.id}>
                  {col.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Folder (optional)</label>
            <div className="flex gap-2">
              <select
                value={selectedFolder}
                onChange={(e) => setSelectedFolder(e.target.value)}
                className="auth-input flex-1"
                data-testid="select-folder"
              >
                <option value="">-- No Folder --</option>
                {renderFolderOptions(folders)}
              </select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowNewFolder(!showNewFolder)}
                data-testid="toggle-new-folder"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {showNewFolder && (
            <div className="form-group">
              <div className="flex gap-2">
                <Input
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="New folder name"
                  data-testid="new-folder-name"
                />
                <Button
                  type="button"
                  onClick={createFolder}
                  size="sm"
                  data-testid="create-folder-button"
                >
                  Create
                </Button>
              </div>
            </div>
          )}

          <div className="flex gap-2 mt-6">
            <Button onClick={handleSave} className="flex-1" data-testid="save-button">
              Save
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
