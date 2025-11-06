import React, { useEffect, useRef, useState } from 'react';
import { Upload, Download, Save, FileSpreadsheet, Plus, Trash2, Copy, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import ToolHeader from '@/components/ToolHeader';
import * as XLSX from 'xlsx';

// Luckysheet is loaded from CDN in index.html
const luckysheet = window.luckysheet;

/**
 * SheetVue - Excel-like Spreadsheet Tool
 * Uses Luckysheet for full Excel functionality
 * MIT Licensed - Safe for commercial use
 */
function SheetVue({ toolId, tab, tabs, setTabs }) {
  const containerRef = useRef(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [fileName, setFileName] = useState(tab.data?.fileName || 'Untitled Spreadsheet');
  const [hasChanges, setHasChanges] = useState(false);
  const fileInputRef = useRef(null);

  // Initialize Luckysheet
  useEffect(() => {
    // Add a delay to ensure DOM and jQuery are ready
    const initTimer = setTimeout(() => {
      console.log('SheetVue: Starting initialization...');
      console.log('Luckysheet available:', typeof luckysheet !== 'undefined');
      
      const container = document.getElementById('luckysheet-container');
      console.log('Container found:', !!container);
      console.log('Already initialized:', isInitialized);
      
      if (!container) {
        console.error('Container not found!');
        toast.error('Failed to initialize: Container not found');
        return;
      }
      
      if (isInitialized) {
        console.log('Already initialized, skipping');
        return;
      }
      
      try {
        console.log('Attempting to initialize Luckysheet...')
        
        // Destroy existing instance if any
        if (window.luckysheet) {
          try {
            console.log('Destroying existing instance...');
            luckysheet.destroy();
          } catch (e) {
            console.log('No existing instance to destroy:', e.message);
          }
        }

        // Load saved data from tab if exists
        const savedData = tab.data?.sheetData || [{
          name: 'Sheet1',
          color: '',
          status: 1,
          order: 0,
          data: [],
          config: {},
          index: 0
        }];
        
        console.log('Saved data:', savedData);

        // Initialize Luckysheet
        console.log('Calling luckysheet.create...');
        luckysheet.create({
          container: 'luckysheet-container',
          title: fileName,
          lang: 'en',
          showinfobar: false,
          showsheetbar: true,
          showstatisticBar: true,
          sheetFormulaBar: true,
          enableAddRow: true,
          enableAddCol: true,
          userInfo: false,
          myFolderUrl: '',
          devicePixelRatio: window.devicePixelRatio,
          allowCopy: true,
          allowEdit: true,
          enableAddBackTop: false,
          showtoolbar: true,
          showtoolbarConfig: {
            undoRedo: true,
            paintFormat: true,
            currencyFormat: true,
            percentageFormat: true,
            numberDecrease: true,
            numberIncrease: true,
            moreFormats: true,
            font: true,
            fontSize: true,
            bold: true,
            italic: true,
            strikethrough: true,
            underline: true,
            textColor: true,
            fillColor: true,
            border: true,
            mergeCell: true,
            horizontalAlignMode: true,
            verticalAlignMode: true,
            textWrapMode: true,
            textRotateMode: true,
            image: true,
            link: true,
            chart: true,
            postil: true,
            pivotTable: true,
            function: true,
            frozenMode: true,
            sortAndFilter: true,
            conditionalFormat: true,
            dataVerification: true,
            splitColumn: true,
            screenshot: true,
            findAndReplace: true,
            protection: true,
            print: true
          },
          data: savedData,
          hook: {
            cellUpdated: function() {
              setHasChanges(true);
              saveToTab();
            },
            sheetCreateAfter: function() {
              setHasChanges(true);
              saveToTab();
            },
            sheetDeleteAfter: function() {
              setHasChanges(true);
              saveToTab();
            },
            sheetActivate: function() {
              saveToTab();
            }
          }
        });

        setIsInitialized(true);
        console.log('✅ Luckysheet initialized successfully!');
        toast.success('Spreadsheet loaded');
      } catch (error) {
        console.error('❌ Failed to initialize Luckysheet:', error);
        console.error('Error details:', error.message, error.stack);
        toast.error(`Failed to initialize spreadsheet: ${error.message}`);
      }
    }, 300); // 300ms delay to ensure DOM and jQuery are ready

    return () => {
      console.log('SheetVue: Cleaning up...');
      clearTimeout(initTimer);
    };
  }, []);

  // Save sheet data to tab state
  const saveToTab = () => {
    try {
      if (window.luckysheet) {
        const sheets = luckysheet.getAllSheets();
        const updatedTabs = tabs.map(t => 
          t.tabId === tab.tabId 
            ? { 
                ...t, 
                data: { 
                  ...t.data,
                  sheetData: sheets,
                  fileName: fileName
                } 
              }
            : t
        );
        setTabs(updatedTabs);
      }
    } catch (error) {
      console.error('Failed to save sheet data:', error);
    }
  };

  // Handle file upload
  const handleFileUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        // Convert Excel to Luckysheet format
        const luckysheetData = [];
        
        workbook.SheetNames.forEach((sheetName, index) => {
          const worksheet = workbook.Sheets[sheetName];
          const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
          
          const cellData = [];
          for (let row = range.s.r; row <= range.e.r; row++) {
            const rowData = [];
            for (let col = range.s.c; col <= range.e.c; col++) {
              const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
              const cell = worksheet[cellAddress];
              
              if (cell) {
                rowData.push({
                  v: cell.v,
                  ct: { fa: 'General', t: 'g' },
                  m: cell.w || String(cell.v)
                });
              } else {
                rowData.push(null);
              }
            }
            cellData.push(rowData);
          }

          luckysheetData.push({
            name: sheetName,
            color: '',
            status: index === 0 ? 1 : 0,
            order: index,
            data: cellData,
            config: {},
            index: index
          });
        });

        // Destroy and recreate with new data
        luckysheet.destroy();
        luckysheet.create({
          container: 'luckysheet-container',
          title: file.name,
          lang: 'en',
          data: luckysheetData,
          showinfobar: false,
          showsheetbar: true,
          showstatisticBar: true,
          sheetFormulaBar: true
        });

        setFileName(file.name);
        setHasChanges(false);
        toast.success(`Loaded ${file.name}`);
      } catch (error) {
        console.error('Failed to load file:', error);
        toast.error('Failed to load Excel file');
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // Export to Excel
  const handleExportExcel = () => {
    try {
      const sheets = luckysheet.getAllSheets();
      const workbook = XLSX.utils.book_new();

      sheets.forEach(sheet => {
        const data = sheet.data || [];
        const wsData = data.map(row => 
          row ? row.map(cell => cell ? (cell.v !== undefined ? cell.v : '') : '') : []
        );

        const worksheet = XLSX.utils.aoa_to_sheet(wsData);
        XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
      });

      XLSX.writeFile(workbook, fileName.replace(/\.[^/.]+$/, '') + '.xlsx');
      toast.success('Exported to Excel successfully');
      setHasChanges(false);
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export Excel file');
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    try {
      const currentSheet = luckysheet.getSheet();
      const data = currentSheet.data || [];
      const csvData = data.map(row => 
        row ? row.map(cell => cell ? (cell.v !== undefined ? cell.v : '') : '').join(',') : ''
      ).join('\n');

      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName.replace(/\.[^/.]+$/, '') + '.csv';
      a.click();
      URL.revokeObjectURL(url);

      toast.success('Exported to CSV successfully');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export CSV file');
    }
  };

  // Create new spreadsheet
  const handleNew = () => {
    if (hasChanges) {
      if (!window.confirm('You have unsaved changes. Create new spreadsheet?')) {
        return;
      }
    }

    luckysheet.destroy();
    luckysheet.create({
      container: 'luckysheet-container',
      title: 'Untitled Spreadsheet',
      lang: 'en',
      data: [{
        name: 'Sheet1',
        color: '',
        status: 1,
        order: 0,
        data: [],
        config: {},
        index: 0
      }],
      showinfobar: false,
      showsheetbar: true,
      showstatisticBar: true,
      sheetFormulaBar: true
    });

    setFileName('Untitled Spreadsheet');
    setHasChanges(false);
    toast.success('Created new spreadsheet');
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg-primary)]">
      <ToolHeader toolId={toolId || 'sheet-vue'} toolName="SheetVue">
        <div className="flex items-center gap-2">
          <Button
            onClick={handleNew}
            size="sm"
            variant="outline"
            title="New Spreadsheet"
          >
            <Plus className="w-4 h-4 mr-1" />
            New
          </Button>
          
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileUpload}
            className="hidden"
          />
          
          <Button
            onClick={() => fileInputRef.current?.click()}
            size="sm"
            variant="outline"
            title="Open Excel File"
          >
            <Upload className="w-4 h-4 mr-1" />
            Open
          </Button>

          <Button
            onClick={handleExportExcel}
            size="sm"
            variant="outline"
            title="Export to Excel"
          >
            <Download className="w-4 h-4 mr-1" />
            Excel
          </Button>

          <Button
            onClick={handleExportCSV}
            size="sm"
            variant="outline"
            title="Export to CSV"
          >
            <FileSpreadsheet className="w-4 h-4 mr-1" />
            CSV
          </Button>

          {hasChanges && (
            <span className="text-xs text-amber-500 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Unsaved
            </span>
          )}
        </div>
      </ToolHeader>

      <div className="flex-1 relative overflow-hidden" style={{ minHeight: '500px' }}>
        <div
          id="luckysheet-container"
          ref={containerRef}
          style={{ 
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            margin: 0,
            padding: 0
          }}
        />
      </div>
    </div>
  );
}

// Tool metadata
SheetVue.metadata = {
  id: 'sheet-vue',
  name: 'SheetVue',
  description: 'Excel-like spreadsheet with formulas, charts, and pivot tables',
  category: 'excel',
  requiresBackend: false,
};

export default SheetVue;
