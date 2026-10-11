const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isDesktop: true,
  openFileDialog: () => ipcRenderer.invoke('dialog:openFile'),
  readFileDirect: (filePath) => ipcRenderer.invoke('file:readDirect', filePath),
  saveFileDirect: (filePath, data, format) => ipcRenderer.invoke('file:saveDirect', { filePath, data, format }),
  saveFileAs: (data, defaultName, format) => ipcRenderer.invoke('file:saveAs', { data, defaultName, format }),
  showInFolder: (filePath) => ipcRenderer.invoke('file:showInFolder', filePath),
  saveSessionDisk: (payload) => ipcRenderer.invoke('session:save', payload),
  loadSessionDisk: () => ipcRenderer.invoke('session:load'),
  clearSessionDisk: () => ipcRenderer.invoke('session:clear'),
  onSaveShortcut: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('shortcut:save', handler);
    return () => ipcRenderer.removeListener('shortcut:save', handler);
  }
});
