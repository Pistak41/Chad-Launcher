/* eslint-disable @typescript-eslint/no-unused-vars */
import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import { fork, spawn } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import { readdirSync, existsSync, mkdirSync } from 'node:fs';
import type { ConfigProps } from '@common/types/Config';
import type { Library, VersionJson } from '@common/types/MojangTypes';
import ConfigManager from '@common/utils/ConfigManager';
import { v3 as uuidv3 } from 'uuid';
import { HeliosServer, isLibraryCompatible, mcVersionAtLeast } from 'helios-core/common';
import { MojangIndexProcessor } from 'helios-core/dl';
import { javaExecFromRoot } from 'helios-core/java';
import { checkJava, NATIVE_TEMP_FOLDER_NAME, removeNativeLibs, resolveArguments, resolveNativeLibs, SYS_ROOT } from './utils';

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

let win: BrowserWindow | null;
let selectedServer: HeliosServer | null;
let minecraftArguments: string;
// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];

const manager = new ConfigManager();

function createWindow() {
  win = new BrowserWindow({
    width: 980,
    height: 552,
    icon: path.join('src', 'assets', 'chad.png'),
    autoHideMenuBar: true,
    backgroundMaterial: 'acrylic',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
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
      .loadFile(
        path.join(process.env.DIST, 'index.html')
      )
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

    if (!existsSync(JAVA_HOME)) return;

    win?.webContents.send('JAVA_HOME', JAVA_HOME);
    win?.webContents.send('get-memory', {
      totalRam: Math.floor((os.totalmem() - 1073741824) / 1073741824),
      freeRam: Math.floor(os.freemem() / 1073741824)
    });
  });

  loadDistro();

}

type ChildEvents =
  | { type: 'selectedServer', data: HeliosServer }
  | { type: 'log', data: string }
  | { type: 'percentage', data: string }
  | { type: 'mArgs', data: string }

type EventHandlers = {
  [K in ChildEvents as K['type']]: (data: K['data']) => void
}

const eventHandlers: EventHandlers = {
  selectedServer: data => {
    selectedServer = data;
    win?.webContents.send('ready', data);
  },
  log: str => console.log(str),
  percentage: str => console.log('percentage', str),
  mArgs: mArgs => minecraftArguments = mArgs
};

async function loadDistro() {

  const child = fork(
    path.join(__dirname, 'heliosRunner.js'),
    [],
    { stdio: 'inherit' }
  );

  child.send({
    launcherDirectory: app.getPath('userData'),
    commonDirectory: path.join(SYS_ROOT, 'common'),
    instanceDirectory: path.join(SYS_ROOT, 'instances')
  });

  child.on('message', (msg: ChildEvents) => (eventHandlers[msg.type] as (data: typeof msg.data) => void)?.(msg.data));
}

ipcMain.on('change-icon', () => {
  win?.setIcon(path.join('src', 'assets', 'tree.png'));
});

ipcMain.handle('dialog:openDirectory', async () => {

  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory'], // Key setting for folders only
    defaultPath: manager.config.JAVA_HOME
  });

  if (canceled) return;

  return filePaths[0]; // Return the path
});

ipcMain.on('update-config', (_, c: Partial<ConfigProps>) => {
  manager.saveValues(c);
});

const loadArgs = async () => {

  const { rawServer: { minecraftVersion } } = selectedServer!;

  const versionData = await new MojangIndexProcessor(path.join(SYS_ROOT, 'common'), minecraftVersion).getVersionJson();

  if (mcVersionAtLeast('1.13', minecraftVersion)) {
    return load113Args(versionData);
  } else {
    return load112Args(versionData);
  }

};

type GroupedLibs = {
  natives: Library[],
  libs: Library[]
}

