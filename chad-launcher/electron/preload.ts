/* eslint-disable @typescript-eslint/no-explicit-any */
import { type IpcRendererEvent, contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld("electronAPI", {
  changeIcon: () => ipcRenderer.send('change-icon'),
  getENV: (callback: (event: IpcRendererEvent, ...args: any[]) => void) => {
    ipcRenderer.on('JAVA_HOME', callback);
  },
  getMemoryStatus: (callback: (event: IpcRendererEvent, ...args: any[]) => void) => {
    ipcRenderer.on('get-memory', callback);
  }
});