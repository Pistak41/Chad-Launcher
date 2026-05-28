import type { HeliosServer } from "./HeliosTypes";

export interface ConfigProps {
    username: string,
    JAVA_HOME: string,
    selectedRam: {
        min: number,
        max: number
    },
    width: number,
    height: number,
    memory: {
        totalRam: number,
        freeRam: number
    },
    server: HeliosServer,
    setSelectedRam: (selectedRam: {
        min: number,
        max: number
    }) => void,
    setMemory: (memory: {
        totalRam: number,
        freeRam: number
    }) => void,
    setScreenSize: (width: number, height: number) => void,
    setUsername: (username: string) => void,
    setJavaHome: (JAVA_HOME: string) => void,
    setServer: (server: HeliosServer) => void
}