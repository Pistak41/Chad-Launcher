import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { ConfigProps } from '../../common/types/Config';
import type { HeliosServer } from '@common/types/HeliosTypes';

export const useConfig = create<ConfigProps>()(persist(set => ({
    memory: {
        freeRam: 15,
        totalRam: 7,
    },
    width: 1280,
    height: 720,
    username: '',
    JAVA_HOME: '',
    selectedRam: {
        min: 3,
        max: 3
    },
    server: {} as HeliosServer,
    setMemory: memory => set({ memory }),
    setUsername: username => set({ username }),
    setJavaHome: JAVA_HOME => set({ JAVA_HOME }),
    setScreenSize: (width, height) => set({ width, height }),
    setSelectedRam: selectedRam => set({ selectedRam }),
    setServer: server => set({ server })
}), {
    name: 'config-storage',
    storage: createJSONStorage(() => localStorage)
}));

useConfig.subscribe(state => window.electronAPI.updateConfig(JSON.parse(JSON.stringify(state)) as Partial<ConfigProps>));