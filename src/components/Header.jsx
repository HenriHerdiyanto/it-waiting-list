export default function Header({ isLoggedIn, showLoginForm, onToggleLogin, onLogout }) {
  return (
    <header className="app-header">
      <div>
        <h1>IT Request Waiting List</h1>
        <p>Daftar pantauan status perbaikan dan request IT</p>
      </div>

      <div className="header-actions">
        {isLoggedIn ? (
          <button type="button" onClick={onLogout} className="btn btn-danger">
            Logout
          </button>
        ) : (
          <button type="button" onClick={onToggleLogin} className="btn btn-primary">
            {showLoginForm ? 'Batal' : 'Login Admin'}
          </button>
        )}
      </div>
    </header>
  );
}
