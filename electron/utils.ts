import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { Library } from "../common/types/MojangTypes";
import path from "node:path";
import AdmZip from "adm-zip";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { discoverBestJvmInstallation, extractJdk, latestOpenJDK } from "helios-core/java";
import { downloadFile } from "helios-core/dl";
import { HeliosServer } from "helios-core/common";
import { app } from "electron";

export const SYS_ROOT = path.join(app.getPath('appData'), '.chad');

export const NATIVE_TEMP_FOLDER_NAME = path.join(tmpdir(), randomUUID());
const NATIVES_RGX = /.+:natives-([^-]+)(?:-(.+))?/;
const NATIVES_112_EXCLUDE_FILES = ['META-INF/'];
const NATIVES_113_EXCLUDE_FILES = [...NATIVES_112_EXCLUDE_FILES, '.git', '.sha1'];
export const IS_MAC = process.platform === 'darwin';

export const removeNativeLibs = () => rmSync(NATIVE_TEMP_FOLDER_NAME, { recursive: true });

export const resolveNativeLibs = async (libraries: Library[]) => {
    const nativeLibs = libraries.filter(({ name, natives }) => natives || process.arch == (NATIVES_RGX.exec(name)?.[2] ?? 'x64'));

    if (existsSync(NATIVE_TEMP_FOLDER_NAME)) {
        rmSync(NATIVE_TEMP_FOLDER_NAME, { recursive: true });
    }

    mkdirSync(NATIVE_TEMP_FOLDER_NAME);

    await Promise.all(
        nativeLibs
            .map(({ extract, downloads: { artifact, classifiers }, natives }) => {
                return new AdmZip(
                    path.join(
                        SYS_ROOT,
                        'common',
                        'libraries',
                        !natives
                            ? artifact.path
                            : classifiers![IS_MAC ? 'natives-osx' : 'natives-windows']!.path
                    ))
                    .getEntries()
                    .filter(({ isDirectory, entryName }) => (
                        !isDirectory
                        && !(extract?.exclude ?? (natives ? NATIVES_112_EXCLUDE_FILES : NATIVES_113_EXCLUDE_FILES)).some(ex => entryName.includes(ex))
                    ))
                    .map(({ entryName, getData }) => writeFileSync(
                        path.join(
                            NATIVE_TEMP_FOLDER_NAME,
                            entryName.split('/').at(-1)!
                        ),
                        new Uint8Array(getData())
                    ))
            }
            )
            .join()
    );
};

const aux = (arg: string) : string[] => {

    const aTrimmed = arg.trim();

    const i = aTrimmed.indexOf(' ');
    const key = aTrimmed.slice(0, i);
    const value: string | string[] = aTrimmed.slice(i + 1);

    if (value.includes('--') && !value.startsWith('--')) {
        return [key, ...aux(value)];
    }

    return [key, value];

};

export const resolveArguments = (minecraftArguments: string, argMap: Record<string, string>, extraArgs: Record<string, string>) => {
    return [...Object.entries(extraArgs).flat(1), ...minecraftArguments.replace(/\${(.*?)}/g, (_, arg) => argMap[arg] + '\n').split('\n').map((a, i, l) => i === l.length - 1 ? aux(a).map(o => o.split(' ')): aux(a)).flat(10)];
};

export const checkJava = async (launcherDir: string, selectedServer: HeliosServer, handlePercentage: (percentage: number) => void = () => null) => {
    const { effectiveJavaOptions: { supported, distribution, suggestedMajor } } = selectedServer!;

    const jvmDetails = await discoverBestJvmInstallation(launcherDir, supported);

    if (jvmDetails) return jvmDetails.path;

    const asset = await latestOpenJDK(suggestedMajor, launcherDir, distribution);

    if (!asset) return '';

    await downloadFile(asset.url, asset.path, ({ percent }) => handlePercentage(Math.round(percent * 100)));

    return await extractJdk(asset.path);

};