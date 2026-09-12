import { fork, spawn, ChildProcess } from 'node:child_process';
import path from 'node:path';
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { v3 as uuidv3 } from 'uuid';
import { DistributionAPI, HeliosModule, HeliosServer, isLibraryCompatible, mcVersionAtLeast } from 'helios-core/common';
import { DistributionIndexProcessor, MojangIndexProcessor } from 'helios-core/dl';
import { javaExecFromRoot } from 'helios-core/java';
import { Type } from 'helios-distribution-types';
import type { ConfigProps } from '../common/types/Config';
import type { Library, VersionJSON } from '../common/types/MojangTypes';
import ConfigManager from '../common/utils/ConfigManager';
import {
    checkJava,
    DEFAULT_DISTRO_URL,
    DISTRO_URL,
    getUserDataPath,
    IS_MAC,
    NATIVE_TEMP_FOLDER_NAME,
    removeNativeLibs,
    resolveArguments,
    resolveNativeLibs,
    SYS_ROOT
} from './utils';

export interface LaunchOptions {
    serverId?: string;
    userDataDir?: string;
    commonDir?: string;
    instancesDir?: string;
    distroUrl?: string;
    config?: Partial<ConfigProps>;
    onLog?: (msg: string, isError: boolean) => void;
    onProgress?: (progress: string | number) => void;
}

export class MinecraftLauncher {
    private userDataDir: string;
    private commonDir: string;
    private instancesDir: string;
    private distroUrl: string;

    constructor(options: LaunchOptions = {}) {
        this.userDataDir = options.userDataDir || getUserDataPath();
        this.commonDir = options.commonDir || path.join(SYS_ROOT, 'common');
        this.instancesDir = options.instancesDir || path.join(SYS_ROOT, 'instances');
        this.distroUrl = options.distroUrl || DISTRO_URL || DEFAULT_DISTRO_URL;

        if (!existsSync(SYS_ROOT)) mkdirSync(SYS_ROOT, { recursive: true });
        if (!existsSync(this.commonDir)) mkdirSync(this.commonDir, { recursive: true });
        if (!existsSync(this.instancesDir)) mkdirSync(this.instancesDir, { recursive: true });
    }

    private getHeliosRunnerPath(): string {
        const candidates = [
            path.join(__dirname, 'heliosRunner.js'),
            path.join(process.cwd(), 'electron', 'heliosRunner.ts'),
            path.join(process.cwd(), 'dist-electron', 'heliosRunner.js'),
        ];
        for (const p of candidates) {
            if (existsSync(p)) return p;
        }
        return path.join(__dirname, 'heliosRunner.js');
    }

    public runHelios(serverId: string, onProgress?: (progress: string | number) => void): Promise<HeliosServer> {
        return new Promise((resolve, reject) => {
            const runnerPath = this.getHeliosRunnerPath();
            const child = fork(runnerPath, [], {
                stdio: 'inherit',
                env: { ...process.env, DISTRO_URL: this.distroUrl }
            });

            let selectedServer: HeliosServer | null = null;

            child.send({
                launcherDirectory: this.userDataDir,
                commonDirectory: this.commonDir,
                instanceDirectory: this.instancesDir,
                serverId,
                distroUrl: this.distroUrl
            });

            child.on('message', (msg: any) => {
                if (msg.type === 'selectedServer') {
                    selectedServer = msg.data;
                } else if (msg.type === 'percentage') {
                    onProgress?.(msg.data);
                } else if (msg.type === 'log') {
                    console.log(msg.data);
                }
            });

            child.on('error', (err) => reject(err));

            child.on('close', (code) => {
                if (selectedServer) {
                    resolve(selectedServer);
                } else if (code === 0) {
                    resolve(selectedServer!);
                } else {
                    reject(new Error(`Helios runner process exited with code ${code}`));
                }
            });
        });
    }

