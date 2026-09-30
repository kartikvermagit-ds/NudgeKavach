'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('auditWorkspace', {
  load: () => ipcRenderer.invoke('workspace:load'),
  importReport: () => ipcRenderer.invoke('workspace:import'),
  exportReport: (sessionId) => ipcRenderer.invoke('workspace:export', sessionId),
  copySummary: (sessionId) => ipcRenderer.invoke('workspace:copy', sessionId),
  clearLibrary: () => ipcRenderer.invoke('workspace:clear'),
});
