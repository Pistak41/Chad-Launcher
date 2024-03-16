import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App.tsx'
import './index.css'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Login } from './Login.tsx';
import { Settings } from './Settings.tsx';
import { Minecraft } from './pages/settings/Minecraft.tsx';
import { Mods } from './pages/settings/Mods.tsx';
import { Java } from './pages/settings/Java.tsx';

const imagenRandom = Math.floor(Math.random() * 10)


if (imagenRandom === 9) {
  const link = document.querySelector("link[rel~='icon']");

  document.head.removeChild(link!);

  const favicon = document.createElement('link');
  favicon.rel = 'icon';
  favicon.type = 'image/png';
  favicon.href = '/tree.png';
  document.head.appendChild(favicon);

  window.electronAPI.changeIcon();

  const audio = new Audio('Wise Mystical Tree.mp3');
  audio.loop = true;
  audio.play()

}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <main className="bg-cover min-h-screen flex flex-col justify-center" style={{ backgroundImage: `url(/${imagenRandom}.jpg)` }}>
      <Router>
        <Routes>
          <Route path='/' element={<Login />} />
          <Route path='home' element={<App />} />
          <Route path='settings' element={<Settings />}>
            <Route index path='minecraft' element={<Minecraft />} />
            <Route path='mods' element={<Mods />} />
            <Route path='java' element={<Java />} />
          </Route>
        </Routes>
      </Router>
    </main>
  </React.StrictMode>,
)
