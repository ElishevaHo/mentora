import { Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import { Layout } from './components/Layout.jsx';
import { RequireAuth } from './components/RequireAuth.jsx';
import { Loading } from './components/Feedback.jsx';
import HomePage from './pages/HomePage.jsx';
import ExplorePage from './pages/ExplorePage.jsx';
import TutorPage from './pages/TutorPage.jsx';
import { LoginPage, RegisterPage } from './pages/AuthPages.jsx';
import LessonsPage from './pages/LessonsPage.jsx';
import InboxPage from './pages/InboxPage.jsx';
import StudioPage from './pages/StudioPage.jsx';
import AccountPage from './pages/AccountPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import AboutPage from './pages/AboutPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

export default function App() {
  const { ready } = useAuth();
  if (!ready) return <Loading label="מתחברים…" />;

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="tutors" element={<ExplorePage />} />
        <Route path="tutors/:id" element={<TutorPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="about" element={<AboutPage />} />

        <Route element={<RequireAuth />}>
          <Route path="lessons" element={<LessonsPage />} />
          <Route path="inbox" element={<InboxPage />} />
          <Route path="inbox/:userId" element={<InboxPage />} />
          <Route path="account" element={<AccountPage />} />
        </Route>
        <Route element={<RequireAuth roles={['tutor']} />}>
          <Route path="studio" element={<StudioPage />} />
        </Route>
        <Route element={<RequireAuth roles={['admin']} />}>
          <Route path="admin" element={<AdminPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
