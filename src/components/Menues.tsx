import { Link, useLocation } from "react-router-dom";
import { TextButton } from "./Buttons";

export const SettingsMenu = () => {

    const { state } = useLocation();

    return (
        <ul className="grid gap-4 mt-5">
            <li>
                <TextButton size={14} uppercase >
                    <Link to="/settings/minecraft" state={state}>Minecraft</Link>
                </TextButton>
            </li>
            <li>
                <TextButton size={14} uppercase >
                    <Link to="/settings/mods" state={state}>Mods</Link>
                </TextButton>
            </li>
            <li>
                <TextButton size={14} uppercase >
                    <Link to="/settings/java" state={state}>Java</Link>
                </TextButton>
            </li>
        </ul>
    );
};