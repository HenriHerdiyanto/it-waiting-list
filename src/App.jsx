import { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });

  // Tambahkan is_priority di state form
  const [newReq, setNewReq] = useState({
    nama_orang_req: '',
    divisi: '',
    deskripsi: '',
    PIC: '',
    status: 'Waiting',
    urutan: 0,
    is_priority: false
  });
  
  const [editId, setEditId] = useState(null);

  const API_URL = 'https://6ae305fe933120ae20f80e32.mockapi.io/requests';

  useEffect(() => {
    const authStatus = localStorage.getItem('isAuth');
    if (authStatus === 'true') {
      setIsLoggedIn(true);
    }
    fetchData();
  }, []);

  // Fungsi pengurutan pusat: Sortir Prioritas (true) lebih dulu, lalu berdasarkan urutan angka
  const sortData = (data) => {
    return [...data].sort((a, b) => {
      if (a.is_priority === b.is_priority) {
        return a.urutan - b.urutan; // Jika status prioritas sama, urutkan berdasarkan posisinya
      }
      return a.is_priority ? -1 : 1; // Prioritas (true) selalu di atas
    });
  };

  const fetchData = () => {
    fetch(API_URL)
      .then((response) => response.json())
      .then((data) => {
        // Normalisasi data lama yang mungkin belum punya kolom is_priority
        const normalizedData = data.map((item, index) => ({
          ...item,
          urutan: item.urutan !== undefined ? item.urutan : (index + 1),
          is_priority: item.is_priority || false
        }));
        
        setRequests(sortData(normalizedData));
        setLoading(false);
      })
      .catch((error) => console.error('Error fetching data:', error));
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (loginForm.username === 'admin' && loginForm.password === 'admin123') {
      setIsLoggedIn(true);
      localStorage.setItem('isAuth', 'true');
      setShowLoginForm(false);
      setLoginForm({ username: '', password: '' });
    } else {
      alert('Username atau password salah!');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('isAuth');
    setEditId(null);
    resetForm();
  };

  const resetForm = () => {
    setNewReq({
      nama_orang_req: '', divisi: 'Finance', deskripsi: '', PIC: 'Belum ada', status: 'Waiting', urutan: 0, is_priority: false
    });
    setEditId(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editId) {
      fetch(`${API_URL}/${editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newReq),
      })
        .then((response) => response.json())
        .then((updatedData) => {
          const newData = requests.map(req => req.id === editId ? updatedData : req);
          setRequests(sortData(newData));
          resetForm();
          alert('Request berhasil diperbarui!');
        })
        .catch((error) => console.error('Error updating data:', error));
    } else {
      let maxUrutan = 0;
      if (requests.length > 0) {
        maxUrutan = Math.max(...requests.map(r => r.urutan));
      }
      const payload = { ...newReq, urutan: maxUrutan + 1 };

      fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
        .then((response) => response.json())
        .then((data) => {
          setRequests(sortData([...requests, data]));
          resetForm();
          alert('Request berhasil ditambahkan!');
        })
        .catch((error) => console.error('Error adding data:', error));
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('Yakin ingin menghapus request ini?')) {
      fetch(`${API_URL}/${id}`, { method: 'DELETE' })
        .then(() => setRequests(requests.filter(req => req.id !== id)))
        .catch((error) => console.error('Error deleting data:', error));
    }
  };

  const handleEditClick = (req) => {
    setNewReq({ ...req }); // Masukkan semua data ke form, termasuk status prioritasnya
    setEditId(req.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // --- FUNGSI PRIORITAS & POSISI BARU --- //

  const togglePriority = (req) => {
    const updatedItem = { ...req, is_priority: !req.is_priority };
    const newRequests = requests.map(r => r.id === req.id ? updatedItem : r);
    
    setRequests(sortData(newRequests)); // UI langsung berubah
    
    fetch(`${API_URL}/${req.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedItem)
    }).catch(err => console.error(err));
  };

  const handleMoveUp = (index) => {
    const currentItem = requests[index];
    // Cari item di atasnya yang memiliki status prioritas SAMA (agar tidak tabrakan beda kasta)
    let prevIndex = -1;
    for (let i = index - 1; i >= 0; i--) {
      if (requests[i].is_priority === currentItem.is_priority) {
        prevIndex = i; break;
      }
    }
    
    if (prevIndex === -1) return; // Jika tidak ada, berarti sudah paling atas di golongannya

    const newRequests = [...requests];
    const currentCopy = { ...currentItem };
    const prevCopy = { ...newRequests[prevIndex] };

    // Tukar angka urutannya
    const tempUrutan = currentCopy.urutan;
    currentCopy.urutan = prevCopy.urutan;
    prevCopy.urutan = tempUrutan;

    newRequests[index] = currentCopy;
    newRequests[prevIndex] = prevCopy;
    setRequests(sortData(newRequests));

    Promise.all([
      fetch(`${API_URL}/${currentCopy.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(currentCopy) }),
      fetch(`${API_URL}/${prevCopy.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(prevCopy) })
    ]);
  };

  const handleMoveDown = (index) => {
    const currentItem = requests[index];
    let nextIndex = -1;
    for (let i = index + 1; i < requests.length; i++) {
      if (requests[i].is_priority === currentItem.is_priority) {
        nextIndex = i; break;
      }
    }
    
    if (nextIndex === -1) return;

    const newRequests = [...requests];
    const currentCopy = { ...currentItem };
    const nextCopy = { ...newRequests[nextIndex] };

    const tempUrutan = currentCopy.urutan;
    currentCopy.urutan = nextCopy.urutan;
    nextCopy.urutan = tempUrutan;

    newRequests[index] = currentCopy;
    newRequests[nextIndex] = nextCopy;
    setRequests(sortData(newRequests));

    Promise.all([
      fetch(`${API_URL}/${currentCopy.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(currentCopy) }),
      fetch(`${API_URL}/${nextCopy.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(nextCopy) })
    ]);
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'waiting': return 'status-waiting';
      case 'on proses': return 'status-proses';
      case 'done': return 'status-done';
      default: return '';
    }
  };

  return (
    <div className="container">
      <div className="header">
        <div>
          <h1>IT Request Waiting List</h1>
          <p>Daftar pantauan status perbaikan dan request IT</p>
        </div>
        <div>
          {isLoggedIn ? (
            <button onClick={handleLogout} className="btn btn-danger">Logout</button>
          ) : (
            <button onClick={() => setShowLoginForm(!showLoginForm)} className="btn btn-primary">
              {showLoginForm ? 'Batal' : 'Login Admin'}
            </button>
          )}
        </div>
      </div>

      {!isLoggedIn && showLoginForm && (
        <form onSubmit={handleLogin} className="card-form">
          <h3>Login Admin</h3>
          <input 
            type="text" 
            required
            value={loginForm.username}
            onChange={(e) => setLoginForm({...loginForm, username: e.target.value})}
          />
          <input 
            type="password" 
            required
            value={loginForm.password}
            onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
          />
          <button type="submit" className="btn btn-primary">Masuk</button>
        </form>
      )}

      {isLoggedIn && (
        <form onSubmit={handleSubmit} className="card-form bg-light">
          <h3>{editId ? '✏️ Edit Request' : '+ Tambah Request Baru'}</h3>
          <div className="form-group">
            <input 
              type="text" 
              placeholder="Nama Requester" 
              required
              value={newReq.nama_orang_req}
              onChange={(e) => setNewReq({...newReq, nama_orang_req: e.target.value})}
            />
            <select 
              value={newReq.divisi}
              onChange={(e) => setNewReq({...newReq, divisi: e.target.value})}
            >
              <option value="Vender">Vender</option>
              <option value="Barapoint">Barapoint</option>
              <option value="FMI">FMI</option>
              <option value="Aoshi">Aoshi</option>
              <option value="Station">Station</option>
            </select>
          </div>
          <input 
            type="text" 
            placeholder="Deskripsi Masalah" 
            required
            value={newReq.deskripsi}
            onChange={(e) => setNewReq({...newReq, deskripsi: e.target.value})}
          />
          <div className="form-group">
            <input 
              type="text" 
              placeholder="Nama PIC (Opsional)" 
              value={newReq.PIC}
              onChange={(e) => setNewReq({...newReq, PIC: e.target.value})}
            />
            <select 
              value={newReq.status}
              onChange={(e) => setNewReq({...newReq, status: e.target.value})}
            >
              <option value="Waiting">Waiting</option>
              <option value="On Proses">On Proses</option>
              <option value="Done">Done</option>
            </select>
          </div>
          
          {/* Pilihan Checklist Prioritas Khusus untuk Admin */}
          <div style={{ padding: '10px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input 
              type="checkbox" 
              id="is_priority"
              checked={newReq.is_priority}
              onChange={(e) => setNewReq({...newReq, is_priority: e.target.checked})}
              style={{ width: 'auto' }}
            />
            <label htmlFor="is_priority" style={{ fontWeight: 'bold', color: '#d39e00', cursor: 'pointer' }}>
              ⭐ Tandai sebagai Prioritas Utama (Jalur VIP)
            </label>
          </div>

          <div className="form-group">
            <button type="submit" className={`btn ${editId ? 'btn-warning' : 'btn-success'}`}>
              {editId ? 'Update Request' : 'Simpan Request'}
            </button>
            {editId && (
              <button type="button" className="btn btn-danger" onClick={resetForm}>
                Batal Edit
              </button>
            )}
          </div>
        </form>
      )}

      {loading ? (
        <p>Loading data...</p>
      ) : (
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>No</th>
                <th>Nama Requester</th>
                <th>Divisi</th>
                <th>Deskripsi</th>
                <th>PIC</th>
                <th>Status</th>
                {isLoggedIn && <th>Aksi Admin</th>}
              </tr>
            </thead>
            <tbody>
              {requests.map((req, index) => {
                // Mengecek apakah tombol Naik/Turun harus didisable
                const isFirstInGroup = index === 0 || requests[index - 1].is_priority !== req.is_priority;
                const isLastInGroup = index === requests.length - 1 || requests[index + 1].is_priority !== req.is_priority;

                return (
                  <tr key={req.id} className={req.is_priority ? 'row-priority' : ''}>
                    <td>{index + 1}</td>
                    <td>
                      {/* Bintang Muncul untuk semua orang jika status prioritas aktif */}
                      {req.is_priority && <span title="Prioritas VIP" style={{fontSize: '1.2em', marginRight: '5px'}}>⭐</span>}
                      {req.nama_orang_req}
                    </td>
                    <td>{req.divisi}</td>
                    <td>{req.deskripsi}</td>
                    <td>{req.PIC}</td>
                    <td>
                      <span className={`badge ${getStatusColor(req.status)}`}>
                        {req.status}
                      </span>
                    </td>
                    {isLoggedIn && (
                      <td style={{width: '200px'}}>
                        {/* Layout Kolom Aksi yang Jauh Lebih Rapi */}
                        <div className="admin-actions">
                          {/* Tombol Toggle Prioritas */}
                          <button 
                            onClick={() => togglePriority(req)} 
                            className={`btn-action btn-block ${req.is_priority ? 'btn-outline-dark' : 'btn-gold'}`}
                          >
                            {req.is_priority ? '❌ Hapus Top VIP' : '⭐ Jadikan Top VIP'}
                          </button>
                          
                          {/* Grup Tombol Posisi (Naik / Turun) */}
                          <div className="action-row">
                            <button onClick={() => handleMoveUp(index)} disabled={isFirstInGroup} className="btn-action btn-gray">🔼 Naik</button>
                            <button onClick={() => handleMoveDown(index)} disabled={isLastInGroup} className="btn-action btn-gray">🔽 Turun</button>
                          </div>

                          {/* Grup Tombol Data (Edit / Hapus) */}
                          <div className="action-row">
                            <button onClick={() => handleEditClick(req)} className="btn-action btn-edit">✏️ Edit</button>
                            <button onClick={() => handleDelete(req.id)} className="btn-action btn-del">🗑️ Hapus</button>
                          </div>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default App;