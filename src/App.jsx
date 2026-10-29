import { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });

  const [newReq, setNewReq] = useState({
    nama_orang_req: '', divisi: '', deskripsi: '', PIC: '', status: 'Waiting', urutan: 0, is_priority: false
  });
  
  const [editId, setEditId] = useState(null);

  // --- STATE UNTUK FILTER & PAGINATION ---
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDivisi, setFilterDivisi] = useState('Semua');
  const [filterStatus, setFilterStatus] = useState('Semua');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5; // Tampilkan 5 baris per halaman

  const API_URL = 'https://6ae305fe933120ae20f80e32.mockapi.io/requests';

  useEffect(() => {
    const authStatus = localStorage.getItem('isAuth');
    if (authStatus === 'true') {
      setIsLoggedIn(true);
    }
    fetchData();
  }, []);

  const sortData = (data) => {
    return [...data].sort((a, b) => {
      if (a.is_priority === b.is_priority) return a.urutan - b.urutan;
      return a.is_priority ? -1 : 1; 
    });
  };

  const fetchData = () => {
    fetch(API_URL)
      .then((response) => response.json())
      .then((data) => {
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
    setNewReq({ nama_orang_req: '', divisi: '', deskripsi: '', PIC: '', status: 'Waiting', urutan: 0, is_priority: false });
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
          setRequests(sortData(requests.map(req => req.id === editId ? updatedData : req)));
          resetForm();
          alert('Request diperbarui!');
        });
    } else {
      let maxUrutan = requests.length > 0 ? Math.max(...requests.map(r => r.urutan)) : 0;
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
          alert('Request ditambahkan!');
        });
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('Yakin ingin menghapus?')) {
      fetch(`${API_URL}/${id}`, { method: 'DELETE' })
        .then(() => setRequests(requests.filter(req => req.id !== id)));
    }
  };

  const handleEditClick = (req) => {
    setNewReq({ ...req });
    setEditId(req.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // --- LOGIKA POSISI MENGGUNAKAN ID (Lebih Aman untuk Pagination) ---
  const togglePriority = (req) => {
    const updatedItem = { ...req, is_priority: !req.is_priority };
    setRequests(sortData(requests.map(r => r.id === req.id ? updatedItem : r)));
    fetch(`${API_URL}/${req.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updatedItem) });
  };

  const handleMoveUp = (id) => {
    const index = requests.findIndex(r => r.id === id);
    let prevIndex = -1;
    for (let i = index - 1; i >= 0; i--) {
      if (requests[i].is_priority === requests[index].is_priority) { prevIndex = i; break; }
    }
    if (prevIndex === -1) return;

    const newRequests = [...requests];
    const tempUrutan = newRequests[index].urutan;
    newRequests[index].urutan = newRequests[prevIndex].urutan;
    newRequests[prevIndex].urutan = tempUrutan;

    setRequests(sortData(newRequests));
    Promise.all([
      fetch(`${API_URL}/${newRequests[index].id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newRequests[index]) }),
      fetch(`${API_URL}/${newRequests[prevIndex].id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newRequests[prevIndex]) })
    ]);
  };

  const handleMoveDown = (id) => {
    const index = requests.findIndex(r => r.id === id);
    let nextIndex = -1;
    for (let i = index + 1; i < requests.length; i++) {
      if (requests[i].is_priority === requests[index].is_priority) { nextIndex = i; break; }
    }
    if (nextIndex === -1) return;

    const newRequests = [...requests];
    const tempUrutan = newRequests[index].urutan;
    newRequests[index].urutan = newRequests[nextIndex].urutan;
    newRequests[nextIndex].urutan = tempUrutan;

    setRequests(sortData(newRequests));
    Promise.all([
      fetch(`${API_URL}/${newRequests[index].id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newRequests[index]) }),
      fetch(`${API_URL}/${newRequests[nextIndex].id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newRequests[nextIndex]) })
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

  // --- LOGIKA FILTER & PAGINATION EKSEKUSI ---
  const filteredRequests = requests.filter((req) => {
    const matchSearch = req.nama_orang_req.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        req.deskripsi.toLowerCase().includes(searchQuery.toLowerCase());
    const matchDivisi = filterDivisi === 'Semua' || req.divisi === filterDivisi;
    const matchStatus = filterStatus === 'Semua' || req.status === filterStatus;
    return matchSearch && matchDivisi && matchStatus;
  });

  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  // Ini data yang siap dirender di halaman yang sedang aktif
  const currentItems = filteredRequests.slice(startIndex, startIndex + itemsPerPage);

  // Jika data difilter/dihapus dan halamannya kosong, paksa mundur 1 halaman
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) setCurrentPage(totalPages);
  }, [filteredRequests.length, currentPage, totalPages]);

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
          <input type="text" placeholder="Username (admin)" required value={loginForm.username} onChange={(e) => setLoginForm({...loginForm, username: e.target.value})} />
          <input type="password" placeholder="Password (admin123)" required value={loginForm.password} onChange={(e) => setLoginForm({...loginForm, password: e.target.value})} />
          <button type="submit" className="btn btn-primary">Masuk</button>
        </form>
      )}

      {isLoggedIn && (
        <form onSubmit={handleSubmit} className="card-form bg-light">
          <h3>{editId ? '✏️ Edit Request' : '+ Tambah Request Baru'}</h3>
          <div className="form-group">
            <input type="text" placeholder="Nama Requester" required value={newReq.nama_orang_req} onChange={(e) => setNewReq({...newReq, nama_orang_req: e.target.value})} />
            <select value={newReq.divisi} onChange={(e) => setNewReq({...newReq, divisi: e.target.value})}>
              <option value="Rapspoint">Rapspoint</option>
              <option value="Vender">Vender</option>
              <option value="Barapoint">Barapoint</option>
              <option value="FMI">FMI</option>
              <option value="Aoshi">Aoshi</option>
              <option value="Station">Station</option>
            </select>
          </div>
          <textarea 
            className='form-control'
            placeholder="Deskripsi Masalah" 
            required 
            value={newReq.deskripsi} 
            onChange={(e) => setNewReq({...newReq, deskripsi: e.target.value})} 
          />
          <div className="form-group">
            <input type="text" placeholder="Nama PIC (Opsional)" value={newReq.PIC} onChange={(e) => setNewReq({...newReq, PIC: e.target.value})} />
            <select value={newReq.status} onChange={(e) => setNewReq({...newReq, status: e.target.value})}>
              <option value="Waiting">Waiting</option>
              <option value="On Proses">On Proses</option>
              <option value="Done">Done</option>
            </select>
          </div>
          <div style={{ padding: '10px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input type="checkbox" id="is_priority" checked={newReq.is_priority} onChange={(e) => setNewReq({...newReq, is_priority: e.target.checked})} style={{ width: 'auto' }} />
            <label htmlFor="is_priority" style={{ fontWeight: 'bold', color: '#d39e00', cursor: 'pointer' }}>⭐ Tandai sebagai Prioritas Utama (Jalur VIP)</label>
          </div>
          <div className="form-group">
            <button type="submit" className={`btn ${editId ? 'btn-warning' : 'btn-success'}`}>
              {editId ? 'Update Request' : 'Simpan Request'}
            </button>
            {editId && <button type="button" className="btn btn-danger" onClick={resetForm}>Batal Edit</button>}
          </div>
        </form>
      )}

      {/* FITUR BARU: PANEL PENCARIAN & FILTER */}
      <div className="filter-panel">
      <input 
          placeholder="🔍 Cari nama atau deskripsi..." 
          value={searchQuery}
          onChange={(e) => { 
            setSearchQuery(e.target.value); 
            setCurrentPage(1); 
          }}
          className="search-input"
        />

        <div className="filter-dropdowns">
          <select value={filterDivisi} onChange={(e) => { setFilterDivisi(e.target.value); setCurrentPage(1); }}>
              <option value="Rapspoint">Rapspoint</option>
              <option value="Vender">Vender</option>
              <option value="Barapoint">Barapoint</option>
              <option value="FMI">FMI</option>
              <option value="Aoshi">Aoshi</option>
              <option value="Station">Station</option>
          </select>
          <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}>
            <option value="Semua">Semua Status</option>
            <option value="Waiting">Waiting</option>
            <option value="On Proses">On Proses</option>
            <option value="Done">Done</option>
          </select>
        </div>
      </div>

      {loading ? (
        <p>Loading data...</p>
      ) : (
        <>
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '5%' }}>No</th>
                  <th style={{ width: '20%' }}>Nama ( Divisi )</th>
                  <th style={{ width: '40%' }}>Deskripsi</th>
                  <th style={{ width: '15%' }}>PIC</th>
                  <th style={{ width: '10%' }}>Status</th>
                  {isLoggedIn && <th style={{ width: '10%' }}>Aksi Admin</th>}
                </tr>
              </thead>
              <tbody>
                {currentItems.length > 0 ? currentItems.map((req, i) => {
                  // Hitung penomoran asli berdasarkan halaman
                  const globalNumbering = startIndex + i + 1;
                  // Cari index aslinya di array `requests` utama untuk logika disabled tombol
                  const realIndex = requests.findIndex(r => r.id === req.id);
                  const isFirstInGroup = realIndex === 0 || requests[realIndex - 1].is_priority !== req.is_priority;
                  const isLastInGroup = realIndex === requests.length - 1 || requests[realIndex + 1].is_priority !== req.is_priority;

                  return (
                    <tr key={req.id} className={req.is_priority ? 'row-priority' : ''}>
                      <td>{globalNumbering}</td>
                      <td>
                        {req.is_priority && <span title="Prioritas VIP" style={{fontSize: '1.2em', marginRight: '5px'}}>⭐</span>}
                        {req.nama_orang_req} <br />
                        ( {req.divisi} )
                      </td>
                      <td>{req.deskripsi}</td>
                      <td>{req.PIC}</td>
                      <td><span className={`badge ${getStatusColor(req.status)}`}>{req.status}</span></td>
                      {isLoggedIn && (
                        <td style={{width: '200px'}}>
                          <div className="admin-actions">
                            <button onClick={() => togglePriority(req)} className={`btn-action btn-block ${req.is_priority ? 'btn-outline-dark' : 'btn-gold'}`}>
                              {req.is_priority ? '❌ Hapus Top VIP' : '⭐ Jadikan Top VIP'}
                            </button>
                            <div className="action-row">
                              <button onClick={() => handleMoveUp(req.id)} disabled={isFirstInGroup || searchQuery !== '' || filterDivisi !== 'Semua' || filterStatus !== 'Semua'} className="btn-action btn-gray">🔼 Naik</button>
                              <button onClick={() => handleMoveDown(req.id)} disabled={isLastInGroup || searchQuery !== '' || filterDivisi !== 'Semua' || filterStatus !== 'Semua'} className="btn-action btn-gray">🔽 Turun</button>
                            </div>
                            <div className="action-row">
                              <button onClick={() => handleEditClick(req)} className="btn-action btn-edit">✏️ Edit</button>
                              <button onClick={() => handleDelete(req.id)} className="btn-action btn-del">🗑️ Hapus</button>
                            </div>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                }) : (
                  <tr><td colSpan={isLoggedIn ? 7 : 6} style={{textAlign: 'center', padding: '30px'}}>Tidak ada data yang cocok dengan filter pencarian.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* FITUR BARU: KONTROL PAGINATION */}
          {totalPages > 1 && (
            <div className="pagination">
              <button 
                className="btn-page" 
                disabled={currentPage === 1} 
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                &laquo; Prev
              </button>
              <span className="page-info">
                Halaman <strong>{currentPage}</strong> dari {totalPages}
              </span>
              <button 
                className="btn-page" 
                disabled={currentPage === totalPages} 
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                Next &raquo;
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default App;