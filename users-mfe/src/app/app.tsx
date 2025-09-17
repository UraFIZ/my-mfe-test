import { useState } from 'react';
import './app.css';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

export function App() {
  const [users, setUsers] = useState<User[]>([
    { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Admin' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'User' },
    { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'Manager' },
  ]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'User' });

  const handleAddUser = () => {
    if (newUser.name && newUser.email) {
      setUsers([...users, { ...newUser, id: users.length + 1 }]);
      setNewUser({ name: '', email: '', role: 'User' });
      setShowAddForm(false);
    }
  };

  const handleDeleteUser = (id: number) => {
    setUsers(users.filter(user => user.id !== id));
  };

  return (
    <div className="users-mfe">
      <div className="mfe-header">
        <h1>👥 Users Management</h1>
        <p>Manage users, profiles, and authentication</p>
      </div>

      <div className="users-actions">
        <button
          className="btn-add"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? '✕ Cancel' : '➕ Add New User'}
        </button>
      </div>

      {showAddForm && (
        <div className="add-user-form">
          <h3>Add New User</h3>
          <div className="form-group">
            <label>Name:</label>
            <input
              type="text"
              value={newUser.name}
              onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              placeholder="Enter name"
            />
          </div>
          <div className="form-group">
            <label>Email:</label>
            <input
              type="email"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              placeholder="Enter email"
            />
          </div>
          <div className="form-group">
            <label>Role:</label>
            <select
              value={newUser.role}
              onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
            >
              <option value="User">User</option>
              <option value="Admin">Admin</option>
              <option value="Manager">Manager</option>
            </select>
          </div>
          <button className="btn-submit" onClick={handleAddUser}>
            Add User
          </button>
        </div>
      )}

      <div className="users-grid">
        {users.map(user => (
          <div key={user.id} className="user-card">
            <div className="user-avatar">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="user-info">
              <h3>{user.name}</h3>
              <p className="user-email">{user.email}</p>
              <span className="user-role">{user.role}</span>
            </div>
            <button
              className="btn-delete"
              onClick={() => handleDeleteUser(user.id)}
            >
              🗑️
            </button>
          </div>
        ))}
      </div>

      <div className="mfe-info">
        <p>📍 This is the Users MFE running on port 4201</p>
      </div>
    </div>
  );
}

export default App;