const load113Args = async ({ libraries }: VersionJson) => {

  const { natives } = libraries
    .filter(({ rules, natives }) => isLibraryCompatible(rules, natives))
    .reduce<GroupedLibs>((prev, lib) => {

      const gKey = lib.name.includes('natives-') ? 'natives' : 'libs';

      return { ...prev, [gKey]: [...prev[gKey], lib] };

    }, { natives: [], libs: [] });

  await resolveNativeLibs(natives);

  // mjLibs -> Mojang Libraries | fLibs -> Forge Libraries | mLibs -> Mod Libraries
  // const mjLibs = libs.reduce((prev, { name, downloads: { artifact: { path: libPath } } }) => ({ ...prev, [name.substring(0, name.lastIndexOf(':'))]: path.join(SYS_ROOT, 'common', 'libraries', libPath) }), {});
  // const fLibs = selectedServer!.modules
  //   .filter(({ rawModule: { type } }) => type === Type.ForgeHosted || type === Type.Library)
  //   .reduce((prev, fM: any) => {
  //     const { rawModule, mavenComponents: { group, artifact, version, classifier, extension }, subModules } = fM as HeliosModuleLocal;

  //     const mavenComponentsAsPath = `${group.replace(/\./g, '/')}/${artifact}/${version}/${artifact}-${version}${classifier != null ? `-${classifier}` : ''}.${extension}`;

  //     return ({ ...prev, [rawModule.id.substring(0, rawModule.id.lastIndexOf(':'))]: path.join(SYS_ROOT, 'common', 'libraries', mavenComponentsAsPath), ...resolveModuleLibraries(subModules) });
  //   }, {});

  return [];
};

// const resolveModuleLibraries = (_: HeliosModule[]): Record<string, string> => {
//   return {};
// };

const load112Args = async ({ libraries }: VersionJson) => {

  const classpath = [
    ...readdirSync(path.join(SYS_ROOT, 'common', 'libraries'), { recursive: true, withFileTypes: true }).filter(f => f.isFile()).map(({ parentPath, name }) => path.join(parentPath, name)),
    path.join(SYS_ROOT, 'common', 'versions', '1.12.2', '1.12.2.jar')
  ];

  const { rawServer: { minecraftVersion, id: serverId } } = selectedServer!;

  const { natives } = libraries
    .filter(({ rules, natives }) => isLibraryCompatible(rules, natives))
    .reduce<GroupedLibs>((prev, lib) => {
      const gKey = lib.name.includes('natives-') || lib.natives ? 'natives' : 'libs';

      return { ...prev, [gKey]: [...prev[gKey], lib] };

    }, { natives: [], libs: [] });

  await resolveNativeLibs(natives);

  const { selectedRam: { min: minRam, max: maxRam }, username } = manager.config as ConfigProps;

  const { assets } = await new MojangIndexProcessor(path.join(SYS_ROOT, 'common'), minecraftVersion).getVersionJson();

  const args = resolveArguments(
    minecraftArguments,
    {
      auth_player_name: username,
      version_name: serverId,
      game_directory: path.join(SYS_ROOT, 'instances', serverId),
      assets_root: path.join(SYS_ROOT, 'common', 'assets'),
      assets_index_name: assets,
      auth_uuid: uuidv3(username, uuidv3.DNS),
      auth_access_token: 'ImCrakedLOL',
      user_type: 'mojang'
    },
    {
      [`-Xms${minRam}G`]: `-Xmx${maxRam}G`,
      '-cp': classpath.join(';'),
      ['-Djava.library.path=' + NATIVE_TEMP_FOLDER_NAME]: 'net.minecraft.launchwrapper.Launch',
      '--width': '1280',
      '--height': '720',
      '--modListFile': 'absolute:' + path.join(SYS_ROOT, 'instances', selectedServer!.rawServer.id, 'forgeModList.json'),
    }
  );

  return args;
};

ipcMain.on('play', async () => {

  const java = await checkJava(app.getPath('userData'), selectedServer!, (per) => console.log('Descargando java', per));

  win?.webContents.send('JAVA_HOME', java);

  const args = await loadArgs();

  console.log('java', java);
  console.log('javaExecFromRoot(java)', javaExecFromRoot(java));


  const child = spawn(
    java.endsWith('javaw.exe')
      ? java
      : javaExecFromRoot(java),
    args,
    {
      cwd: path.join(SYS_ROOT, 'instances', selectedServer!.rawServer.id)
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

  child.on('close', (c) => {

    if (c !== 0) {
      throw new Error(errors.join('\n'));
    }

    removeNativeLibs();

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

app.whenReady().then(() => {


  createWindow();

  // autoUpdater.checkForUpdatesAndNotify();

});

// autoUpdater.on('checking-for-update', () => {
//   console.log('Buscando updates...');
// });

// autoUpdater.on('update-available', () => {
//   console.log('Nueva versión disponible');
// });

// autoUpdater.on('download-progress', (progress) => {
//   console.log(progress.percent);
// });

// autoUpdater.on('update-downloaded', () => {
//   console.log('Update descargado');

//   autoUpdater.quitAndInstall();
// });
