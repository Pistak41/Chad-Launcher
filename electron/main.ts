/* eslint-disable @typescript-eslint/no-unused-vars */
import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { spawn } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import { readdirSync, existsSync, mkdirSync, cpSync } from 'node:fs';
import { ConfigProps } from '../src/types/Config';
import ConfigManager from '../src/helpers/ConfigManager';
import { v3 as uuidv3 } from 'uuid';
import { DistributionAPI } from 'helios-core/common';
import { FullRepair } from 'helios-core/dl';



cpSync(
  path.resolve('node_modules/helios-core'),
  path.resolve('dist-electron/node_modules/helios-core'),
  { recursive: true }
);

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
const SYS_ROOT = path.join(process.env.APPDATA!, '.chadlauncher');
const manager = new ConfigManager();

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

  if (!existsSync(SYS_ROOT)) {
    mkdirSync(SYS_ROOT);
  }

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

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  win.webContents.addListener('dom-ready', () => {

    const JAVA_HOME = process.env.JAVA_HOME!;

    if (!existsSync(`${JAVA_HOME}/bin/javaw.exe`)) return;

    win?.webContents.send('JAVA_HOME', `${JAVA_HOME}/bin/javaw.exe`);
    win?.webContents.send('get-memory', {

      totalRam: Math.floor((os.totalmem() - 1073741824) / 1073741824),
      freeRam: Math.floor(os.freemem() / 1073741824)
    });
  });

  loadDistro();

}

async function loadDistro() {

  const api = new DistributionAPI(
    app.getPath('userData'),
    path.join(SYS_ROOT, 'common'),
    path.join(SYS_ROOT, 'instances'),
    'http://192.168.1.46:3000/distribution.json',
    false
  );

  const { servers } = await api.getDistribution();

  console.log('getMainServer()', servers[0].rawServer.id);


  const fullRepairModule = new FullRepair(
    path.join(SYS_ROOT, 'common'),
    path.join(SYS_ROOT, 'instances'),
    app.getPath('userData'),
    servers[0].rawServer.id,
    api.isDevMode()
  );

  fullRepairModule.spawnReceiver();

  fullRepairModule.childProcess.on('error', (err) => { console.log(err); });
  fullRepairModule.childProcess.on('close', (code, _signal) => { console.log(code); });

  const a = await fullRepairModule.verifyFiles(p => console.log(p));
  console.log('a', a);
  await fullRepairModule.download(percent => console.log(percent));



}

ipcMain.on('change-icon', () => {
  win?.setIcon(path.join(process.env.VITE_PUBLIC, 'tree.png'));
});

function getLibs(p = path.join(SYS_ROOT, 'common', 'libraries')): Array<string> {

  let args: Array<string> = [];

  readdirSync(p, { recursive: true, withFileTypes: true }).forEach(a => {
    if (a.isDirectory()) {
      args = [...args, ...getLibs(p + '/' + a.name)];
    } else {
      args = [...args, p + '/' + a.name];
    }
  });

  return args;

}

ipcMain.on('update-config', (_, c: Partial<ConfigProps>) => {
  manager.saveValues(c);
});

ipcMain.on('play', () => {

  const libs = [
    ...getLibs().filter(a => a.endsWith('.jar')),
    path.join(SYS_ROOT, "common", "versions", "1.12.2", "1.12.2.jar")
  ];

  const { selectedRam, username, JAVA_HOME: java } = manager.config as ConfigProps;

  const args = [
    '-Xmx' + selectedRam.max + 'G',
    '-Xms' + selectedRam.min + 'G',
    '-cp',
    libs.join(';'),
    '-Djava.library.path=' + path.join(SYS_ROOT, 'native'),
    'net.minecraft.launchwrapper.Launch',
    '--username',
    username,
    '--version',
    'Test1-1.12.2',
    '--gameDir',
    path.join(SYS_ROOT, "instances", "Test1-1.12.2"),
    '--assetsDir',
    path.join(SYS_ROOT, "common", "assets"),
    '--assetIndex',
    '1.12',
    '--uuid',
    uuidv3(username, uuidv3.DNS),
    '--accessToken',
    'ImCrakedLOL',
    '--userType',
    'mojang',
    '--tweakClass',
    'net.minecraftforge.fml.common.launcher.FMLTweaker',
    '--versionType',
    'Forge',
    '--width',
    '1280',
    '--height',
    '720',
    '--modListFile',
    'absolute:' + path.join(SYS_ROOT, "instances", "Test1-1.12.2", "forgeModList.json"),
  ];

  const child = spawn(
    java,
    args,
    {
      cwd: path.join(SYS_ROOT, "instances", "Test1-1.12.2"),
      detached: true
    }
  );

  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');

  let errors: string[] = [];

  child.stdout.on('data', (data: string) => {
    data.trim().split('\n').forEach(x => console.log(`\x1b[32m[Minecraft]\x1b[0m ${x}`));
  });

  child.stderr.on('data', (data: string) => {

    const errorMsgs = data.trim().split('\n');

    errors = [...errors, ...errorMsgs];

    errorMsgs.forEach(x => console.log(`\x1b[31m[Minecraft]\x1b[0m ${x}`));

  });

  child.on('close', () => {

    if (errors.length !== 0) {
      throw new Error(errors.join('\n'));
    }

  });
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
