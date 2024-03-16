import { Outlet } from "react-router-dom";
import { BackButton } from "./components/Buttons";
import { SettingsMenu } from "./components/Menues";
export const Settings = () => {
    return (
        <div className="flex h-screen p-20 gap-10">
            <div>
                <BackButton size={24} />
                <SettingsMenu />
            </div>
            <Outlet />
        </div>
    );
};
