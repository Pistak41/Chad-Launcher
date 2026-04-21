/* eslint-disable @typescript-eslint/no-explicit-any */
import { type IpcRendererEvent, contextBridge, ipcRenderer } from 'electron';
import type { ConfigProps } from '../src/types/Config';

contextBridge.exposeInMainWorld("electronAPI", {
  play: () => ipcRenderer.send('play'),
  changeIcon: () => ipcRenderer.send('change-icon'),
  updateConfig: (state: Partial<ConfigProps>) => ipcRenderer.send('update-config', state),
  getENV: (callback: (event: IpcRendererEvent, ...args: any[]) => void) => {
    ipcRenderer.on('JAVA_HOME', callback);
  },
  getMemoryStatus: (callback: (event: IpcRendererEvent, ...args: any[]) => void) => {
    ipcRenderer.on('get-memory', callback);
  }
});