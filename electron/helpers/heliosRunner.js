/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-unused-vars */
const { FullRepair, DistributionIndexProcessor } = require('helios-core/dl');
const { DistributionAPI, HeliosModule } = require('helios-core/common');
const { writeFileSync, existsSync, mkdirSync } = require('node:fs');
const { join } = require('node:path');
const os = require('node:os');

const handleProcess = data => process.send({ type: 'percentage', data });

/**
 * @param {string} serverId
 * @param {HeliosModule[]} modules
 * @param {string} commonDirectory
 * @param {string} instanceDirectory
 */
const constructModList = (serverId, modules, commonDirectory, instanceDirectory) => {

    if (!existsSync(instanceDirectory)) {
        mkdirSync(instanceDirectory);
    }

    if (!existsSync(join(instanceDirectory, serverId))) {
        mkdirSync(join(instanceDirectory, serverId));
    }

    writeFileSync(join(instanceDirectory, serverId, 'forgeModList.json'), JSON.stringify({
        repositoryRoot: 'absolute:' + join(commonDirectory, 'modstore'),
        modRef: modules.map(m => m.getExtensionlessMavenIdentifier())
    }));
};


// eslint-disable-next-line no-undef
process.on('message', async (data) => {

    const api = new DistributionAPI(
        data.launcherDirectory,
        data.commonDirectory,
        data.instanceDirectory,
        'http://phobos.net.ar:3000/distribution.json',
        false
    );

    const distro = await api.getDistribution();

    const { servers } = distro;

    const mainServer = servers.find(s => s.rawServer.mainServer) ?? servers[0];

    const repair = new FullRepair(
        data.commonDirectory,
        data.instanceDirectory,
        data.launcherDirectory,
        mainServer.rawServer.id,
        api.isDevMode()
    );

    repair.spawnReceiver();

    repair.childProcess.on('error', (err) => { console.log(err); });
    repair.childProcess.on('close', (code, _signal) => { console.log(code); });

    const invalidFiles = await repair.verifyFiles(handleProcess);

    if (invalidFiles > 0) await repair.download(handleProcess);

    repair.destroyReceiver();

    constructModList(mainServer.rawServer.id, mainServer.modules, data.commonDirectory, data.instanceDirectory);

    const { minecraftArguments } = await new DistributionIndexProcessor(data.commonDirectory, distro, mainServer.rawServer.id).loadModLoaderVersionJson(mainServer);

    process.send({ type: 'selectedServer', data: mainServer });

    process.send({ type: 'mArgs', data: minecraftArguments });
});