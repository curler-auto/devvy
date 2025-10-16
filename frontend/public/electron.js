const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

// Simple development check
const isDev = process.env.NODE_ENV === 'development' || process.defaultApp || /[\\/]electron-prebuilt[\\/]/.test(process.execPath) || /[\\/]electron[\\/]/.test(process.execPath);

let mainWindow;
let backendProcess;

// Start FastAPI backend
function startBackend() {
  const backendPath = path.join(__dirname, '../../backend');
  
  // Use bundled executable in production, or development setup
  let backendCmd;
  let backendArgs = [];
  let backendCwd = backendPath;
  
  if (isDev) {
    // Development mode - use Python directly
    const venvPython = path.join(backendPath, 'venv', 'bin', 'python');
    backendCmd = process.platform === 'win32' ? 
      path.join(backendPath, 'venv', 'Scripts', 'python.exe') : 
      venvPython;
    backendArgs = ['launcher_desktop.py'];
  } else {
    // Production mode - use bundled executable
    backendCmd = path.join(backendPath, 'dist', 'devtools-desktop');
    if (process.platform === 'win32') {
      backendCmd += '.exe';
    }
    backendArgs = []; // No arguments needed for bundled executable
  }
  
  // Set environment for desktop mode
  const env = { 
    ...process.env, 
    APP_MODE: 'desktop',
    DATABASE_URL: 'sqlite+aiosqlite:///./devtools.db',
    CORS_ORIGINS: '*'
  };
  
  console.log('🚀 Starting DevTools Suite Backend...');
  console.log('📍 Backend executable:', backendCmd);
  console.log('📁 Working directory:', backendCwd);
  console.log('🔧 Mode:', isDev ? 'Development' : 'Production');
  
  backendProcess = spawn(backendCmd, backendArgs, {
    cwd: backendCwd,
    shell: false,
    env: env
  });

  backendProcess.stdout.on('data', (data) => {
    console.log(`Backend: ${data}`);
  });

  backendProcess.stderr.on('data', (data) => {
    console.error(`Backend Error: ${data}`);
  });

  backendProcess.on('close', (code) => {
    console.log(`Backend process exited with code ${code}`);
  });
}

function createWindow() {
  // Start backend first
  startBackend();

  // Create browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../assets/icon.png'), // Add icon if available
    show: false // Don't show until ready
  });

  // Load React app
  const startUrl = isDev 
    ? 'http://localhost:3000' 
    : `file://${path.join(__dirname, '../build/index.html')}`;
  
  console.log(`Loading URL: ${startUrl}`);
  console.log(`__dirname: ${__dirname}`);
  
  // Wait a bit for backend to start, then load frontend
  setTimeout(() => {
    mainWindow.loadURL(startUrl);
  }, 5000); // Increased wait time

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Open DevTools in development
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Create application menu
  createMenu();
}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Collection',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            // Send message to renderer to create new collection
            mainWindow.webContents.send('menu-new-collection');
          }
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' }
      ]
    }
  ];

  // macOS specific menu adjustments
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    });

    // Window menu
    template[4].submenu = [
      { role: 'close' },
      { role: 'minimize' },
      { role: 'zoom' },
      { type: 'separator' },
      { role: 'front' }
    ];
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
  // Set dock icon on macOS
  if (process.platform === 'darwin') {
    const iconPath = path.join(__dirname, '../assets/icon.png');
    if (fs.existsSync(iconPath)) {
      app.dock.setIcon(iconPath);
    }
  }
  createWindow();
});

app.on('window-all-closed', () => {
  // Kill backend process
  if (backendProcess) {
    console.log('Terminating backend process...');
    backendProcess.kill('SIGTERM');
    
    // Force kill after 5 seconds if it doesn't terminate gracefully
    setTimeout(() => {
      if (backendProcess && !backendProcess.killed) {
        backendProcess.kill('SIGKILL');
      }
    }, 5000);
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    console.log('Blocked new window creation to:', navigationUrl);
  });
});
