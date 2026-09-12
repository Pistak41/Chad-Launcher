import { FullRepair } from 'helios-core/dl';
import { DistributionAPI, HeliosModule, HeliosServer } from 'helios-core/common';
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { DEFAULT_DISTRO_URL } from './utils';

export interface HeliosRunnerData {
    launcherDirectory: string;
    commonDirectory: string;
    instanceDirectory: string;
    serverId?: string;
    distroUrl?: string;
}

export type ChildEvents =
    | { type: 'selectedServer'; data: HeliosServer }
    | { type: 'log'; data: string }
    | { type: 'percentage'; data: number | string };

const handleProcess = (data: number | string) => {
    if (process.send) {
        process.send({ type: 'percentage', data });
    }
};

const constructModList = (serverId: string, modules: HeliosModule[], commonDirectory: string, instanceDirectory: string) => {
    const serverInstanceDir = path.join(instanceDirectory, serverId);
    const modsDir = path.join(serverInstanceDir, 'mods');

    if (!existsSync(instanceDirectory)) {
        mkdirSync(instanceDirectory, { recursive: true });
    }
    if (!existsSync(serverInstanceDir)) {
        mkdirSync(serverInstanceDir, { recursive: true });
    }
    if (!existsSync(modsDir)) {
        mkdirSync(modsDir, { recursive: true });
    }

    const activeModFiles = new Set<string>();
    const forgeMods = modules.filter(m => m.rawModule && m.rawModule.type === 'ForgeMod');

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
                }
            } catch (err) {
                console.warn('Failed to copy mod file to instance mods:', err);
            }
        }
    }

    try {
        const existingFiles = readdirSync(modsDir);
        for (const file of existingFiles) {
            if (file.endsWith('.jar') && !activeModFiles.has(file)) {
                unlinkSync(path.join(modsDir, file));
            }
        }
    } catch (err) {
        console.warn('Failed to clean up instance mods:', err);
    }

    writeFileSync(path.join(serverInstanceDir, 'forgeModList.json'), JSON.stringify({
        repositoryRoot: 'absolute:' + path.join(commonDirectory, 'modstore'),
        modRef: modules.filter(m => m.getMavenComponents()).map(m => m.getExtensionlessMavenIdentifier())
    }));
};

const verifyFiles = async (params: {
    commonDirectory: string;
    instanceDirectory: string;
    launcherDirectory: string;
    server: HeliosServer;
}) => {
    const { commonDirectory, instanceDirectory, launcherDirectory, server } = params;

    const repair = new FullRepair(
        commonDirectory,
        instanceDirectory,
        launcherDirectory,
        server.rawServer.id,
        false
    );

    repair.spawnReceiver();

    repair.childProcess.on('error', (err: any) => { console.error(err); });
    repair.childProcess.on('close', (code: number) => { console.log(`[HeliosWorker] Repair process closed with code ${code}`); });

    const invalidFiles = await repair.verifyFiles(handleProcess);

    if (invalidFiles > 0) {
        await repair.download(handleProcess);
    }

    repair.destroyReceiver();

    constructModList(server.rawServer.id, server.modules, commonDirectory, instanceDirectory);

    if (process.send) {
        process.send({ type: 'selectedServer', data: server }, () => {
            process.disconnect?.();
        });
    }
};

process.on('message', async (data: HeliosRunnerData) => {
    try {
        const distroUrl = data.distroUrl || process.env.DISTRO_URL || DEFAULT_DISTRO_URL;

        const api = new DistributionAPI(
            data.launcherDirectory,
            data.commonDirectory,
            data.instanceDirectory,
            distroUrl,
            false
        );

        const distro = await api.getDistribution();
        const { servers } = distro;

        const server = data.serverId
            ? servers.find(s => s.rawServer.id === data.serverId)
            : servers.find(s => s.rawServer.mainServer) ?? servers[0];

        if (!server) {
            throw new Error(`Server ${data.serverId || 'default'} not found in distribution manifest.`);
        }

        await verifyFiles({
            commonDirectory: data.commonDirectory,
            instanceDirectory: data.instanceDirectory,
            launcherDirectory: data.launcherDirectory,
            server
        });
    } catch (err: any) {
        console.error('[HeliosWorker] Fatal Error:', err);
        if (process.send) {
            process.send({ type: 'log', data: `Error in worker: ${err.message || String(err)}` });
        }
        process.exit(1);
    }
});

