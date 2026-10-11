const { app, BrowserWindow, ipcMain, dialog, shell, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs').promises;

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'LeadFilter Pro - Desktop',
    backgroundColor: '#f8fafc',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  });

  const indexPath = path.join(__dirname, '../dist/index.html');
  const devUrl = process.env.VITE_DEV_SERVER_URL;

  if (devUrl) {
    mainWindow.loadURL(devUrl);
  } else if (require('fs').existsSync(indexPath)) {
    mainWindow.loadFile(indexPath);
  } else {
    mainWindow.loadURL('http://localhost:3000');
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Open File Dialog
ipcMain.handle('dialog:openFile', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Contacts Spreadsheet',
    filters: [
      { name: 'Spreadsheets', extensions: ['csv', 'xlsx', 'xls'] },
      { name: 'CSV Files', extensions: ['csv'] },
      { name: 'Excel Files', extensions: ['xlsx', 'xls'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    properties: ['openFile']
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const filePath = result.filePaths[0];
  const fileStats = await fs.stat(filePath);
  const buffer = await fs.readFile(filePath);

  return {
    filePath,
    fileName: path.basename(filePath),
    fileSize: fileStats.size,
    // Return as base64 string for safe IPC transfer
    dataBase64: buffer.toString('base64')
  };
});

// Read Direct from Disk (Reload active file on restart/refresh)
ipcMain.handle('file:readDirect', async (event, filePath) => {
  try {
    if (!filePath) return null;
    const fileStats = await fs.stat(filePath);
    const buffer = await fs.readFile(filePath);
    return {
      success: true,
      filePath,
      fileName: path.basename(filePath),
      fileSize: fileStats.size,
      dataBase64: buffer.toString('base64')
    };
  } catch (err) {
    console.error('Failed to read direct file:', err);
    return { success: false, error: err.message };
  }
});

// Save Direct to Disk (Direct overwrite on active file)
ipcMain.handle('file:saveDirect', async (event, { filePath, data, format }) => {
  try {
    if (!filePath) {
      throw new Error('No target file path specified.');
    }

    if (format === 'csv') {
      // data is a string
      await fs.writeFile(filePath, data, 'utf-8');
    } else {
      // data is base64 string
      const buffer = Buffer.from(data, 'base64');
      await fs.writeFile(filePath, buffer);
    }

    return {
      success: true,
      filePath,
      savedAt: Date.now()
    };
  } catch (error) {
    console.error('Save direct error:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

// Save As Dialog (Save to a new file location)
ipcMain.handle('file:saveAs', async (event, { data, defaultName, format }) => {
  try {
    const filters = format === 'csv'
      ? [{ name: 'CSV File', extensions: ['csv'] }]
      : [{ name: 'Excel Workbook', extensions: ['xlsx'] }];

    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Spreadsheet As',
      defaultPath: defaultName,
      filters
    });

    if (result.canceled || !result.filePath) {
      return { canceled: true };
    }

    const filePath = result.filePath;
    if (format === 'csv') {
      await fs.writeFile(filePath, data, 'utf-8');
    } else {
      const buffer = Buffer.from(data, 'base64');
      await fs.writeFile(filePath, buffer);
    }

    return {
      success: true,
      filePath,
      savedAt: Date.now()
    };
  } catch (error) {
    console.error('Save As error:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

// Persistent session storage on Desktop (appData/last_session.json)
const sessionFilePath = path.join(app.getPath('userData'), 'leadfilter_last_session.json');
console.log('[Main] Persistent session file path:', sessionFilePath);

ipcMain.handle('session:save', async (event, sessionPayload) => {
  try {
    if (!sessionPayload || !sessionPayload.rawData || sessionPayload.rawData.length === 0) {
      console.log('[Main session:save] Clearing session file (payload is empty or null)');
      try { await fs.unlink(sessionFilePath); } catch (e) {}
      return { success: true };
    }
    const jsonStr = JSON.stringify(sessionPayload);
    await fs.writeFile(sessionFilePath, jsonStr, 'utf-8');
    console.log(`[Main session:save] Successfully wrote ${sessionPayload.rawData.length} rows to ${sessionFilePath} (${(jsonStr.length / 1024).toFixed(1)} KB)`);
    return { success: true };
  } catch (err) {
    console.error('[Main session:save] Failed to save session to disk:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('session:load', async () => {
  try {
    console.log('[Main session:load] Checking for session file at:', sessionFilePath);
    const data = await fs.readFile(sessionFilePath, 'utf-8');
    const parsed = JSON.parse(data);
    const count = parsed?.rawData?.length || 0;
    console.log(`[Main session:load] Found persistent session with ${count} rows`);
    return parsed;
  } catch (err) {
    console.log('[Main session:load] No existing session file or read failed:', err.message);
    return null;
  }
});

ipcMain.handle('session:clear', async () => {
  try {
    console.log('[Main session:clear] Deleting session file');
    await fs.unlink(sessionFilePath);
    return { success: true };
  } catch (err) {
    return { success: true };
  }
});

// Show Item in Windows File Explorer
ipcMain.handle('file:showInFolder', async (event, filePath) => {
  if (filePath) {
    shell.showItemInFolder(filePath);
    return true;
  }
  return false;
});

// Auto-Updater Integration via GitHub Releases
let autoUpdater;
try {
  autoUpdater = require('electron-updater').autoUpdater;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', (info) => {
    console.log('[AutoUpdater] Update available:', info.version);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('updater:available', info.version);
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('[AutoUpdater] Update downloaded:', info.version);
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Ready to Install',
      message: `Version ${info.version} of LeadFilter Pro has been downloaded!`,
      detail: 'Restart now to apply the update and start using the newest version?',
      buttons: ['Restart Now', 'Update on Exit'],
      defaultId: 0,
      cancelId: 1
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall();
      }
    });
  });

  autoUpdater.on('error', (err) => {
    console.warn('[AutoUpdater] Check error (ignored in dev):', err?.message || err);
  });
} catch (e) {
  console.warn('[AutoUpdater] Failed to initialize electron-updater:', e.message);
}

app.whenReady().then(() => {
  createWindow();

  // Only check for updates when running in packaged production build
  if (app.isPackaged && autoUpdater) {
    setTimeout(() => {
      autoUpdater.checkForUpdatesAndNotify().catch((err) => {
        console.warn('[AutoUpdater] checkForUpdates failed:', err.message);
      });
    }, 3000);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
