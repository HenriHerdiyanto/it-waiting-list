import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToastContext } from '../contexts/ToastContext';

function safeNext(value) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return '/dashboard';
  }
  return value;
}

export default function LoginPage() {
  const { isLoggedIn, login } = useAuth();
  const { notify } = useToastContext();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = safeNext(searchParams.get('next'));

  const [form, setForm] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);

  if (isLoggedIn) return <Navigate to={next} replace />;

  const handleSubmit = (event) => {
    event.preventDefault();

    if (login(form.username, form.password)) {
      notify('Berhasil login sebagai admin.');
      navigate(next, { replace: true });
    } else {
      notify('Username atau password salah.', 'error');
    }
  };

  return (
    <div className="login-page">
      <section className="login-brand">
        <div className="login-brand-inner">
          <span className="login-logo">IT</span>
          <h1>
            Waiting List
            <br />
            IT Support
          </h1>
          <p>
            Satu tempat untuk mencatat, menjadwalkan, dan memantau seluruh
            request perbaikan IT dari setiap divisi.
          </p>

          <ul className="login-features">
            <li>📊 Dashboard statistik real-time</li>
            <li>🗂️ Kelola request & roadmap dalam satu panel</li>
            <li>👥 Master PIC programmer dan kepala divisi</li>
          </ul>
        </div>

        <span className="login-brand-orb orb-one" aria-hidden="true" />
        <span className="login-brand-orb orb-two" aria-hidden="true" />
      </section>

      <section className="login-panel">
        <form className="login-card" onSubmit={handleSubmit}>
          <div className="login-card-head">
            <span className="login-badge">Admin Area</span>
            <h2>Masuk ke Dashboard</h2>
            <p>Gunakan akun admin untuk mengelola waiting list IT.</p>
          </div>

          <label className="field">
            <span>Username</span>
            <input
              type="text"
              autoComplete="username"
              placeholder="Masukkan username"
              required
              value={form.username}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  username: event.target.value,
                }))
              }
            />
          </label>

          <label className="field">
            <span>Password</span>
            <div className="password-field">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Masukkan password"
                required
                value={form.password}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    password: event.target.value,
                  }))
                }
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((previous) => !previous)}
              >
                {showPassword ? 'Sembunyikan' : 'Lihat'}
              </button>
            </div>
          </label>

          <button type="submit" className="btn btn-primary btn-block">
            Masuk
          </button>

          <p className="hint login-hint">
            Kredensial dapat diubah lewat variabel <code>VITE_ADMIN_USER</code>{' '}
            dan <code>VITE_ADMIN_PASS</code>.
          </p>

          <Link to="/" className="login-back">
            ← Kembali ke halaman publik
          </Link>
        </form>
      </section>
    </div>
  );
}
