import { Navigate, Route, Routes } from 'react-router-dom';
import { Account } from './pages/account';
import { Auth } from './pages/auth';
import { Dashboard } from './pages/dashboard';
import { Home } from './pages/home';
import { NotFound } from './pages/not-found';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/auth/:pathname?" element={<Auth />} />
      <Route path="/reset-password" element={<Navigate to="/auth/reset-password" replace />} />
      <Route path="/account/:pathname?" element={<Account />} />
      <Route path="/dashboard/*" element={<Dashboard />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
