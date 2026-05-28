import { Mod } from "@/components/Mod";
import { useConfig } from "@/store/AuthContext";
import { HeliosModule } from "@common/types/HeliosTypes";
import { Type } from "helios-distribution-types";
import { useMemo } from "react";

export const Mods = () => {

    const { server } = useConfig();

    const mods = useMemo<Array<HeliosModule>>(() => server.modules.filter(({ rawModule: { type } }) => type === Type.ForgeMod), [server]);

    return (
        <section className="flex-1 p-5 text-white">
            <h2 className="text-4xl mb-5">Mods</h2>
            <hr />
            <ul className="my-5 overflow-y-scroll h-full scrollbar">
                {mods.map(m => <Mod key={m.rawModule.id} mod={m}></Mod>)}
            </ul>
        </section>
    );
};
