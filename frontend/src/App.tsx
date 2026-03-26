import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from '@/components/Header';
import LibraryPage from '@/pages/LibraryPage';
import PlayerPage from '@/pages/PlayerPage';

export default function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Header />
        <main className="main">
          <Routes>
            <Route path="/" element={<LibraryPage />} />
            <Route path="/player/:id" element={<PlayerPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
