const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('hubSettings', {
  get: () => ipcRenderer.invoke('hub:get'),
  test: (hubUrl) => ipcRenderer.invoke('hub:test', hubUrl),
  save: (hubUrl) => ipcRenderer.invoke('hub:save', hubUrl),
});
