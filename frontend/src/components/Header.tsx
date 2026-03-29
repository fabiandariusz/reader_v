import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

export default function Header() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (q) navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <header className="header">
      <span className="header__logo">Reader V</span>
      <nav className="header__nav">
        <NavLink
          to="/"
          end
          className={({ isActive }) => `header__nav-link${isActive ? ' active' : ''}`}
        >
          Library
        </NavLink>
        <NavLink
          to="/settings"
          className={({ isActive }) => `header__nav-link${isActive ? ' active' : ''}`}
        >
          Settings
        </NavLink>
      </nav>
      <form className="header__search" onSubmit={handleSearch}>
        <input
          className="header__search-input"
          type="search"
          placeholder="Search notes…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </form>
    </header>
  );
}
