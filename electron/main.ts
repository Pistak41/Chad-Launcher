import 'dotenv/config';
import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import { fork } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import { existsSync, mkdirSync } from 'node:fs';
import type { ConfigProps } from '@common/types/Config';
import ConfigManager from '@common/utils/ConfigManager';
import { DistributionAPI, HeliosServer } from 'helios-core/common';
import { DISTRO_URL, SYS_ROOT } from './utils';
import { MinecraftLauncher } from './launcher';
import { autoUpdater } from 'electron-updater';

process.env.DIST = path.join(__dirname, '../dist');

const { VITE_DEV_SERVER_URL } = process.env;

let win: BrowserWindow | null;
const manager = new ConfigManager();
const launcher = new MinecraftLauncher();

function createWindow() {
  win = new BrowserWindow({
    width: 980,
    height: 552,
    icon: app.isPackaged
      ? path.join(process.resourcesPath, 'build', 'chad.png')
      : path.join('src', 'assets', 'chad.png'),
    autoHideMenuBar: true,
    backgroundMaterial: 'acrylic',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (!existsSync(SYS_ROOT)) {
    mkdirSync(SYS_ROOT, { recursive: true });
  }

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(process.env.DIST, 'index.html'));
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  runHelios();
}

type ChildEvents =
  | { type: 'selectedServer', data: HeliosServer }
  | { type: 'log', data: string }
  | { type: 'percentage', data: string }

type EventHandlers = {
  [K in ChildEvents as K['type']]: (data: K['data']) => void
}

const eventHandlers: EventHandlers = {
  selectedServer: data => {
    win?.webContents.send('ready', data);
  },
  log: str => console.log(str),
  percentage: str => {
    win?.webContents.send('download-progress', str);
    console.log('percentage', str);
  }
};

function runHelios(serverId = manager.config.server?.rawServer?.id) {
  return new Promise(resolve => {
    const runnerPath = existsSync(path.join(__dirname, 'heliosRunner.js'))
      ? path.join(__dirname, 'heliosRunner.js')
      : path.join(process.cwd(), 'electron', 'heliosRunner.ts');

    const child = fork(
      runnerPath,
      [],
      { stdio: 'inherit', env: { ...process.env, DISTRO_URL } }
    );

    child.send({
      launcherDirectory: app.getPath('userData'),
      commonDirectory: path.join(SYS_ROOT, 'common'),
      instanceDirectory: path.join(SYS_ROOT, 'instances'),
      serverId,
      distroUrl: DISTRO_URL
    });

    child.on('message', (msg: ChildEvents) => (eventHandlers[msg.type] as (data: typeof msg.data) => void)?.(msg.data));

    child.on('close', (code) => {
      resolve(code);
    });
  });
}

ipcMain.handle('dialog:openDirectory', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    defaultPath: manager.config.JAVA_HOME
  });

  if (canceled) return;

  return filePaths[0];
});

ipcMain.on('update-config', (_, c: Partial<ConfigProps>) => manager.saveValues(c));

ipcMain.handle('get-java', () => manager.config.JAVA_HOME ?? process.env.JAVA_HOME);

ipcMain.handle('get-memory', () => ({
  totalRam: Math.floor((os.totalmem() - 1073741824) / 1073741824),
  freeRam: Math.floor(os.freemem() / 1073741824)
}));

ipcMain.handle('get-servers', async () => {
  const api = new DistributionAPI(
    app.getPath('userData'),
    path.join(SYS_ROOT, 'common'),
    path.join(SYS_ROOT, 'instances'),
    DISTRO_URL,
    false
  );

  const { servers } = await api.getDistribution();
  return servers;
});

ipcMain.handle('get-app-version', () => app.getVersion());

ipcMain.handle('check-for-updates', async () => {
  try {
    return await autoUpdater.checkForUpdates();
  } catch (err: any) {
    console.error('Error checking for updates:', err);
    win?.webContents.send('update-error', err?.message || String(err));
    throw err;
  }
});

ipcMain.on('restart-and-install', () => {
  autoUpdater.quitAndInstall();
});

ipcMain.on('play', async () => {
  try {
    await launcher.launch({
      onProgress: (progress) => {
        win?.webContents.send('download-progress', progress);
      }
    });
  } catch (err: any) {
    console.error('Error launching Minecraft:', err);
    win?.webContents.send('download-error', err.message || String(err));
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.whenReady().then(() => {
  createWindow();
  if (app.isPackaged) {
    autoUpdater.checkForUpdatesAndNotify();
  }
});

autoUpdater.on('checking-for-update', () => {
  console.log('Buscando updates...');
  win?.webContents.send('update-checking');
});

autoUpdater.on('update-available', (info) => {
  console.log('Nueva versión disponible:', info.version);
  win?.webContents.send('update-available', info);
});

autoUpdater.on('update-not-available', (info) => {
  console.log('El launcher está actualizado:', info.version);
  win?.webContents.send('update-not-available', info);
});

autoUpdater.on('download-progress', (progress) => {
  console.log(`Descargando update: ${progress.percent}%`);
  win?.webContents.send('update-progress', {
    percent: Math.round(progress.percent),
    bytesPerSecond: progress.bytesPerSecond,
    transferred: progress.transferred,
    total: progress.total
  });
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('Update descargado:', info.version);
  win?.webContents.send('update-downloaded', info);
});

autoUpdater.on('error', (err) => {
  console.error('Error en autoUpdater:', err);
  win?.webContents.send('update-error', err?.message || String(err));
});
