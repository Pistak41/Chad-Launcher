/// <reference types="vite/client" />

export interface IElectronAPI {
    saveNickname: (nickname: string) => void,
    onSaved: (callback: function) => void,
    getNickname: () => Promise<string>
}

declare global {
    interface Window {
        electronAPI: IElectronAPI
    }
}