    private resolveSubModules(mdl: HeliosModule): string[] {
        if (!mdl.hasSubModules()) return [];
        return mdl.subModules
            .filter(({ rawModule }) => rawModule.type !== Type.VersionManifest && rawModule.type !== Type.ForgeMod)
            .flatMap(smdl => [smdl.getPath(), ...this.resolveSubModules(smdl)]);
    }

    private syncInstanceMods(server: HeliosServer, instanceFolder: string, isModernForge: boolean): void {
        const modsDir = path.join(instanceFolder, 'mods');

        if (!isModernForge) {
            // For Legacy Forge (1.12.2), mods are loaded via --modListFile (forgeModList.json) directly from modstore.
            // Clear instance/mods to prevent duplicate mod loading!
            if (existsSync(modsDir)) {
                try {
                    const files = readdirSync(modsDir);
                    for (const file of files) {
                        if (file.endsWith('.jar')) {
                            unlinkSync(path.join(modsDir, file));
                        }
                    }
                } catch (err) {
                    console.warn('[Launcher] Error clearing legacy mods dir:', err);
                }
            }
            return;
        }

        // For Modern Forge (1.13+/1.20.1+), ModLauncher ignores --modListFile.
        // Copy/sync ForgeMods into instance/mods!
        if (!existsSync(modsDir)) {
            mkdirSync(modsDir, { recursive: true });
        }

        const activeModFiles = new Set<string>();
        const forgeMods = server.modules.filter(m => m.rawModule.type === Type.ForgeMod);

        for (const mod of forgeMods) {
            const srcPath = mod.getPath();
            if (srcPath && existsSync(srcPath)) {
                const filename = path.basename(srcPath);
                const destPath = path.join(modsDir, filename);
                activeModFiles.add(filename);

                try {
                    const srcStat = statSync(srcPath);
                    const destStat = existsSync(destPath) ? statSync(destPath) : null;
                    if (!destStat || destStat.size !== srcStat.size) {
                        copyFileSync(srcPath, destPath);
                        console.log(`[Launcher] Synced mod: ${filename}`);
                    }
                } catch (err) {
                    console.warn(`[Launcher] Failed to sync mod ${filename}:`, err);
                }
            }
        }

        try {
            const existingFiles = readdirSync(modsDir);
            for (const file of existingFiles) {
                if (file.endsWith('.jar') && !activeModFiles.has(file)) {
                    unlinkSync(path.join(modsDir, file));
                    console.log(`[Launcher] Removed old mod: ${file}`);
                }
            }
        } catch (err) {
            console.warn('[Launcher] Error cleaning up mods directory:', err);
        }
    }

    private resolveServerClasspathModules(server: HeliosServer): string[] {
        return server.modules
            .filter(mdl => mdl.rawModule.type !== Type.ForgeMod && mdl.rawModule.type !== Type.VersionManifest)
            .flatMap(mdl => [mdl.getPath(), ...this.resolveSubModules(mdl)])
            .filter((p): p is string => typeof p === 'string' && p.endsWith('.jar'));
    }

