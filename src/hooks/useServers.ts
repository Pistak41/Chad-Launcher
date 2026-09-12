import { HeliosServer } from "@common/types/HeliosTypes";
import { useEffect, useState } from "react";

export const useServers = () => {

    const [servers, setServers] = useState<Record<string, HeliosServer>>();

    const fetchServers = async () => {
        const fetchedServers = await window.electronAPI.getServers();

        setServers(
            fetchedServers.reduce<Record<string, HeliosServer>>((prev, srv) => ({ ...prev, [srv.rawServer.id]: srv }), {})
        );
    };

    useEffect(() => {
        fetchServers();
    }, []);

    return {
        servers
    };

};