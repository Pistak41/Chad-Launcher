import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { ConfigProps } from '../types/Config';

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

useConfig.subscribe(state => window.electronAPI.updateConfig(JSON.parse(JSON.stringify(state)) as Partial<ConfigProps>));