    public async buildArguments(
        server: HeliosServer,
        config: Partial<ConfigProps>
    ): Promise<string[]> {
        const { minecraftVersion, id: serverId } = server.rawServer;

        const api = new DistributionAPI(
            this.userDataDir,
            this.commonDir,
            this.instancesDir,
            this.distroUrl,
            false
        );
        const distro = await api.getDistribution();

        // 1. ModLoader version JSON (e.g. Forge version.json)
        const modLoaderData = await new DistributionIndexProcessor(
            this.commonDir,
            distro,
            serverId
        ).loadModLoaderVersionJson() as any;

        // 2. Mojang Version JSON for the target server's minecraftVersion
        const versionData: VersionJSON = await new MojangIndexProcessor(
            this.commonDir,
            minecraftVersion
        ).getVersionJson() as any;

        // 3. Determine mainClass dynamically from modLoaderData or versionData
        const mainClass = modLoaderData?.mainClass || (versionData as any)?.mainClass || 'net.minecraft.client.main.Main';

        // 4. Filter Mojang base libraries for minecraftVersion
        const mojangLibs = (versionData.libraries || [])
            .filter(({ rules, natives }) => isLibraryCompatible(rules, natives));

        const nativeLibs = mojangLibs.filter(lib => lib.name.includes('natives-') || lib.natives);
        const compatibleMojangLibs = mojangLibs.filter(lib => !lib.name.includes('natives-') && !lib.natives);

        // Extract natives for this launch
        await resolveNativeLibs(nativeLibs);

        // 5. Resolve server-specific module jars (excluding ForgeMods and VersionManifests)
        const activeServer = distro.getServerById(serverId) || server;
        const serverClasspathJars = this.resolveServerClasspathModules(activeServer);

        // 6. Compatible Mojang library paths
        const mojangLibPaths = compatibleMojangLibs
            .map(lib => lib.downloads?.artifact?.path ? path.join(this.commonDir, 'libraries', lib.downloads.artifact.path) : null)
            .filter((p): p is string => Boolean(p));

        // 7. Compatible ModLoader libraries (if present in modLoaderData)
        const modLoaderLibPaths: string[] = [];
        if (modLoaderData && Array.isArray(modLoaderData.libraries)) {
            modLoaderData.libraries.forEach((lib: Library) => {
                if (isLibraryCompatible(lib.rules, lib.natives) && lib.downloads?.artifact?.path) {
                    modLoaderLibPaths.push(path.join(this.commonDir, 'libraries', lib.downloads.artifact.path));
                }
            });
        }

        // 8. Base Minecraft client JAR for target version (e.g., 1.12.2.jar)
        const clientJarPath = path.join(this.commonDir, 'versions', minecraftVersion, `${minecraftVersion}.jar`);

        const ignoreListArg = (modLoaderData?.arguments?.jvm && Array.isArray(modLoaderData.arguments.jvm))
            ? modLoaderData.arguments.jvm.find((a: any) => typeof a === 'string' && a.startsWith('-DignoreList='))
            : undefined;

        const ignoreList: string[] = typeof ignoreListArg === 'string'
            ? ignoreListArg.replace('-DignoreList=', '').split(',')
            : [];

        const isModernForge = mcVersionAtLeast('1.17', minecraftVersion) || ignoreList.length > 0;

        const isIgnoredForClasspath = (jarPath: string): boolean => {
            const filename = path.basename(jarPath);
            if (isModernForge) {
                if (
                    filename === `${minecraftVersion}.jar` ||
                    filename.includes('client') ||
                    filename.includes('extra') ||
                    filename.includes('slim') ||
                    (filename.startsWith('forge-') && filename.endsWith('.jar'))
                ) {
                    return true;
                }
            }
            return false;
        };

        const classpathItems = [
            ...serverClasspathJars,
            ...mojangLibPaths
        ].filter(p => !isIgnoredForClasspath(p));

        if (!isModernForge) {
            classpathItems.push(...modLoaderLibPaths, clientJarPath);
        }

        // Assemble unified classpath for target server & version
        const classpath = [...new Set(classpathItems)];

        const { selectedRam, username } = config;
        const minRam = selectedRam?.min ?? 3;
        const maxRam = selectedRam?.max ?? 3;
        const playerName = username || 'Player';

        const { assets } = await new MojangIndexProcessor(this.commonDir, minecraftVersion).getVersionJson();

        const instanceFolder = path.join(this.instancesDir, serverId);

        // Synchronize server ForgeMods into instance/mods directory (Modern Forge only)
        this.syncInstanceMods(activeServer, instanceFolder, isModernForge);

        const argMap: Record<string, string> = {
            auth_player_name: playerName,
            version_name: serverId,
            game_directory: instanceFolder,
            assets_root: path.join(this.commonDir, 'assets'),
            assets_index_name: assets,
            auth_uuid: uuidv3(playerName, uuidv3.DNS),
            auth_access_token: 'ImCrakedLOL',
            user_type: 'mojang',
            version_type: 'ChadLauncher',
            library_directory: path.join(this.commonDir, 'libraries'),
            classpath_separator: IS_MAC ? ':' : ';',
            natives_directory: NATIVE_TEMP_FOLDER_NAME,
            classpath: classpath.join(IS_MAC ? ':' : ';'),
            resolution_width: '1280',
            resolution_height: '720'
        };

        const modJvmArgs = this.parseJvmArguments(modLoaderData?.arguments?.jvm, argMap);
        const versionJvmArgs = this.parseJvmArguments((versionData as any)?.arguments?.jvm, argMap);

        const jvmArgs = [
            `-Xms${minRam}G`,
            `-Xmx${maxRam}G`,
            `-Djava.library.path=${NATIVE_TEMP_FOLDER_NAME}`,
            ...modJvmArgs,
            ...versionJvmArgs
        ];

        if (!jvmArgs.includes('-cp') && !jvmArgs.includes('-classpath')) {
            jvmArgs.push('-cp', classpath.join(IS_MAC ? ':' : ';'));
        }

        const rawModGameArgs = modLoaderData?.minecraftArguments || modLoaderData?.arguments?.game;
        const rawVersionGameArgs = (versionData as any)?.minecraftArguments || (versionData as any)?.arguments?.game;

        const extraGameArgs: Record<string, string> = {};

        const modListPath = path.join(instanceFolder, 'forgeModList.json');
        if (existsSync(modListPath)) {
            extraGameArgs['--modListFile'] = 'absolute:' + modListPath;
        }

        let gameArgs: string[] = [];
        if (typeof rawModGameArgs === 'string') {
            gameArgs = this.parseGameArguments(rawModGameArgs, argMap, extraGameArgs);
        } else {
            const parsedModArgs = this.parseGameArguments(rawModGameArgs, argMap, {});
            const parsedVersionArgs = this.parseGameArguments(rawVersionGameArgs, argMap, extraGameArgs);
            gameArgs = [...parsedModArgs, ...parsedVersionArgs];
        }

        console.log(`[Launcher] Main Class: ${mainClass}`);

        return [
            ...jvmArgs,
            mainClass,
            ...gameArgs
        ];
    }

