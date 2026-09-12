# Chad Launcher - AGENTS.md

## 1. Project Overview

Chad Launcher is a modern desktop Minecraft launcher built with **Electron**, **React 19**, **TypeScript**, and **Vite**, tailored for modded Minecraft communities (specifically PhobosCraft / Helios ecosystem).

The application is responsible for:

- Managing Minecraft installations and multiple server instances.
- Fetching and parsing remote distribution manifests (`distribution.json`).
- Validating, repairing, and downloading game assets, libraries, and Forge mods via `helios-core`.
- Managing and auto-provisioning compatible Java runtimes (Adoptium/OpenJDK) per server instance.
- Extracting platform-specific native libraries into temporary directories.
- Assembling JVM arguments, classpaths, and launching the Minecraft client process across both legacy (1.12.2) and modern (1.20.1+) Minecraft/Forge versions.
- Providing a decoupled, standalone CLI runner (`scripts/launch.ts`) for developer testing without opening Electron.
- Synchronizing launcher configuration across the React Renderer and Electron Main process.
- Providing automatic updates via GitHub releases using `electron-updater`.
- Supporting cross-platform environments (primarily Windows x64 and macOS).

---

## 2. Technology Stack

### Core Framework & Desktop Shell

- **Electron** (`v42.x`): Desktop window management, IPC communication, OS integration, process spawning.
- **Vite** (`v8.x`): Fast development server and production bundler.
- **vite-plugin-electron** (`v0.29.x`): Builds Electron Main, Preload, and Helios Worker scripts alongside the web application.
- **electron-builder** (`v26.x`): Multi-platform packaging and installer generation (NSIS for Windows, DMG for macOS, AppImage for Linux).
- **electron-updater** (`v6.8.x`): Auto-updater connected to GitHub Releases (`Pistak41/Chad-Launcher`).

### Frontend (Renderer)

- **React** (`v19.x`): Component architecture.
- **TypeScript** (`v5.x`): Strict type checking across renderer, main, worker, and standalone CLI contexts.
- **TailwindCSS** (`v3.4.x`): Styling and UI layout.
- **React Router** (`v8.x`): Client-side routing with `HashRouter`.
- **Framer Motion** (`v12.x`): Route transitions, modal card animations, and interactive component effects.
- **Zustand** (`v4.5.x`): Lightweight state management with `persist` middleware backed by `localStorage` and real-time IPC synchronization.

### Minecraft Engine & Utilities

- **helios-core** (`v2.3.0`):
  - Distribution fetching (`DistributionAPI`)
  - File verification and downloading (`FullRepair`)
  - Mojang & ModLoader version parsing (`DistributionIndexProcessor`, `MojangIndexProcessor`)
  - Java runtime discovery, download, and extraction (`discoverBestJvmInstallation`, `extractJdk`, `latestOpenJDK`)
- **helios-distribution-types** (`v1.3.0`): Distribution schemas and module types (`ForgeMod`, `VersionManifest`, etc.).
- **adm-zip** (`v0.6.x`): Native JAR unpacking.
- **uuid** (`v14.x`): Offline/cracked player UUID generation via UUID v3 (DNS namespace).

---

## 3. Project Architecture & Execution Contexts

The application is structured into distinct execution environments with a shared launcher engine:

```text
┌────────────────────────────────────────────────────────┐     ┌───────────────────────────────────┐
│                   Renderer (React 19)                  │     │        Standalone CLI Runner      │
│  UI • Zustand Store • React Router • Server Monitoring │     │        (`scripts/launch.ts`)      │
└───────────────────────────┬────────────────────────────┘     └─────────────────┬─────────────────┘
                            │ (window.electronAPI)                               │
                            ▼                                                    │
┌────────────────────────────────────────────────────────┐                       │
│                     Preload Script                     │                       │
│    contextBridge • IPC Renderer • Safe API Exposure    │                       │
└───────────────────────────┬────────────────────────────┘                       │
                            │ (IPC Channels)                                     │
                            ▼                                                    │
┌────────────────────────────────────────────────────────────────────────────────┴──────────────────┐
│                             Minecraft Launch Engine (`electron/launcher.ts`)                       │
│    MinecraftLauncher Class • Dynamic mainClass • CP Filtering • Modern/Legacy Mod Sync • Spawner    │
└───────────────────────────┬───────────────────────────────────────────────────────────────────────┘
                            │ (child_process.fork)
                            ▼
┌────────────────────────────────────────────────────────┐
│           Helios Worker (`electron/heliosRunner.ts`)   │
│   Distribution Processing • FullRepair • Mod List Gen  │
└────────────────────────────────────────────────────────┘
```

