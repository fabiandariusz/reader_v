import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header       from '@/components/Header';
import LibraryPage  from '@/pages/LibraryPage';
import PlayerPage   from '@/pages/PlayerPage';
import SettingsPage from '@/pages/SettingsPage';

export default function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Header />
        <main className="main">
          <Routes>
            <Route path="/"            element={<LibraryPage />} />
            <Route path="/player/:id"  element={<PlayerPage />} />
            <Route path="/settings"    element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
