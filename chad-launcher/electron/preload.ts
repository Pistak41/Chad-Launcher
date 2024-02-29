import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld("electronAPI", {
  saveNickname: (nickname: string) => ipcRenderer.send('save-nickname', nickname),
  onSaved: (callback: () => void) => ipcRenderer.on('nickname-saved', callback),
  getNickname: () => {
    ipcRenderer.send('get-nickname')
    return new Promise<string>((resolve) => {
      ipcRenderer.once('nickname', (_, nickname) => {
        console.log('nickname recuperado', nickname);
        
        resolve(nickname)
      })
    })
  },
});