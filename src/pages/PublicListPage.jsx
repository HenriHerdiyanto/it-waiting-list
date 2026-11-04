import Header from '../components/Header';
import RequestsExplorer from '../components/RequestsExplorer';
import { useAuth } from '../contexts/AuthContext';

export default function PublicListPage() {
  const { isLoggedIn } = useAuth();

  return (
    <div className="container public-page">
      <Header isLoggedIn={isLoggedIn} />

      <p className="public-hint">
        💡 Klik baris request untuk melihat detail jadwal, roadmap, dan riwayat
        keterangan. Halaman ini hanya untuk melihat; pengelolaan data dilakukan
        oleh admin.
      </p>

      <RequestsExplorer />
    </div>
  );
}
