import { writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from "node:fs";
import { join } from 'node:path';
import { ConfigProps } from "@common/types/Config";

const getUserDataPath = (): string => {
    try {
        const electron = require('electron');
        const app = electron?.app || electron?.remote?.app;
        if (app && typeof app.getPath === 'function') {
            return app.getPath('userData');
        }
    } catch {
        // Fallback for CLI mode
    }
    const os = require('node:os');
    const appData = process.platform === 'win32'
        ? (process.env.APPDATA || join(os.homedir(), 'AppData', 'Roaming'))
        : (process.platform === 'darwin'
            ? join(os.homedir(), 'Library', 'Application Support')
            : (process.env.XDG_CONFIG_HOME || join(os.homedir(), '.config')));
    return join(appData, 'chad-launcher');
};

export default class ConfigManager {
    private readonly path: string;

    get config(): ConfigProps {
        if (!existsSync(this.path)) return {} as ConfigProps;
        return JSON.parse(readFileSync(this.path, 'utf-8') || '{}');
    }

    constructor(customPath?: string) {
        this.path = customPath ? customPath : join(getUserDataPath(), 'config.json');
        this.loadConfig();
    }

    saveValues(config: Partial<ConfigProps>) {
        this.saveConfig(config);
    }

    saveValue(key: string, value: string) {
        this.saveConfig({ [key]: value });
    }

    private loadConfig() {
        if (!existsSync(this.path)) return this.saveConfig({});
    }

    private saveConfig(cfg: Record<string, any>) {
        return writeFile(this.path, JSON.stringify({ ...this.config, ...cfg }));
    }
}