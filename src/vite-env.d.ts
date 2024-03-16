/// <reference types="vite/client" />

export interface IElectronAPI {
    changeIcon: () => void
    getENV: (callback: (event: IpcRendererEvent, ...args: any[]) => void) => void
    getMemoryStatus: (callback: (event: IpcRendererEvent, ...args: any[]) => void) => void
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
