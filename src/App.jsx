import { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });

  // State untuk Form Tambah/Edit
  const [newReq, setNewReq] = useState({
    nama_orang_req: '',
    divisi: 'Finance',
    deskripsi: '',
    PIC: '',
    status: 'Waiting'
  });
  
  // State untuk melacak data mana yang sedang di-edit
  const [editId, setEditId] = useState(null);

  const API_URL = 'https://6ae305fe933120ae20f80e32.mockapi.io/requests';

  useEffect(() => {
    const authStatus = localStorage.getItem('isAuth');
    if (authStatus === 'true') {
      setIsLoggedIn(true);
    }
    fetchData();
  }, []);

  const fetchData = () => {
    fetch(API_URL)
      .then((response) => response.json())
      .then((data) => {
        setRequests(data);
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
      nama_orang_req: '', divisi: 'Finance', deskripsi: '', PIC: 'Belum ada', status: 'Waiting'
    });
    setEditId(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (editId) {
      // Proses EDIT Data (PUT)
      fetch(`${API_URL}/${editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newReq),
      })
        .then((response) => response.json())
        .then((updatedData) => {
          setRequests(requests.map(req => req.id === editId ? updatedData : req));
          resetForm();
          alert('Request berhasil diperbarui!');
        })
        .catch((error) => console.error('Error updating data:', error));
    } else {
      // Proses TAMBAH Data (POST) - Biarkan json-server yang membuat ID-nya
      fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newReq),
      })
        .then((response) => response.json())
        .then((data) => {
          setRequests([...requests, data]);
          resetForm();
          alert('Request berhasil ditambahkan!');
        })
        .catch((error) => console.error('Error adding data:', error));
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('Yakin ingin menghapus request ini?')) {
      fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
      })
        .then(() => {
          setRequests(requests.filter(req => req.id !== id));
        })
        .catch((error) => console.error('Error deleting data:', error));
    }
  };

  // DIPERBAIKI: Memastikan semua properti dari baris yang diklik masuk ke state form
  const handleEditClick = (req) => {
    setNewReq({
      nama_orang_req: req.nama_orang_req,
      divisi: req.divisi,
      deskripsi: req.deskripsi,
      PIC: req.PIC,
      status: req.status
    });
    setEditId(req.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // DIPERBAIKI: Menyesuaikan class CSS dengan warna yang diminta
  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'waiting': return 'status-waiting'; // Kuning
      case 'on proses': return 'status-proses'; // Biru
      case 'done': return 'status-done'; // Hijau
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
            placeholder="Username (admin)" 
            required
            value={loginForm.username}
            onChange={(e) => setLoginForm({...loginForm, username: e.target.value})}
          />
          <input 
            type="password" 
            placeholder="Password (admin123)" 
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
                <th>ID</th>
                <th>Nama ( Divisi )</th>
                <th>Deskripsi</th>
                <th>PIC</th>
                <th>Status</th>
                {isLoggedIn && <th>Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req.id}>
                  <td>{req.id}</td>
                  <td>{req.nama_orang_req} | {req.divisi}</td>
                  <td>{req.deskripsi}</td>
                  <td>{req.PIC}</td>
                  <td>
                    <span className={`badge ${getStatusColor(req.status)}`}>
                      {req.status}
                    </span>
                  </td>
                  {isLoggedIn && (
                    <td>
                      <div className="action-buttons">
                        <button onClick={() => handleEditClick(req)} className="btn btn-sm btn-warning">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-pencil-square" viewBox="0 0 16 16">
                            <path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/>
                            <path fillRule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5z"/>
                          </svg>
                        </button>
                        <button onClick={() => handleDelete(req.id)} className="btn btn-sm btn-danger">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-trash" viewBox="0 0 16 16">
                            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5Zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5Zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6Z"/>
                            <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1ZM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118ZM2.5 3h11V2h-11Z"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default App;