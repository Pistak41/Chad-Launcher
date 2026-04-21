export interface ConfigProps {
    username: string,
    JAVA_HOME: string,
    selectedRam: {
        min: number,
        max: number
    },
    memory: {
        totalRam: number,
        freeRam: number
    },
    setSelectedRam: (selectedRam: {
        min: number,
        max: number
    }) => void,
    setMemory: (memory: {
        totalRam: number,
        freeRam: number
    }) => void,
    setUsername: (username: string) => void,
    setJavaHome: (JAVA_HOME: string) => void
}