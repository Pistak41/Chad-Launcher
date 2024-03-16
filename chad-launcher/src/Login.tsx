import { useNavigate } from "react-router-dom"
import { BlurCard } from "./components/Cards";
import { useEffect, useState } from "react";
import { useConfig } from "./store/AuthContext";

export const Login = () => {
  const navigate = useNavigate();
  const { username, setUsername } = useConfig()
  const [isVisible, setIsVisible] = useState(false)

  const { JAVA_HOME, setJavaHome, setMemory } = useConfig()

  useEffect(() => {
    window.electronAPI.getENV(((_, javaHome) => {
      if (JAVA_HOME) return;

      setJavaHome(javaHome)
    }))

    window.electronAPI.getMemoryStatus(((_, ram) => {
      setMemory(ram)
    }))

    if (username) {
      navigate('/home')
    } else {
      setIsVisible(true)
    }
  }, [navigate, username, JAVA_HOME, setJavaHome, setMemory])

  const login = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    const nickname = formData.get('nickname') as string;

    setUsername(nickname);
  }

  return isVisible && (
    <BlurCard>
      <form className="flex flex-col items-center gap-6 px-12 py-8" onSubmit={login}>
        <img
          src="/chad.png"
          alt="Chad Launcher"
          width={150}
          className="rounded-full border-white border-2 p-2"
          height={150}
        />
        <label htmlFor="nickname" className="flex flex-col">
          <span className="text-sm">Nombre de usuario</span>
          <input
            id="nickname"
            type="text"
            name="nickname"
            placeholder="Steve"
            className="outline-none bg-transparent border-b-2 text-xl p-2"
            required
            minLength={3}
            title="Nombre de usuario para jugar en los servidores de PhobosCraft"
          />
        </label>
        <button
          className="bg-white text-black py-2 px-5 rounded-full"
          type="submit"
        >
          Iniciar Sesion
        </button>
      </form>

    </BlurCard>
  )
}
