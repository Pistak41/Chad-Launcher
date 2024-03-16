import { useEffect } from "react";
import { TextButton } from "./components/Buttons";
import { ServerStatus } from "./components/ServerStatus";
import { useConfig } from "./store/AuthContext";
import { Link, useLocation, useNavigate } from "react-router-dom";

export const App = () => {

  const navigate = useNavigate();
  const location = useLocation();
  const { username } = useConfig();

  useEffect(() => {
    if (!username) navigate('/');
  }, [username, navigate]);


  return (
    <div className="flex gap-x-4 h-screen">
      <section className="flex flex-1 p-20 flex-col justify-between">
        <span>Bienvenido <strong>{username}</strong></span>
        <ServerStatus />

      </section>
      <aside className="p-20 flex flex-col justify-between">
        <ul className="grid gap-4">
          <li>
            <TextButton size={14} uppercase >
              <Link to="/settings/minecraft" state={{ prevURL: location.pathname }}>Configuración</Link>
            </TextButton>
          </li>
          <li>
            <TextButton size={14} uppercase >
              <a href="https://discord.gg/5c9uBC7VC7" target="_blank">Discord</a>
            </TextButton>
          </li>
          <li>
            <TextButton size={14} uppercase >
              <Link to="https://www.github.com/pistak41/chad-launcher" target="_blank">Github</Link>
            </TextButton>
          </li>
        </ul>
        <TextButton size={28} uppercase bold >
          <span>Jugar</span>
        </TextButton>
      </aside>
    </div>
  );
};
