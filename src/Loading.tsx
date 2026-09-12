import { useCallback, useEffect } from "react";
import { useNavigate } from "react-router";
import { useConfig } from "@/store/AuthContext";
import chadLogo from '@/assets/chad.png';

export const Loading = () => {

    const navigate = useNavigate();

    const { setJavaHome, setMemory, setServer } = useConfig();

    const loadConfig = useCallback(async () => {
        const java = await window.electronAPI.getJava();
        const memory = await window.electronAPI.getMemory();

        setJavaHome(java);
        setMemory(memory);

        console.log('aca');


        window.electronAPI.getReady((_, server) => {

            console.log('asas', server);

            setServer(server);

            navigate('/login');
        });
    }, [navigate, setJavaHome, setMemory, setServer]);

    useEffect(() => {
        loadConfig();
    }, [loadConfig]);

    return (
        <div className="flex-1 flex justify-center items-center">
            <div className={`flex justify-center items-center`}>
                <div className="flex-1 w-[275px] h-[275px] absolute rounded-full border-t-2 animate-spin" />
                <img className="z-10" width={200} height={200} src={chadLogo} />
            </div>
        </div>
    );
};