    private isRuleAllowed(rules: any[] | undefined, activeFeatures: Record<string, boolean> = {}): boolean {
        if (!rules || rules.length === 0) return true;
        for (const rule of rules) {
            if (rule.features) {
                for (const [feature, expected] of Object.entries(rule.features)) {
                    const actual = Boolean(activeFeatures[feature]);
                    if (actual !== Boolean(expected)) {
                        if (rule.action === 'allow') return false;
                    }
                }
            }
            if (rule.os && !isLibraryCompatible([rule])) {
                return false;
            }
        }
        return true;
    }

    private parseJvmArguments(
        rawJvmArgs: any[] | undefined,
        argMap: Record<string, string>
    ): string[] {
        if (!Array.isArray(rawJvmArgs)) return [];

        const result: string[] = [];

        for (const item of rawJvmArgs) {
            if (typeof item === 'string') {
                const replaced = item.replace(/\${(.*?)}/g, (_: string, arg: string) => argMap[arg] || '');
                result.push(replaced);
            } else if (typeof item === 'object' && item?.value) {
                if (this.isRuleAllowed(item.rules)) {
                    const values = Array.isArray(item.value) ? item.value : [item.value];
                    for (const val of values) {
                        const replaced = val.replace(/\${(.*?)}/g, (_: string, arg: string) => argMap[arg] || '');
                        result.push(replaced);
                    }
                }
            }
        }

        return result;
    }

