import { useEffect, useState } from "react"
import { ServerStatusResponse } from "../vite-env"
const serverURL = "186.23.132.187:7777"

export const ServerStatus = () => {

    const [status, setStatus] = useState('')

    useEffect(() => {
        fetch(`https://api.mcsrvstat.us/3/${serverURL}`, { cache: "reload" })
            .then(response => response.json())
            .then((data: ServerStatusResponse) => {
                if (data.online) {
                    setStatus(data.players.online + "/" + data.players.max)
                }
            })
    }, [])

    return (
        <div className="flex gap-3 items-center">
            <span className={`w-4 h-4 ${!status ? 'bg-red-400' : 'bg-green-400'} rounded-full`}></span>

            <p className="text-xl font-semibold text-white">{status || 'Ofline'}</p>
        </div>
    )
}