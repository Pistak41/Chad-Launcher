import type { HeliosServer } from "./HeliosTypes";

export interface MemoryProps {
    totalRam: number,
    freeRam: number
}

export interface ConfigProps {
    username: string,
    JAVA_HOME: string,
    selectedRam: {
        min: number,
        max: number
    },
    width: number,
    height: number,
    memory: MemoryProps,
    server: HeliosServer,
    setSelectedRam: (selectedRam: {
        min: number,
        max: number
    }) => void,
    setMemory: (memory: MemoryProps) => void,
    setScreenSize: (width: number, height: number) => void,
    setUsername: (username: string) => void,
    setJavaHome: (JAVA_HOME: string) => void,
    setServer: (server: HeliosServer) => void
}