import { useEffect, useState } from "react";
import type { ServerStatusResponse } from "../vite-env";
import { useConfig } from "@/store/AuthContext";

export const ServerStatus = () => {

    const { server: { hostname, port } } = useConfig();
    const [status, setStatus] = useState('');

    useEffect(() => {
        fetch(`https://api.mcsrvstat.us/3/${hostname}:${port}`, { cache: "reload" })
            .then(response => response.json())
            .then((data: ServerStatusResponse) => {
                if (data.online) {
                    setStatus(data.players.online + "/" + data.players.max);
                }
            });
    }, [hostname, port]);

    return (
        <div className="flex gap-3 items-center">
            <span className={`w-4 h-4 ${!status ? 'bg-red-400' : 'bg-green-400'} rounded-full`}></span>

            <p className="text-xl font-semibold text-white">{status || 'Offline'}</p>
        </div>
    );
};