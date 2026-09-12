import React, { useEffect, useState } from 'react';
import { ProgressBar } from '@/components/ProgressBar';
import { TextButton } from '@/components/Buttons';
import type { UpdateProgressInfo, UpdateVersionInfo } from '@/vite-env';

export const Updates: React.FC = () => {
    const [currentVersion, setCurrentVersion] = useState<string>('');
    const [status, setStatus] = useState<'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'up-to-date' | 'error'>('idle');
    const [latestVersion, setLatestVersion] = useState<string>('');
    const [progress, setProgress] = useState<number>(0);
    const [errorMessage, setErrorMessage] = useState<string>('');

    useEffect(() => {
        if (!window.electronAPI) return;

        window.electronAPI.getAppVersion().then(v => {
            if (v) setCurrentVersion(v);
        }).catch(() => null);

        const unsubChecking = window.electronAPI.onUpdateChecking(() => {
            setStatus('checking');
            setErrorMessage('');
        });

        const unsubAvailable = window.electronAPI.onUpdateAvailable((info: UpdateVersionInfo) => {
            setStatus('available');
            setLatestVersion(info.version || '');
        });

        const unsubNotAvailable = window.electronAPI.onUpdateNotAvailable((info: UpdateVersionInfo) => {
            setStatus('up-to-date');
            if (info?.version) setLatestVersion(info.version);
        });

        const unsubProgress = window.electronAPI.onUpdateProgress((prog: UpdateProgressInfo) => {
            setStatus('downloading');
            setProgress(prog.percent || 0);
        });

        const unsubDownloaded = window.electronAPI.onUpdateDownloaded((info: UpdateVersionInfo) => {
            setStatus('downloaded');
            setLatestVersion(info.version || '');
        });

        const unsubError = window.electronAPI.onUpdateError((err: string) => {
            setStatus('error');
            setErrorMessage(err);
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

    const handleCheckUpdates = async () => {
        setStatus('checking');
        setErrorMessage('');
        try {
            await window.electronAPI.checkForUpdates();
        } catch (err: any) {
            setStatus('error');
            setErrorMessage(err?.message || 'No se pudo buscar actualizaciones.');
        }
    };

    return (
        <div className="flex-1 p-8 text-white flex flex-col gap-6 max-w-2xl">
            <div>
                <h2 className="text-2xl font-bold uppercase tracking-wider">Actualizaciones del Launcher</h2>
                <p className="text-xs text-gray-400 mt-1">Gestión de versiones y actualizaciones automáticas de Chad Launcher.</p>
            </div>

            <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-6 flex flex-col gap-5 backdrop-blur-md shadow-xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div>
                        <span className="text-xs uppercase tracking-widest text-gray-400 block">Versión Actual</span>
                        <span className="text-lg font-mono font-bold text-white">{currentVersion ? `v${currentVersion}` : 'Desarrollo / Local'}</span>
                    </div>

                    {status === 'up-to-date' && (
                        <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-semibold">
                            ✓ Launcher actualizado
                        </span>
                    )}
                    {status === 'downloaded' && (
                        <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-3 py-1 rounded-full text-xs font-semibold">
                            ¡Actualización v{latestVersion} lista!
                        </span>
                    )}
                </div>

                {/* Status message */}
                <div className="flex flex-col gap-3">
                    {status === 'checking' && (
                        <div className="flex items-center gap-3 text-sm text-cyan-300">
                            <div className="w-5 h-5 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
                            <span>Buscando nuevas versiones en GitHub Releases...</span>
                        </div>
                    )}

                    {status === 'available' && (
                        <div className="text-sm text-amber-300">
                            <span>Nueva versión <strong className="font-mono">v{latestVersion}</strong> encontrada. Descargando automáticamente...</span>
                        </div>
                    )}

                    {status === 'downloading' && (
                        <div className="flex flex-col gap-2">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-emerald-400 font-semibold">Descargando actualización v{latestVersion}</span>
                                <span className="text-gray-400 font-mono">{progress}%</span>
                            </div>
                            <ProgressBar value={progress} label="Descarga de actualización" barColor="bg-gradient-to-r from-cyan-500 to-emerald-400" />
                        </div>
                    )}

                    {status === 'downloaded' && (
                        <div className="flex flex-col gap-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-4">
                            <div className="text-sm text-emerald-200">
                                <strong>La actualización v{latestVersion} ha sido descargada correctamente.</strong>
                                <p className="text-xs text-gray-300 mt-1">Haz clic en el botón a continuación para reiniciar el launcher e instalar la nueva versión.</p>
                            </div>
                            <TextButton
                                size={14}
                                bold
                                uppercase
                                onClick={() => window.electronAPI.restartAndInstall()}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 px-4 rounded-xl transition-all shadow-lg text-center"
                            >
                                Reiniciar e instalar actualización
                            </TextButton>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="text-xs text-rose-300 bg-rose-950/30 border border-rose-500/30 p-3 rounded-lg">
                            ⚠️ Error al comprobar actualizaciones{errorMessage ? `: ${errorMessage}` : '.'}
                        </div>
                    )}
                </div>

                {/* Actions */}
                {status !== 'downloaded' && (
                    <div className="pt-2 flex justify-end">
                        <TextButton
                            size={14}
                            uppercase
                            bold
                            disabled={status === 'checking' || status === 'downloading'}
                            onClick={handleCheckUpdates}
                            className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl border border-white/10 transition-all"
                        >
                            {status === 'checking' ? 'Buscando...' : 'Buscar actualizaciones'}
                        </TextButton>
                    </div>
                )}
            </div>
        </div>
    );
};
