import { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  FolderPlus, Plus, Trash2, Edit2, ChevronRight, ChevronDown,
  FileText, Folder, FolderOpen
} from 'lucide-react';
import { useAuth } from '@/AuthContext';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function CollectionsPanel({ onOpenItem }) {
  const [collections, setCollections] = useState([]);
  const [folders, setFolders] = useState({});
  const [items, setItems] = useState({});
  const [expandedCollections, setExpandedCollections] = useState(new Set());
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [showNewCollection, setShowNewCollection] = useState(false);
  const { token } = useAuth();

  useEffect(() => {
    loadCollections();
  }, []);

  const loadCollections = async () => {
    try {
      const response = await axios.get(`${API}/collections/list`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCollections(response.data.collections);
    } catch (error) {
      console.error('Failed to load collections:', error);
    }
  };

  const loadFolders = async (collectionId) => {
    try {
      const response = await axios.get(`${API}/folders/list/${collectionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFolders(prev => ({ ...prev, [collectionId]: response.data.folders }));
    } catch (error) {
      console.error('Failed to load folders:', error);
    }
  };

  const loadItems = async (collectionId) => {
    try {
      const response = await axios.get(`${API}/saved-items/list/${collectionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setItems(prev => ({ ...prev, [collectionId]: response.data.items }));
    } catch (error) {
      console.error('Failed to load items:', error);
    }
  };

  const toggleCollection = (collectionId) => {
    const newExpanded = new Set(expandedCollections);
    if (newExpanded.has(collectionId)) {
      newExpanded.delete(collectionId);
    } else {
      newExpanded.add(collectionId);
      loadFolders(collectionId);
      loadItems(collectionId);
    }
    setExpandedCollections(newExpanded);
  };

  const toggleFolder = (folderId) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const createCollection = async (name, description) => {
    try {
      await axios.post(
        `${API}/collections/create`,
        { name, description },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Collection created!');
      loadCollections();
      setShowNewCollection(false);
    } catch (error) {
      console.error('Failed to create collection:', error);
      toast.error('Failed to create collection');
    }
  };

  const deleteCollection = async (collectionId) => {
    if (!window.confirm('Delete this collection and all its contents?')) return;
    
    try {
      await axios.delete(`${API}/collections/${collectionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Collection deleted');
      loadCollections();
    } catch (error) {
      console.error('Failed to delete collection:', error);
      toast.error('Failed to delete collection');
    }
  };

  const handleOpenItem = async (itemId) => {
    try {
      const response = await axios.get(`${API}/saved-items/${itemId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const item = response.data;
      onOpenItem(item);
    } catch (error) {
      console.error('Failed to load item:', error);
      toast.error('Failed to load saved item');
    }
  };

  const getItemsForFolder = (collectionId, folderId) => {
    return (items[collectionId] || []).filter(item => item.folder_id === folderId);
  };

  const getRootItems = (collectionId) => {
    return (items[collectionId] || []).filter(item => !item.folder_id);
  };

  const getRootFolders = (collectionId) => {
    return (folders[collectionId] || []).filter(folder => !folder.parent_folder_id);
  };

  return (
    <div className="collections-panel-container">
      <div className="collections-header">
        <h3 className="text-sm font-semibold">Collections</h3>
        <Button
          size="sm"
          onClick={() => setShowNewCollection(true)}
          data-testid="new-collection-button"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      <div className="collections-list">
        {collections.map((collection) => (
          <div key={collection.id} className="collection-item">
            <div
              className="collection-header"
              onClick={() => toggleCollection(collection.id)}
              data-testid={`collection-${collection.id}`}
            >
              {expandedCollections.has(collection.id) ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
              <FolderOpen className="w-4 h-4 text-emerald-500" />
              <span className="flex-1">{collection.name}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteCollection(collection.id);
                }}
                className="delete-icon"
                data-testid={`delete-collection-${collection.id}`}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>

            {expandedCollections.has(collection.id) && (
              <div className="collection-content">
                {/* Root folders */}
                {getRootFolders(collection.id).map((folder) => (
                  <FolderItem
                    key={folder.id}
                    folder={folder}
                    collectionId={collection.id}
                    items={items}
                    isExpanded={expandedFolders.has(folder.id)}
                    onToggle={() => toggleFolder(folder.id)}
                    onOpenItem={handleOpenItem}
                    getItemsForFolder={getItemsForFolder}
                  />
                ))}

                {/* Root items */}
                {getRootItems(collection.id).map((item) => (
                  <div
                    key={item.id}
                    className="saved-item"
                    onClick={() => handleOpenItem(item.id)}
                    data-testid={`saved-item-${item.id}`}
                  >
                    <FileText className="w-4 h-4 text-gray-400" />
                    <span>{item.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {collections.length === 0 && (
          <div className="empty-collections">
            <p className="text-sm text-gray-500">No collections yet</p>
            <p className="text-xs text-gray-600 mt-1">Create one to save your work</p>
          </div>
        )}
      </div>

      {showNewCollection && (
        <NewCollectionDialog
          onClose={() => setShowNewCollection(false)}
          onCreate={createCollection}
        />
      )}
    </div>
  );
}

function FolderItem({ folder, collectionId, items, isExpanded, onToggle, onOpenItem, getItemsForFolder }) {
  return (
    <div className="folder-item">
      <div className="folder-header" onClick={onToggle}>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
        <Folder className="w-4 h-4 text-amber-500" />
        <span>{folder.name}</span>
      </div>

      {isExpanded && (
        <div className="folder-content">
          {getItemsForFolder(collectionId, folder.id).map((item) => (
            <div
              key={item.id}
              className="saved-item"
              onClick={() => onOpenItem(item.id)}
              data-testid={`saved-item-${item.id}`}
            >
              <FileText className="w-4 h-4 text-gray-400" />
              <span>{item.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NewCollectionDialog({ onClose, onCreate }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) {
      onCreate(name, description);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="create-collection-dialog">
        <DialogHeader>
          <DialogTitle>New Collection</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="create-collection-form">
          <div className="form-group">
            <label className="form-label">Collection Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My API Requests"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description (optional)</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Collection description"
            />
          </div>

          <div className="flex gap-2 mt-6">
            <Button type="submit" className="flex-1">Create</Button>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
