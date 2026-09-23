import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import App from "../App";
import { routes } from "./routes";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path={routes.login} element={<App />} />
        <Route path={routes.signup} element={<App />} />
        <Route path={`${routes.companySignup}/*`} element={<App />} />
        <Route path={`${routes.verification}/*`} element={<App />} />
        <Route path={`${routes.company}/*`} element={<App />} />
        <Route path={`${routes.catalog}/*`} element={<App />} />
        <Route path={`${routes.leaderboard}/*`} element={<App />} />
        <Route path={`${routes.practiced}/*`} element={<App />} />
        <Route path={`${routes.invitations}/*`} element={<App />} />
        <Route path={`${routes.profile}/*`} element={<App />} />
        <Route path={`${routes.instructions}/*`} element={<App />} />
        <Route path={`${routes.challenge}/*`} element={<App />} />
        <Route path="*" element={<Navigate to={routes.login} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
