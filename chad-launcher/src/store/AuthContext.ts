import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface ConfigProps {
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

export const useConfig = create<ConfigProps>()(persist(set => ({
    memory: {
        freeRam: 15,
        totalRam: 7,
    },
    username: '',
    JAVA_HOME: '',
    selectedRam: {
        min: 3,
        max: 3
    },
    setMemory: (memory) => set({ memory }),
    setUsername: (username) => set({ username }),
    setJavaHome: (JAVA_HOME => set({ JAVA_HOME })),
    setSelectedRam: (selectedRam => set({ selectedRam }))
}), {
    name: 'config-storage',
    storage: createJSONStorage(() => localStorage)
}));