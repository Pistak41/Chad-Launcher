import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App.tsx'
import './index.css'
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { Login } from './Login.tsx';

const router = createBrowserRouter([
  {
    path: "/",
    element: <Login />,
    errorElement: <div>Not Found</div>,
  },
  {
    path: "/home",
    element: <App />,
  }
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <main className="bg-cover min-h-screen grid place-items-center" style={{ backgroundImage: `url(/${Math.floor(Math.random() * 8)}.jpg)` }}>
      <RouterProvider router={router} />
    </main>
  </React.StrictMode>,
)
