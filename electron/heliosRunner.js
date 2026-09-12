/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-unused-vars */
const { FullRepair, DistributionIndexProcessor } = require('helios-core/dl');
const { DistributionAPI, HeliosModule, HeliosServer } = require('helios-core/common');
const { writeFileSync, existsSync, mkdirSync } = require('node:fs');
const { join } = require('node:path');
const os = require('node:os');

const { DISTRO_URL } = process.env;

const handleProcess = data => process.send({ type: 'percentage', data });


/**
 * @param {string} serverId
 * @param {HeliosModule[]} modules
 * @param {string} commonDirectory
 * @param {string} instanceDirectory
 */
const constructModList = (serverId, modules, commonDirectory, instanceDirectory) => {
    const serverInstanceDir = join(instanceDirectory, serverId);
    const modsDir = join(serverInstanceDir, 'mods');

    if (!existsSync(instanceDirectory)) {
        mkdirSync(instanceDirectory, { recursive: true });
    }

    if (!existsSync(serverInstanceDir)) {
        mkdirSync(serverInstanceDir, { recursive: true });
    }

    if (!existsSync(modsDir)) {
        mkdirSync(modsDir, { recursive: true });
    }

    const { copyFileSync, statSync, readdirSync, unlinkSync } = require('node:fs');
    const { basename } = require('node:path');

    const activeModFiles = new Set();
    const forgeMods = modules.filter(m => m.rawModule && m.rawModule.type === 'ForgeMod');

    for (const mod of forgeMods) {
        const srcPath = mod.getPath();
        if (srcPath && existsSync(srcPath)) {
            const filename = basename(srcPath);
            const destPath = join(modsDir, filename);
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
                unlinkSync(join(modsDir, file));
            }
        }
    } catch (err) {
        console.warn('Failed to clean up instance mods:', err);
    }

    writeFileSync(join(serverInstanceDir, 'forgeModList.json'), JSON.stringify({
        repositoryRoot: 'absolute:' + join(commonDirectory, 'modstore'),
        modRef: modules.filter(m => m.getMavenComponents()).map(m => m.getExtensionlessMavenIdentifier())
    }));
};

/**
 * @param {Object} params
 * @param {string} params.commonDirectory
 * @param {string} params.instanceDirectory
 * @param {string} params.launcherDirectory
 * @param {HeliosServer} params.server
 */
const verifyFiles = async ({ commonDirectory, instanceDirectory, launcherDirectory, server }) => {
    const repair = new FullRepair(
        commonDirectory,
        instanceDirectory,
        launcherDirectory,
        server.rawServer.id,
        false
    );

    repair.spawnReceiver();

    repair.childProcess.on('error', (err) => { console.log(err); });
    repair.childProcess.on('close', (code, _signal) => { console.log(code); });

    const invalidFiles = await repair.verifyFiles(handleProcess);

    if (invalidFiles > 0) await repair.download(handleProcess);

    repair.destroyReceiver();

    constructModList(server.rawServer.id, server.modules, commonDirectory, instanceDirectory);

    process.send({ type: 'selectedServer', data: server }, () => {
        process.disconnect();
    });
};


// eslint-disable-next-line no-undef
process.on('message', async (data) => {

    const api = new DistributionAPI(
        data.launcherDirectory,
        data.commonDirectory,
        data.instanceDirectory,
        DISTRO_URL,
        false
    );

    const distro = await api.getDistribution();

    const { servers } = distro;

    const server = data.serverId
        ? servers.find(s => s.rawServer.id === data.serverId)
        : servers.find(s => s.rawServer.mainServer) ?? servers[0];

    await verifyFiles({ ...data, server });
});