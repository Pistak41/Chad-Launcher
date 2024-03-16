import { app } from "electron";
import { writeFile } from 'node:fs/promises'
import { existsSync, readFileSync } from "node:fs";
import { join } from 'node:path'

export default class ConfigManager {
    path = join(app.getPath('userData'), 'config.json')
    config: { [key: string]: string } = {};

    constructor() {
        this.loadConfig();
    }

    async saveValue(key: string, value: string) {
        this.config[key] = value;
        await this.saveConfig();
    }

    private loadConfig() {
        if (!existsSync(this.path)) return this.saveConfig();

        this.config = JSON.parse(readFileSync(this.path, 'utf-8'));
    }

    private saveConfig() {
        return writeFile(this.path, JSON.stringify(this.config, null, 2))
    }
}