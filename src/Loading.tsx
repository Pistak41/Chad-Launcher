import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useConfig } from "@/store/AuthContext";
import chadLogo from '@/assets/chad.png';

export const Loading = () => {

    const navigate = useNavigate();

    const { JAVA_HOME, setJavaHome, setMemory } = useConfig();

    useEffect(() => {
        window.electronAPI.getENV(((_, javaHome) => {
            if (JAVA_HOME) return;

            setJavaHome(javaHome);
        }));

        window.electronAPI.getMemoryStatus(((_, ram) => {
            setMemory(ram);
        }));

        window.electronAPI.getReady(() => {
            navigate('/login');
        });

    }, [navigate, JAVA_HOME, setJavaHome, setMemory]);

    return (
        <div className="flex-1 flex justify-center items-center">
            <div className={`flex justify-center items-center`}>
                <div className="flex-1 w-[275px] h-[275px] absolute rounded-full border-t-2 animate-spin" />
                <img className="z-10" width={200} height={200} src={chadLogo} />
            </div>
        </div>
    );
};