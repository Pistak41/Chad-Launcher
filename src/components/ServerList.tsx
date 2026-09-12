import up from '@/assets/chevron-up-outline.svg';
import { useCallback, useRef } from 'react';
import { TextButton } from './Buttons';
import { useServers } from '@/hooks/useServers';
import { useConfig } from '@/store/AuthContext';


export const ServerList = () => {

    const detailRef = useRef<HTMLDetailsElement>(null);

    const { servers } = useServers();
    const { server, setServer } = useConfig();


    const handleClick = useCallback((serverId: string) => () => {
        setServer(servers![serverId]);
        detailRef.current!.open = false;
    }, [servers, setServer]);

    return (
        <details
            ref={detailRef}
            className="relative z-10 m-2 max-w-[700px] flex items-end [&_img]:open:-rotate-180 [&_img]:transition-all [&_img]:duration-300"
        >
            <ul
                className="absolute bottom-full right-0 mb-2 w-max min-w-[150px] bg-[#424242e8]"
            >
                {servers && Object.values(servers).map(({ rawServer: sv }) => (
                    <li
                        key={sv.id}
                        className="px-3 py-1"
                    >
                        <TextButton className="disabled:text-green-500" size={14} onClick={handleClick(sv.id)} disabled={sv.id === server.rawServer.id}>
                            {sv.name}
                        </TextButton>
                    </li>
                ))}
            </ul>

            <summary className="[list-style-type:''] cursor-pointer">
                <img
                    className="invert"
                    width={25}
                    height={25}
                    src={up}
                />
            </summary>
        </details>
    );
};