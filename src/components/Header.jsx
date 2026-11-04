import { Link } from 'react-router-dom';

export default function Header({ isLoggedIn = false }) {
  return (
    <header className="app-header">
      <div>
        <h1>IT Request Waiting List</h1>
        <p>Daftar pantauan status perbaikan dan request IT</p>
      </div>

      <div className="header-actions">
        {isLoggedIn ? (
          <Link to="/dashboard" className="btn btn-primary">
            Buka Dashboard
          </Link>
        ) : (
          <Link to="/login" className="btn btn-primary">
            Login Admin
          </Link>
        )}
      </div>
    </header>
  );
}
