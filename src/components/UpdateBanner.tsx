import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ProgressBar } from './ProgressBar';
import { TextButton } from './Buttons';
import type { UpdateProgressInfo, UpdateVersionInfo } from '@/vite-env';

export type UpdateStatus = 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'error';

export const UpdateBanner: React.FC = () => {
    const [status, setStatus] = useState<UpdateStatus>('idle');
    const [version, setVersion] = useState<string>('');
    const [progress, setProgress] = useState<number>(0);
    const [errorMsg, setErrorMsg] = useState<string>('');

    useEffect(() => {
        if (!window.electronAPI) return;

        const unsubChecking = window.electronAPI.onUpdateChecking(() => {
            setStatus('checking');
        });

        const unsubAvailable = window.electronAPI.onUpdateAvailable((info: UpdateVersionInfo) => {
            setStatus('available');
            setVersion(info.version || '');
        });

        const unsubNotAvailable = window.electronAPI.onUpdateNotAvailable(() => {
            setStatus('idle');
        });

        const unsubProgress = window.electronAPI.onUpdateProgress((prog: UpdateProgressInfo) => {
            setStatus('downloading');
            setProgress(prog.percent || 0);
        });

        const unsubDownloaded = window.electronAPI.onUpdateDownloaded((info: UpdateVersionInfo) => {
            setStatus('downloaded');
            setVersion(info.version || '');
        });

        const unsubError = window.electronAPI.onUpdateError((err: string) => {
            setStatus('error');
            setErrorMsg(err);
        });

        return () => {
            unsubChecking?.();
            unsubAvailable?.();
            unsubNotAvailable?.();
            unsubProgress?.();
            unsubDownloaded?.();
            unsubError?.();
        };
    }, []);

    if (status === 'idle') return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="w-full bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-xl p-4 shadow-2xl flex flex-col gap-2 z-50 text-white"
            >
                {status === 'checking' && (
                    <div className="flex items-center gap-3 text-sm">
                        <div className="w-4 h-4 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
                        <span>Buscando actualizaciones del launcher...</span>
                    </div>
                )}

                {status === 'available' && (
                    <div className="flex items-center gap-3 text-sm">
                        <div className="w-4 h-4 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
                        <span>Nueva versión {version ? `v${version}` : ''} disponible. Iniciando descarga...</span>
                    </div>
                )}

                {status === 'downloading' && (
                    <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center text-xs font-semibold">
                            <span className="text-emerald-400">Actualizando Launcher {version ? `v${version}` : ''}</span>
                            <span className="text-gray-300">Descargando...</span>
                        </div>
                        <ProgressBar value={progress} label={`Progreso de descarga`} barColor="bg-gradient-to-r from-cyan-500 to-emerald-400" />
                    </div>
                )}

                {status === 'downloaded' && (
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex flex-col text-sm">
                            <span className="font-bold text-emerald-400">¡Actualización {version ? `v${version}` : ''} lista!</span>
                            <span className="text-xs text-gray-300">El launcher necesita reiniciarse para instalar los cambios.</span>
                        </div>
                        <TextButton
                            size={14}
                            bold
                            uppercase
                            onClick={() => window.electronAPI.restartAndInstall()}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg transition-all shadow-lg"
                        >
                            Reiniciar y actualizar
                        </TextButton>
                    </div>
                )}

                {status === 'error' && (
                    <div className="flex items-center justify-between text-xs text-rose-300 gap-2">
                        <span>Error al buscar o descargar actualización {errorMsg ? `: ${errorMsg}` : ''}</span>
                        <button onClick={() => setStatus('idle')} className="text-gray-400 hover:text-white underline">
                            Cerrar
                        </button>
                    </div>
                )}
            </motion.div>
        </AnimatePresence>
    );
};

