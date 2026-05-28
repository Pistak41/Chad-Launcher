import { HeliosModule } from "@common/types/HeliosTypes";

export const Mod = ({ mod }: { mod: HeliosModule }) => (
    <li className="flex flex-col">
        <strong>{mod.rawModule.name}</strong>
        <i>{mod.mavenComponents.version}</i>
        <hr />
    </li>
);