    private parseGameArguments(
        minecraftArguments: string | any[] | undefined,
        argMap: Record<string, string>,
        extraArgs: Record<string, string>,
        activeFeatures: Record<string, boolean> = { has_custom_resolution: true }
    ): string[] {
        const result: string[] = [];

        if (typeof minecraftArguments === 'string' && minecraftArguments.trim().length > 0) {
            result.push(...resolveArguments(minecraftArguments, argMap, {}));
        } else if (Array.isArray(minecraftArguments)) {
            for (const item of minecraftArguments) {
                if (typeof item === 'string') {
                    const replaced = item.replace(/\${(.*?)}/g, (_: string, arg: string) => argMap[arg] || '');
                    result.push(replaced);
                } else if (typeof item === 'object' && item?.value) {
                    if (this.isRuleAllowed(item.rules, activeFeatures)) {
                        const values = Array.isArray(item.value) ? item.value : [item.value];
                        for (const val of values) {
                            const replaced = val.replace(/\${(.*?)}/g, (_: string, arg: string) => argMap[arg] || '');
                            result.push(replaced);
                        }
                    }
                }
            }
        }

        for (const [key, val] of Object.entries(extraArgs)) {
            if (!result.includes(key)) {
                result.push(key, val);
            }
        }

        return result;
    }

    public async launch(options: LaunchOptions = {}): Promise<ChildProcess> {
        const manager = new ConfigManager();
        const config: Partial<ConfigProps> = { ...manager.config, ...options.config };

        let server = config.server as unknown as HeliosServer;

        if (options.serverId || !server?.rawServer?.id) {
            const api = new DistributionAPI(
                this.userDataDir,
                this.commonDir,
                this.instancesDir,
                this.distroUrl,
                false
            );
            const distro = await api.getDistribution();
            const foundServer = options.serverId
                ? distro.getServerById(options.serverId)
                : distro.servers.find(s => s.rawServer.mainServer) || distro.servers[0];

            if (foundServer) {
                server = foundServer;
            }
        }

        if (!server || !server.rawServer) {
            throw new Error('No valid Helios server configuration found to launch.');
        }

        console.log(`[Launcher] Target Server: ${server.rawServer.name} (${server.rawServer.id}) - MC ${server.rawServer.minecraftVersion}`);

        // 1. Verify files and build mod list using background worker
        const verifiedServer = await this.runHelios(server.rawServer.id, options.onProgress);
        if (verifiedServer) {
            server = verifiedServer;
        }

        // 2. Check and provision Java
        const java = await checkJava(this.userDataDir, server, (per) => options.onProgress?.(per));
        if (java) {
            manager.saveValue('JAVA_HOME', java);
        }

        // 3. Build version-specific arguments and classpath
        const args = await this.buildArguments(server, config);

        const javaBin = java.endsWith('javaw.exe') ? java : javaExecFromRoot(java);
        const instanceFolder = path.join(this.instancesDir, server.rawServer.id);

        console.log(`[Launcher] Spawning Minecraft process...`);
        console.log(`[Launcher] Executable: ${javaBin}`);
        console.log(`[Launcher] Working Directory: ${instanceFolder}`);

        const child = spawn(javaBin, args, { cwd: instanceFolder });

        child.stdout?.setEncoding('utf8');
        child.stderr?.setEncoding('utf8');

        const errors: string[] = [];

        child.stdout?.on('data', (data: string) => {
            const lines = data.trim().split('\n');
            lines.forEach(line => {
                console.log(`\x1b[32m[Minecraft]\x1b[0m ${line}`);
                options.onLog?.(line, false);
            });
        });

        child.stderr?.on('data', (data: string) => {
            const lines = data.trim().split('\n');
            errors.push(...lines);
            lines.forEach(line => {
                console.log(`\x1b[31m[Minecraft]\x1b[0m ${line}`);
                options.onLog?.(line, true);
            });
        });

        child.on('close', (code) => {
            console.log(`[Launcher] Minecraft process exited with code ${code}`);
            removeNativeLibs();
            if (code !== 0 && errors.length > 0) {
                console.error(`[Launcher] Process exited with error code ${code}`);
            }
        });

        return child;
    }
}
