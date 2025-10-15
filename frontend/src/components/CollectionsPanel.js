import { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  FolderPlus, Plus, Trash2, Edit2, ChevronRight, ChevronDown,
  FileText, Folder, FolderOpen, Check
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

  const handleFolderDeleted = (collectionId) => {
    loadFolders(collectionId);
    loadItems(collectionId);
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
                    folders={folders[collection.id] || []}
                    isExpanded={expandedFolders.has(folder.id)}
                    onToggle={() => toggleFolder(folder.id)}
                    onOpenItem={handleOpenItem}
                    getItemsForFolder={getItemsForFolder}
                    expandedFolders={expandedFolders}
                    toggleFolder={toggleFolder}
                    token={token}
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

function FolderItem({ folder, collectionId, items, folders, isExpanded, onToggle, onOpenItem, getItemsForFolder, expandedFolders, toggleFolder, token, onFolderDeleted }) {
  const [showNewSubfolder, setShowNewSubfolder] = useState(false);
  const [newSubfolderName, setNewSubfolderName] = useState('');
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const [showRename, setShowRename] = useState(false);
  const [renameValue, setRenameValue] = useState(folder.name);

  const getSubfolders = (parentId) => {
    return folders.filter(f => f.parent_folder_id === parentId);
  };

  const createSubfolder = async (e) => {
    e.stopPropagation();
    if (!newSubfolderName.trim()) return;

    try {
      await axios.post(
        `${API}/folders/create`,
        {
          name: newSubfolderName,
          collection_id: collectionId,
          parent_folder_id: folder.id
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Subfolder created!');
      setNewSubfolderName('');
      setShowNewSubfolder(false);
      // Reload folders - this should be passed from parent
      window.location.reload(); // Temporary solution
    } catch (error) {
      console.error('Failed to create subfolder:', error);
      toast.error('Failed to create subfolder');
    }
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  const handleDeleteFolder = async () => {
    if (!window.confirm(`Delete "${folder.name}" and all its contents?`)) return;

    try {
      await axios.delete(`${API}/folders/${folder.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Folder deleted');
      setShowContextMenu(false);
      if (onFolderDeleted) onFolderDeleted();
    } catch (error) {
      console.error('Failed to delete folder:', error);
      toast.error('Failed to delete folder');
    }
  };

  const handleRenameFolder = async () => {
    if (!renameValue.trim()) return;

    try {
      await axios.put(
        `${API}/folders/${folder.id}`,
        {
          name: renameValue,
          collection_id: collectionId,
          parent_folder_id: folder.parent_folder_id
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Folder renamed');
      setShowRename(false);
      setShowContextMenu(false);
      window.location.reload(); // Temporary
    } catch (error) {
      console.error('Failed to rename folder:', error);
      toast.error('Failed to rename folder');
    }
  };

  useEffect(() => {
    const handleClickOutside = () => setShowContextMenu(false);
    if (showContextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showContextMenu]);

  const subfolders = getSubfolders(folder.id);

  return (
    <div className="folder-item">
      <div className="folder-header-wrapper">
        {showRename ? (
          <div className="folder-rename-input" onClick={(e) => e.stopPropagation()}>
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameFolder();
                if (e.key === 'Escape') {
                  setShowRename(false);
                  setRenameValue(folder.name);
                }
              }}
              autoFocus
              size="sm"
            />
            <Button size="sm" onClick={handleRenameFolder}>
              <Check className="w-3 h-3" />
            </Button>
          </div>
        ) : (
          <>
            <div 
              className="folder-header" 
              onClick={onToggle}
              onContextMenu={handleContextMenu}
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
              <Folder className="w-4 h-4 text-amber-500" />
              <span>{folder.name}</span>
            </div>
            <button
              className="folder-add-button"
              onClick={(e) => {
                e.stopPropagation();
                setShowNewSubfolder(!showNewSubfolder);
              }}
              title="New Subfolder"
              data-testid={`new-subfolder-${folder.id}`}
            >
              <FolderPlus className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>

      {/* Context Menu */}
      {showContextMenu && (
        <div
          className="context-menu"
          style={{
            position: 'fixed',
            top: contextMenuPos.y,
            left: contextMenuPos.x,
            zIndex: 1000
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="context-menu-item"
            onClick={() => {
              setShowRename(true);
              setShowContextMenu(false);
            }}
          >
            <Edit2 className="w-3.5 h-3.5" />
            Rename Folder
          </button>
          <button
            className="context-menu-item"
            onClick={() => {
              setShowNewSubfolder(true);
              setShowContextMenu(false);
            }}
          >
            <FolderPlus className="w-3.5 h-3.5" />
            Add Subfolder
          </button>
          <div className="context-menu-divider" />
          <button
            className="context-menu-item text-red-400"
            onClick={handleDeleteFolder}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete Folder
          </button>
        </div>
      )}

      {showNewSubfolder && (
        <div className="new-subfolder-input" onClick={(e) => e.stopPropagation()}>
          <Input
            value={newSubfolderName}
            onChange={(e) => setNewSubfolderName(e.target.value)}
            placeholder="Subfolder name"
            size="sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter') createSubfolder(e);
              if (e.key === 'Escape') setShowNewSubfolder(false);
            }}
            autoFocus
          />
          <Button size="sm" onClick={createSubfolder}>
            <Plus className="w-3 h-3" />
          </Button>
        </div>
      )}

      {isExpanded && (
        <div className="folder-content">
          {/* Render subfolders recursively */}
          {subfolders.map((subfolder) => (
            <FolderItem
              key={subfolder.id}
              folder={subfolder}
              collectionId={collectionId}
              items={items}
              folders={folders}
              isExpanded={expandedFolders.has(subfolder.id)}
              onToggle={() => toggleFolder(subfolder.id)}
              onOpenItem={onOpenItem}
              getItemsForFolder={getItemsForFolder}
              expandedFolders={expandedFolders}
              toggleFolder={toggleFolder}
              token={token}
              onFolderDeleted={onFolderDeleted}
            />
          ))}

          {/* Render items in this folder */}
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
