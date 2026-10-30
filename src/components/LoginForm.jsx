export default function LoginForm({ form, onChange, onSubmit, onCancel }) {
  return (
    <form onSubmit={onSubmit} className="card-form login-form">
      <h3>Login Admin</h3>

      <div className="form-grid">
        <label className="field">
          <span>Username</span>
          <input
            type="text"
            autoComplete="username"
            placeholder="Masukkan username"
            required
            value={form.username}
            onChange={(event) => onChange('username', event.target.value)}
          />
        </label>

        <label className="field">
          <span>Password</span>
          <input
            type="password"
            autoComplete="current-password"
            placeholder="Masukkan password"
            required
            value={form.password}
            onChange={(event) => onChange('password', event.target.value)}
          />
        </label>
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary">
          Masuk
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Batal
        </button>
      </div>

      <p className="hint">Kredensial admin dapat diubah lewat variabel VITE_ADMIN_USER / VITE_ADMIN_PASS.</p>
    </form>
  );
}
