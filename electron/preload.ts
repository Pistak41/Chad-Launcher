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
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  restartAndInstall: () => ipcRenderer.send('restart-and-install'),
  onUpdateChecking: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('update-checking', listener);
    return () => { ipcRenderer.removeListener('update-checking', listener); };
  },
  onUpdateAvailable: (callback: (info: any) => void) => {
    const listener = (_: any, info: any) => callback(info);
    ipcRenderer.on('update-available', listener);
    return () => { ipcRenderer.removeListener('update-available', listener); };
  },
  onUpdateNotAvailable: (callback: (info: any) => void) => {
    const listener = (_: any, info: any) => callback(info);
    ipcRenderer.on('update-not-available', listener);
    return () => { ipcRenderer.removeListener('update-not-available', listener); };
  },
  onUpdateProgress: (callback: (progress: any) => void) => {
    const listener = (_: any, progress: any) => callback(progress);
    ipcRenderer.on('update-progress', listener);
    return () => { ipcRenderer.removeListener('update-progress', listener); };
  },
  onUpdateDownloaded: (callback: (info: any) => void) => {
    const listener = (_: any, info: any) => callback(info);
    ipcRenderer.on('update-downloaded', listener);
    return () => { ipcRenderer.removeListener('update-downloaded', listener); };
  },
  onUpdateError: (callback: (error: string) => void) => {
    const listener = (_: any, error: string) => callback(error);
    ipcRenderer.on('update-error', listener);
    return () => { ipcRenderer.removeListener('update-error', listener); };
  },
});