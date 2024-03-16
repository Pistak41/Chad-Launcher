/* eslint-disable @typescript-eslint/no-unused-vars */
import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'node:path';
import os from 'node:os';
import { existsSync } from 'fs';

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.js
// │
process.env.DIST = path.join(__dirname, '../dist');
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, '../public');

let win: BrowserWindow | null;
// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];

function createWindow() {
  win = new BrowserWindow({
    width: 980,
    height: 552,
    icon: path.join(process.env.VITE_PUBLIC, 'chad.png'),
    autoHideMenuBar: true,
    backgroundMaterial: 'acrylic',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    // win.loadFile('dist/index.html')
    win
      .loadFile(path.join(process.env.DIST, 'index.html'))
      .then(() => {
        win?.webContents.send('JAVA_HOME', process.env.JAVA_HOME);
      });
  }

  win.webContents.setWindowOpenHandler(({url}) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  win.webContents.addListener('dom-ready', () => {

    const JAVA_HOME = process.env.JAVA_HOME?.replaceAll('\\', '/');

    if (!existsSync(`${JAVA_HOME}/bin/javaw.exe`)) return;

    win?.webContents.send('JAVA_HOME', `${JAVA_HOME}/bin/javaw.exe`);
    win?.webContents.send('get-memory', {

      totalRam: Math.floor((os.totalmem() - 1073741824) / 1073741824),
      freeRam: Math.floor(os.freemem() / 1073741824)
    });
  });
}

ipcMain.on('change-icon', () => {
  win?.setIcon(path.join(process.env.VITE_PUBLIC, 'tree.png'));
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
    win = null;
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.whenReady().then(createWindow);
