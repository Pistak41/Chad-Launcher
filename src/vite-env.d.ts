/// <reference types="vite/client" />

import type { ConfigProps } from "@common/types/Config";
import type { HeliosServer } from "@common/types/HeliosTypes";

export interface IElectronAPI {
    play: () => void
    onDownloadProgress: (callback: (event: IpcRendererEvent, progress: number) => void) => void
    onDownloadComplete: (callback: () => void) => void
    getReady: (callback: (event: IpcRendererEvent, server: HeliosServer) => void) => void
    updateConfig: (state: Partial<ConfigProps>) => void
    openFolder: () => Promise<string>
    getServers: () => Promise<HeliosServer[]>
    getJava: () => Promise<string>
    getMemory: () => Promise<MemoryProps>
}

declare global {
    interface Window {
        electronAPI: IElectronAPI
    }
}

export interface ServerStatusResponse {
    ip: string;
    port: number;
    debug: Debug;
    motd: MOTD;
    players: Players;
    version: string;
    online: boolean;
    protocol: number;
    protocol_name: string;
    eula_blocked: boolean;
}

export interface Debug {
    ping: boolean;
    query: boolean;
    srv: boolean;
    querymismatch: boolean;
    ipinsrv: boolean;
    cnameinsrv: boolean;
    animatedmotd: boolean;
    cachehit: boolean;
    cachetime: number;
    cacheexpire: number;
    apiversion: number;
    error: Error;
}

export interface Error {
    query: string;
}

export interface MOTD {
    raw: string[];
    clean: string[];
    html: string[];
}

export interface Players {
    online: number;
    max: number;
}
