import { NavLink } from 'react-router-dom';

export default function Header() {
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
      </nav>
    </header>
  );
}
