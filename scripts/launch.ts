import 'dotenv/config';
import { MinecraftLauncher } from '../electron/launcher';

async function main() {
    const args = process.argv.slice(2);
    let serverId: string | undefined;

    for (const arg of args) {
        if (arg.startsWith('--server=')) {
            serverId = arg.split('=')[1];
        } else if (!arg.startsWith('-')) {
            serverId = arg;
        }
    }

    console.log('====================================================');
    console.log('       CHAD LAUNCHER - Standalone CLI Runner       ');
    console.log('====================================================');
    if (serverId) {
        console.log(`[CLI] Requesting Server ID: ${serverId}`);
    } else {
        console.log('[CLI] No Server ID provided, using active/default server from config.');
    }

    const launcher = new MinecraftLauncher();

    try {
        await launcher.launch({
            serverId,
            onProgress: (progress) => {
                console.log(`[CLI Progress] Verification / Download: ${progress}%`);
            },
            onLog: (_msg, _isError) => {
                // Stdout and Stderr are already piped to console with color tags
            }
        });
    } catch (err: any) {
        console.error('[CLI Error] Launch failed:', err.message || err);
        process.exit(1);
    }
}

main();

