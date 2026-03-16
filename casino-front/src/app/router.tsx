import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "../components/layout/AppLayout";
import { BlackjackPage } from "../pages/BlackjackPage";
import { CasinoLobbyPage } from "../pages/CasinoLobbyPage";
import { LoginPage } from "../pages/LoginPage";
import { ProfilePage } from "../pages/ProfilePage";
import { RegisterPage } from "../pages/RegisterPage";
import { RoulettePage } from "../pages/RoulettePage";
import { SlotsPage } from "../pages/SlotsPage";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/register",
    element: <RegisterPage />,
  },
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <CasinoLobbyPage /> },
      { path: "slots", element: <SlotsPage /> },
      { path: "roulette", element: <RoulettePage /> },
      { path: "blackjack", element: <BlackjackPage /> },
      { path: "profile", element: <ProfilePage /> },
    ],
  },
]);