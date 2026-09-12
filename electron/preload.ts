/* eslint-disable @typescript-eslint/no-explicit-any */
import { type IpcRendererEvent, contextBridge, ipcRenderer } from 'electron';
import type { ConfigProps } from '../common/types/Config';
import type { HeliosServer } from 'helios-core/common';

contextBridge.exposeInMainWorld("electronAPI", {
  play: () => ipcRenderer.send('play'),
  onDownloadProgress: (callback: (event: IpcRendererEvent, progress: number) => void) => {

    ipcRenderer.on('download-progress', callback);

    return () => {
      ipcRenderer.removeListener('download-progress', callback);
    };
  },
  onDownloadComplete: (callback: () => void) => {
    ipcRenderer.on('download-complete', callback);

    return () => {
      ipcRenderer.removeListener('download-complete', callback);
    };
  },

  onDownloadError: (callback: (error: string) => void) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      error: string
    ) => {
      callback(error);
    };

    ipcRenderer.on('download-error', listener);

    return () => {
      ipcRenderer.removeListener('download-error', listener);
    };
  },
  openFolder: () => ipcRenderer.invoke('dialog:openDirectory'),
  getServers: () => ipcRenderer.invoke('get-servers'),
  //esto no lo puedo hacer handler porque el proceso de helios es asyncrono y es mejor que haga un fire & forget
  getReady: (callback: (event: IpcRendererEvent, server: HeliosServer) => void) => {
    ipcRenderer.on('ready', callback);
  },
  updateConfig: (state: Partial<ConfigProps>) => ipcRenderer.send('update-config', state),
  getJava: () => ipcRenderer.invoke('get-java'),
  getMemory: () => ipcRenderer.invoke('get-memory'),
});