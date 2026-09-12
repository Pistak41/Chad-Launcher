import { AnimatePresence } from "framer-motion";
import { Route, Routes, useLocation } from "react-router";
import { Page } from "@/components/Page";
import { Loading } from "@/Loading";
import { Login } from "@/Login";
import { App } from "@/App";
import { Settings } from "@/Settings";
import { Minecraft } from "@/pages/settings/Minecraft";
import { Mods } from "@/pages/settings/Mods";
import { Java } from "@/pages/settings/Java";
import { Updates } from "@/pages/settings/Updates";

export const AnimatedRoutes = () => {
    const location = useLocation();

    return (
        <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
                <Route path="/" element={<Page><Loading /></Page>} />
                <Route path="login" element={<Page><Login /></Page>} />
                <Route path="home" element={<Page><App /></Page>} />
                <Route path="settings" element={<Page><Settings /></Page>}>
                    <Route path="minecraft" element={<Page><Minecraft /></Page>} />
                    <Route path="mods" element={<Page><Mods /></Page>} />
                    <Route path="java" element={<Page><Java /></Page>} />
                    <Route path="updates" element={<Page><Updates /></Page>} />
                </Route>
            </Routes>
        </AnimatePresence>
    );
};