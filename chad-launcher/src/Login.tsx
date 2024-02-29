import { useNavigate } from "react-router-dom"
import { BlurCard } from "./components/Cards";
import { useEffect, useState } from "react";

export const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    window.electronAPI.getNickname().then(nickname => {
      if (nickname) {
        navigate('/home', { replace: true })
      } else {
        setLoading(false)
      }
    })


    window.electronAPI.onSaved(() => {
      navigate('/')
    })
  })

  const login = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    const nickname = formData.get('nickname') as string;

    console.log(nickname);
    window.electronAPI.saveNickname(nickname);
  }

  return loading
    ? <>Loading</>
    : (
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