### 3.1. Renderer (`src/`)

- Pure web application rendered inside Electron Chromium.
- **STRICT SECURITY RULE**: Must **never** directly import or invoke Node.js built-ins (`fs`, `path`, `child_process`, `os`) or Electron modules (`ipcRenderer`, `app`).
- Interacts with system and Main process exclusively through `window.electronAPI`.
- Stores user settings in Zustand (`src/store/AuthContext.ts`), automatically syncing state changes to Main via `electronAPI.updateConfig`.

### 3.2. Preload (`electron/preload.ts`)

- Bridges Renderer and Main with `contextIsolation: true` and `nodeIntegration: false`.
- Exposes `window.electronAPI` methods defined in `IElectronAPI` (`src/vite-env.d.ts`).
- Provides clean listener teardowns (`removeListener`) to prevent memory leaks in the Renderer.

### 3.3. Electron Main (`electron/main.ts`)

- Configures `BrowserWindow` (acrylic background, auto-hide menu bar, window dimensions: 980x552).
- Intercepts external navigation (`setWindowOpenHandler`) and routes URLs to the system browser via `shell.openExternal`.
- Initializes `ConfigManager` to persist configurations in `<userData>/config.json`.
- Delegates Minecraft verification and execution to `MinecraftLauncher` ([electron/launcher.ts](file:///f:/dev/nodejs/chad-launcher/electron/launcher.ts)).

### 3.4. Decoupled Launch Engine ([electron/launcher.ts](file:///f:/dev/nodejs/chad-launcher/electron/launcher.ts))

- Encapsulates game execution logic inside `MinecraftLauncher` class.
- Runs `heliosRunner.ts` background worker for file validation, repairs, and download progress.
- Resolves Java binary location dynamically via `checkJava`.
- Dynamically resolves `mainClass`, filters Java 17+ JPMS classpath collisions, evaluates feature rules, and synchronizes instance mods.
- Spawns the Minecraft Java process, pipes colored logs to stdout/stderr, and cleans up temporary native DLLs on process termination.

### 3.5. Standalone CLI Runner ([scripts/launch.ts](file:///f:/dev/nodejs/chad-launcher/scripts/launch.ts))

- Command-line runner for launching any server directly without starting Electron UI.
- Executed via `npm run launch:dev -- --server=<serverId>`.

### 3.6. Helios Background Worker ([electron/heliosRunner.ts](file:///f:/dev/nodejs/chad-launcher/electron/heliosRunner.ts))

- TypeScript module (`electron/heliosRunner.ts`) compiled by `vite-plugin-electron` into `dist-electron/heliosRunner.js`.
- Forked as an independent Node.js process by `MinecraftLauncher.runHelios` and `electron/main.ts`.
- Connects to distribution URL using `DistributionAPI` with safe fallback (`DEFAULT_DISTRO_URL = 'https://files.phobos.net.ar/distribution.json'`).
- Performs file validation and parallel repair via `FullRepair.verifyFiles()` and `FullRepair.download()`.
- Generates `forgeModList.json` and syncs mod files inside instance folders.
- Emits download percentage (`percentage`) and server selection (`selectedServer`) events back to Main, then gracefully disconnects.

### 3.7. Common Layer (`common/`)

- Shared TypeScript interfaces and utility classes shared between Main, Renderer, and CLI runner.
- `common/types/Config.d.ts`: Shared configuration and memory structures.
- `common/types/HeliosTypes.d.ts`: Helios server and module extensions.
- `common/types/MojangTypes.d.ts`: Mojang version JSON, library, and manifest structures.
- `common/utils/ConfigManager.ts`: Persistent JSON configuration storage.

---

## 4. Directory Structure & Filesystem Layout

### 4.1. Source Code Layout

```text
chad-launcher/
├── .env                     # Distribution server URL (DISTRO_URL)
├── electron-builder.json    # Packaging targets and NSIS configuration
├── vite.config.ts           # Vite + React + Electron bundling & entry configuration
├── tsconfig.json            # Root TypeScript compiler options & path aliases
├── package.json             # Scripts & dependencies
│
├── electron/                # Electron Main & Launcher source code
│   ├── main.ts              # Electron Main entry point & IPC handlers
│   ├── launcher.ts          # Decoupled MinecraftLauncher class (core launch engine)
│   ├── heliosRunner.ts      # TypeScript child process worker for distribution repair
│   ├── preload.ts           # Context bridge exposing electronAPI
│   └── utils.ts             # Java validation, native lib extractor, DEFAULT_DISTRO_URL
│
├── scripts/                 # Developer scripts & standalone execution
│   └── launch.ts            # CLI launcher (npm run launch:dev)
│
├── common/                  # Shared types and utilities
│   ├── types/               # Config, Helios, Mojang, and Electron env definitions
│   └── utils/
│       └── ConfigManager.ts # Persistent config.json reader/writer
│
└── src/                     # React 19 Renderer application
    ├── assets/              # Launcher icons, background art (0-11.jpg), audio
    ├── components/          # Reusable UI components (Buttons, Cards, ServerList, etc.)
    ├── hooks/               # Custom hooks (e.g. useServers)
    ├── pages/               # Top-level views (Loading, Login, Settings)
    │   └── settings/        # Settings sub-pages (Java, Minecraft, Mods, Updates)
    ├── store/               # Zustand AuthContext & config store
    ├── App.tsx              # Main dashboard view (Home)
    ├── main.tsx             # React entry point, background randomizer & sound triggers
    └── vite-env.d.ts        # Renderer global window.electronAPI declarations
```

### 4.2. Runtime Filesystem Layout

At runtime, the launcher operates across two primary directories:

1. **Launcher Data (`SYS_ROOT = %APPDATA%/.chad` on Windows):**

   ```text
   %APPDATA%/.chad/
   ├── common/
   │   ├── assets/           # Minecraft assets (indexes & objects)
   │   ├── libraries/        # Shared Mojang and Forge libraries (.jar)
   │   ├── modstore/         # Downloaded mod files referenced by Maven IDs
   │   └── versions/         # Minecraft client versions (e.g. 1.12.2/1.12.2.jar)
   └── instances/
       └── <serverId>/       # Per-server instance folder (e.g. HorrorCraft-1.20.1)
           ├── forgeModList.json  # Forge mod reference list pointing to modstore
           └── mods/         # Instance mods folder (auto-synced for Modern Forge)
   ```

2. **Application User Data (`app.getPath('userData')`):**
   - Typically `%APPDATA%/chad-launcher/` (or `com.chad.launcher`).
   - Stores `config.json` managed by `ConfigManager`.
   - Downloaded OpenJDK runtimes managed by `helios-core`.

3. **Temporary Natives Folder (`NATIVE_TEMP_FOLDER_NAME`):**
   - Created in `os.tmpdir()` with a random UUID on every game launch.
   - Contains unzipped platform binaries (`.dll` on Windows, `.dylib` on macOS).
   - Removed completely via `removeNativeLibs()` when the Minecraft process terminates.

---

## 5. Configuration & State Synchronization

Configuration state is kept in dual persistence:

1. **Frontend**: Persisted in browser `localStorage` under key `config-storage` by Zustand.
2. **Backend**: Persisted in disk file `<userData>/config.json` by `ConfigManager`.

### Synchronization Cycle

```text
User changes UI (e.g., RAM slider, username)
               │
               ▼
   Zustand Store (`useConfig`)
               │
               ├─► Writes to browser localStorage
               │
               ▼
   `useConfig.subscribe(...)`
               │
               ▼
   `window.electronAPI.updateConfig(state)`
               │ (IPC: 'update-config')
               ▼
   `ipcMain.on('update-config')`
               │
               ▼
   `ConfigManager.saveValues(c)`
               │
               ▼
   Writes to `<userData>/config.json`
```

---

## 6. Helios Distribution & Server Management

- **Manifest Endpoint**: Defined via `process.env.DISTRO_URL` with automatic fallback to `DEFAULT_DISTRO_URL = 'https://files.phobos.net.ar/distribution.json'`.
- **Server Selection**:
  - The launcher queries servers via `electronAPI.getServers()`.
  - The active server defaults to the server flagged with `mainServer: true` or the first server in the manifest.
  - Users switch servers through `ServerList.tsx`, which updates `useConfig.server`.
- **Mod List Resolution & Version-Specific Mod Discovery**:
  - **Legacy Forge (1.12.2)**: `heliosRunner.ts` generates `forgeModList.json` pointing to `common/modstore`. Legacy FML loads mods directly from `modstore` via `--modListFile`.
  - **Modern Forge (1.13+, 1.20.1+)**: Modern Forge ModLauncher ignores `--modListFile` and requires mod `.jar` files inside `instances/<serverId>/mods/`. The launcher (`syncInstanceMods`) automatically copies/synchronizes `ForgeMod` JARs into `instances/<serverId>/mods/`.
- **Live Status Monitoring**:
  - `ServerStatus.tsx` pings `https://api.mcsrvstat.us/3/<hostname>:<port>` to display real-time player counts and server online/offline status.

---

## 7. Java Runtime Management

The launcher manages Java runtimes dynamically:

1. **Never assume the system Java is correct or present.**
2. When launching or configuring:
   - Evaluates `selectedServer.effectiveJavaOptions` (`supported`, `distribution`, `suggestedMajor`).
   - Checks existing installations using `discoverBestJvmInstallation(launcherDir, supported)`.
   - If missing, queries Adoptium API via `latestOpenJDK(suggestedMajor, launcherDir, distribution)`.
   - Automatically downloads the JDK archive and extracts it into the launcher directory using `downloadFile` and `extractJdk`.
3. Users can also manually choose a Java directory in **Settings > Java**, stored in `JAVA_HOME`.
4. Spawning intelligently picks `javaw.exe` on Windows if present, or resolves the binary via `javaExecFromRoot(java)`.

---

## 8. Minecraft Launch Pipeline (Step-by-Step)

When the user clicks **JUGAR** or executes `npm run launch:dev`:

```text
1. Invocation (`electronAPI.play()` or CLI `scripts/launch.ts`)
                    │
                    ▼
2. Launcher Instantiation (`MinecraftLauncher` in `electron/launcher.ts`)
                    │
                    ▼
3. Distribution & File Verification (`runHelios` child process -> `electron/heliosRunner.ts`)
   - Downloads/repairs assets, libraries, and modstore JARs
   - Generates `forgeModList.json`
                    │
                    ▼
4. Java Runtime Check (`checkJava` in `electron/utils.ts`)
   - Auto-provisions matching OpenJDK version if missing
                    │
                    ▼
5. Dynamic Parameter & Classpath Resolution (`buildArguments`)
   - Dynamically resolves `mainClass` (`BootstrapLauncher` for 1.20.1, `Launch` for 1.12.2)
   - Evaluates argument rules & features (`has_custom_resolution` -> `--width 1280 --height 720`)
   - Filters client JARs (`client-*-slim.jar`, `1.20.1.jar`) from `-cp` on Modern Forge (Java 17+ JPMS safety)
   - Synchronizes `ForgeMod` JARs to `instances/<serverId>/mods/` for Modern Forge
                    │
                    ▼
6. Native Library Extraction (`resolveNativeLibs`)
   - Unzips platform-specific binaries into temp directory in os.tmpdir()
                    │
                    ▼
7. Child Process Spawn & Log Streaming
   - `child_process.spawn` launches Java with cwd set to `instances/<serverId>`
   - Pipes formatted logs (`[Minecraft]`) to standard output / UI
                    │
                    ▼
8. Cleanup on Termination
   - On process exit, cleans up temp native libraries (`removeNativeLibs`)
```

---

## 9. IPC Channel Reference

| Channel                | Pattern              | Source                      | Handler                  | Payload                | Return / Description                                                  |
| :--------------------- | :------------------- | :-------------------------- | :----------------------- | :--------------------- | :-------------------------------------------------------------------- |
| `play`                 | `ipcRenderer.send`   | Renderer (`Buttons.tsx`)    | Main (`main.ts`)         | _None_                 | Triggers Java check, arg resolution, and launches Minecraft.          |
| `update-config`        | `ipcRenderer.send`   | Renderer (`AuthContext.ts`) | Main (`main.ts`)         | `Partial<ConfigProps>` | Saves updated configuration to `config.json`.                         |
| `get-servers`          | `ipcRenderer.invoke` | Renderer (`useServers.ts`)  | Main (`main.ts`)         | _None_                 | Fetches server list from `DistributionAPI`. Returns `HeliosServer[]`. |
| `get-java`             | `ipcRenderer.invoke` | Renderer (`Loading.tsx`)    | Main (`main.ts`)         | _None_                 | Returns active `JAVA_HOME` path string.                               |
| `get-memory`           | `ipcRenderer.invoke` | Renderer (`Loading.tsx`)    | Main (`main.ts`)         | _None_                 | Returns `{ totalRam: number, freeRam: number }` (in GB).              |
| `dialog:openDirectory` | `ipcRenderer.invoke` | Renderer (`Java.tsx`)       | Main (`main.ts`)         | _None_                 | Opens native folder picker. Returns selected directory path string.   |
| `ready`                | `webContents.send`   | Main (`main.ts`)            | Renderer (`Loading.tsx`) | `HeliosServer`         | Emitted when Helios finishes file check and selects default server.   |
| `download-progress`    | `webContents.send`   | Main (`main.ts`)            | Renderer (`Buttons.tsx`) | `number \| string`     | Reports download/repair progress percentage (0 - 100).                |
| `download-complete`    | `webContents.send`   | Main (`main.ts`)            | Renderer                 | _None_                 | Notifies download completion.                                         |
| `download-error`       | `webContents.send`   | Main (`main.ts`)            | Renderer                 | `string`               | Notifies download failure.                                            |

---

## 10. Development & Build Workflows

### Available Scripts

```bash
# Start Vite development server with Electron hot reload
npm run dev

# Run Standalone CLI Minecraft Launcher (develop/test launch without Electron UI)
npm run launch:dev

# Launch a specific server via CLI runner
npm run launch:dev -- --server=HorrorCraft-1.20.1

# Run TypeScript compilation, Vite production build, and generate Electron installers
npm run build

# Run ESLint validation across src/ (0-warning threshold)
npm run lint

# Preview Vite production build in browser
npm run preview
```

### Packaging Details

- `vite.config.ts`:
  - Compiles `electron/main.ts` -> `dist-electron/main.js`.
  - Compiles `electron/preload.ts` -> `dist-electron/preload.js`.
  - Compiles `electron/heliosRunner.ts` -> `dist-electron/heliosRunner.js`.
  - Externalizes runtime node_modules (`helios-core`, etc.) via `isExternal` matching so relative receiver paths (`ReceiverExecutor.js`) resolve cleanly.
- `electron-builder.json`:
  - Artifact output: `release/${version}/`.
  - Windows: NSIS 64-bit installer with custom install directory option (`allowToChangeInstallationDirectory: true`).
  - macOS: DMG installer.
  - Linux: AppImage.
  - Publishes directly to GitHub Releases under `Pistak41/Chad-Launcher`.

---

## 11. Agent Guidelines & Coding Rules

When modifying or expanding the Chad Launcher codebase, all agents must abide by the following rules:

1. **Preserve Architectural Isolation**:
   - **Never** introduce Node.js or Electron imports into `src/`. If the frontend needs a new capability, create a new IPC handler in `electron/main.ts`, expose it typed in `electron/preload.ts`, and declare it in `src/vite-env.d.ts`.
2. **Cross-Platform Path Handling**:
   - Always use `node:path` methods (`join`, `resolve`) instead of manual slash concatenation.
   - For classpath separators, check platform: `IS_MAC ? ':' : ';'` (Windows uses `;`, UNIX uses `:`).
   - Account for executable naming differences (`javaw.exe` vs `java`).
3. **Heavy Tasks in Background Workers**:
   - Do not perform heavy synchronous hashing, asset extraction, or socket downloads directly inside `electron/main.ts`. Follow the pattern established by `heliosRunner.ts` (forking a child process and communicating via IPC).
4. **Temporary Resource Cleanup**:
   - Any extracted native DLLs or temporary game files must be strictly cleaned up in child process `close` or `error` handlers.
5. **Type Safety & Lint Verification**:
   - Always run `npx tsc --noEmit` and `npm run lint` after code edits to ensure strict TypeScript compilation and ESLint adherence with zero warnings.
6. **MANDATORY DOCUMENTATION OF AGENT CHANGES**:
   - **RULE**: Whenever an AI agent completes a new feature, architectural refactoring, bug fix, script addition, or pipeline change, the agent **MUST immediately update `AGENTS.md`** to document the new architecture, script entry points, version compatibility mechanisms, or rules introduced. No task is considered complete until `AGENTS.md` is updated to accurately reflect the current codebase state.
