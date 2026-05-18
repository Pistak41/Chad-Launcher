import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App.tsx";
import "./index.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Login } from "./Login.tsx";
import { Settings } from "./Settings.tsx";
import { Minecraft } from "./pages/settings/Minecraft.tsx";
import { Mods } from "./pages/settings/Mods.tsx";
import { Java } from "./pages/settings/Java.tsx";
import { Loading } from "./Loading.tsx";

import imagen0 from '@/assets/0.jpg';
import imagen1 from '@/assets/1.jpg';
import imagen2 from '@/assets/2.jpg';
import imagen3 from '@/assets/3.jpg';
import imagen4 from '@/assets/4.jpg';
import imagen5 from '@/assets/5.jpg';
import imagen6 from '@/assets/6.jpg';
import imagen7 from '@/assets/7.jpg';
import imagen8 from '@/assets/8.jpg';
import imagen9 from '@/assets/9.jpg';
import imagen10 from '@/assets/10.jpg';
import imagen11 from '@/assets/11.jpg';
import wiseTreeSong from '@/assets/Wise Mystical Tree.mp3';
import facu from '@/assets/facu.mp3';
import tree from '@/assets/tree.png';
import chadLogo from '@/assets/chad.png';

const BG_IMGS = [
  imagen0,
  imagen1,
  imagen2,
  imagen3,
  imagen4,
  imagen5,
  imagen6,
  imagen7,
  imagen8,
  imagen9,
  imagen10,
  imagen11
];

const imagenRandom = Math.floor(Math.random() * 12);


if (imagenRandom === 9) {
  const link = document.querySelector("link[rel~='icon']");

  document.head.removeChild(link!);

  const favicon = document.createElement("link");
  favicon.rel = "icon";
  favicon.type = "image/png";
  favicon.href = tree;
  document.head.appendChild(favicon);

  window.electronAPI.changeIcon();

  const audio = new Audio(wiseTreeSong);
  audio.loop = true;
  audio.play();
} else if (imagenRandom === 11) {
  const audio = new Audio(facu);
  audio.loop = true;
  audio.play();
} else {
  const favicon = document.createElement("link");
  favicon.rel = "icon";
  favicon.type = "image/png";
  favicon.href = chadLogo;
  document.head.appendChild(favicon);
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <main
      className="bg-cover min-h-screen flex flex-col justify-center"
      style={{ backgroundImage: `url(${BG_IMGS[imagenRandom]})` }}
    >
      <Router>
        <Routes>
          <Route index path="/" element={<Loading />} />
          <Route path="login" element={<Login />} />
          <Route path="home" element={<App />} />
          <Route path="settings" element={<Settings />}>
            <Route index path="minecraft" element={<Minecraft />} />
            <Route path="mods" element={<Mods />} />
            <Route path="java" element={<Java />} />
          </Route>
        </Routes>
      </Router>
    </main>
  </React.StrictMode>,
);
