import React, { useState } from 'react';
import { Download, Upload, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

/**
 * Data Export/Import Component
 * Allows users to export their data for backup and import it on another machine
 * NOTE: This does NOT include license data, which requires reactivation
 */
const DataExportImport = ({ tabs, setTabs, favorites, setFavorites }) => {
  const [importing, setImporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  
  // Export all user data to a JSON file
  const exportData = () => {
    try {
      // Collect all user data
      const userData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        tabs: tabs.map(tab => ({
          id: tab.id,
          name: tab.name,
          customName: tab.customName,
          data: tab.data || {},
        })),
        favorites: favorites,
      };
      
      // Convert to JSON and create download link
      const dataStr = JSON.stringify(userData, null, 2);
      const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
      
      // Create and trigger download
      const exportFileName = `devvy-data-${new Date().toISOString().split('T')[0]}.json`;
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileName);
      linkElement.click();
      
      // Show success message
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
      toast.success('Data exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    }
  };
  
  // Import data from a JSON file
  const importData = (event) => {
    try {
      const file = event.target.files[0];
      if (!file) return;
      
      setImporting(true);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedData = JSON.parse(e.target.result);
          
          // Validate data structure
          if (!importedData.version || !importedData.tabs) {
            throw new Error('Invalid data format');
          }
          
          // Import tabs
          if (importedData.tabs && Array.isArray(importedData.tabs)) {
            // Create new tabs with imported data but new IDs
            const newTabs = importedData.tabs.map(tab => ({
              tabId: `imported-${tab.id}-${Date.now()}`,
              id: tab.id,
              name: tab.name || 'Imported Tab',
              customName: tab.customName,
              data: tab.data || {},
              imported: true,
            }));
            
            // Add to existing tabs
            setTabs(prevTabs => [...prevTabs, ...newTabs]);
          }
          
          // Import favorites
          if (importedData.favorites && Array.isArray(importedData.favorites)) {
            setFavorites(prevFavorites => {
              // Merge with existing favorites, removing duplicates
              const mergedFavorites = [...new Set([...prevFavorites, ...importedData.favorites])];
              return mergedFavorites;
            });
          }
          
          toast.success('Data imported successfully');
        } catch (error) {
          console.error('Import parsing error:', error);
          toast.error(`Failed to import data: ${error.message}`);
        } finally {
          setImporting(false);
          // Reset file input
          event.target.value = '';
        }
      };
      
      reader.onerror = () => {
        toast.error('Failed to read file');
        setImporting(false);
        event.target.value = '';
      };
      
      reader.readAsText(file);
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import data');
      setImporting(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Data Backup & Transfer</h3>
        <p className="text-sm text-gray-500">
          Export your data to transfer between devices or for backup.
          <br />
          <span className="text-amber-500">Note: License information is not included and requires reactivation.</span>
        </p>
      </div>
      
      <div className="flex flex-col gap-4 sm:flex-row">
        <Button 
          onClick={exportData} 
          variant="outline" 
          className="flex items-center gap-2"
        >
          {exportSuccess ? (
            <><Check className="w-4 h-4" /> Exported</>
          ) : (
            <><Download className="w-4 h-4" /> Export Data</>
          )}
        </Button>
        
        <div className="relative">
          <Button
            variant="outline"
            className="flex items-center gap-2"
            disabled={importing}
          >
            <Upload className="w-4 h-4" />
            Import Data
            <input
              type="file"
              accept=".json"
              onChange={importData}
              className="absolute inset-0 opacity-0 cursor-pointer"
              disabled={importing}
            />
          </Button>
        </div>
      </div>
      
      <div className="mt-4 p-4 border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 rounded-md">
        <div className="flex gap-2 items-start">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-amber-800 dark:text-amber-400">Important</h4>
            <p className="text-sm text-amber-700 dark:text-amber-500">
              After reinstalling the app or moving to a new device, you will need to:
            </p>
            <ol className="list-decimal ml-5 text-sm text-amber-700 dark:text-amber-500 space-y-1 mt-2">
              <li>Reactivate your license (if you have one)</li>
              <li>Import your data using the button above</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataExportImport;
