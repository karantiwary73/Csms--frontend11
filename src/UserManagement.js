import React, { useState, useEffect } from 'react';
import './UserManagement.css';
import { buildApiUrl, API_ENDPOINTS } from './api';
import { getUnitName, getAllUnits } from './unitUtils';
import { getApiErrorMessage } from './errorUtils';

const UserManagement = ({ user, token }) => {
  const [users, setUsers] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalUsers: 0
  });

  // Form state
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    name: '',
    role: 'WORKER',
    status: 'active',
    mobile: '',
    unitId: ''
  });

  // Initialize form data based on user role
  useEffect(() => {
    if (user.role === 'OPERATOR' && user.unitId) {
      setFormData(prev => ({
        ...prev,
        unitId: user.unitId
      }));
    }
  }, [user]);

  useEffect(() => {
    fetchUsers();
    fetchUnits();
  }, [pagination.currentPage]);

  const fetchUnits = async () => {
    // Use the utility function to get properly formatted units
    const businessUnits = getAllUnits();
    setUnits(businessUnits);
  };

  const fetchUsers = async (page = 1) => {
    try {
      setLoading(true);
      const response = await fetch(`${buildApiUrl(API_ENDPOINTS.USERS)}?page=${page}&limit=10`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok) {
        setUsers(data.users);
        setPagination(data.pagination);
        setError('');
      } else {
        setError(getApiErrorMessage(data, 'Failed to fetch users'));
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    
    // Validate password is provided
    if (!formData.password || formData.password.length < 8) {
      setError('Password is required and must be at least 8 characters long');
      return;
    }
    
    try {
      // Prepare form data - ensure unitId is properly set for OPERATOR users
      const submitData = { ...formData };
      
      // For OPERATOR users, ensure unitId is set to their unit
      if (user.role === 'OPERATOR' && user.unitId) {
        submitData.unitId = user.unitId;
      }
      
      // Remove empty unitId if not set
      if (!submitData.unitId) {
        delete submitData.unitId;
      }

      console.log('Submitting user data:', submitData); // Debug log

      const response = await fetch(buildApiUrl(API_ENDPOINTS.USERS), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submitData)
      });

      const data = await response.json();

      if (response.ok) {
        setShowCreateForm(false);
        resetForm();
        fetchUsers();
        setError(''); // Clear any previous errors
      } else {
        console.error('User creation failed:', data); // Debug log
        setError(getApiErrorMessage(data, 'Failed to create user'));
      }
    } catch (err) {
      console.error('Network error:', err); // Debug log
      setError('Network error. Please try again.');
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      const updateData = { ...formData };
      delete updateData.password; // Don't send password in updates

      const response = await fetch(`${buildApiUrl(API_ENDPOINTS.USERS)}/${editingUser._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      const data = await response.json();

      if (response.ok) {
        setEditingUser(null);
        resetForm();
        fetchUsers();
      } else {
        setError(getApiErrorMessage(data, 'Failed to update user'));
      }
    } catch (err) {
      setError('Network error. Please try again.');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      // Use POST instead of DELETE as a workaround
      const response = await fetch(`${buildApiUrl(API_ENDPOINTS.ORGANIZATION)}/delete-user/${userId}`, {
        method: 'POST', // Using POST instead of DELETE
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        fetchUsers();
        setError(''); // Clear any previous errors
      } else {
        const data = await response.json();
        console.error('Delete failed:', data);
        setError(getApiErrorMessage(data, 'Failed to delete user'));
      }
    } catch (err) {
      console.error('Network error during delete:', err);
      setError('Network error. Please try again.');
    }
  };

  const startEdit = (userToEdit) => {
    setEditingUser(userToEdit);
    setFormData({
      username: userToEdit.username,
      email: userToEdit.email,
      password: '',
      name: userToEdit.name,
      role: userToEdit.role,
      status: userToEdit.status,
      mobile: userToEdit.mobile || '',
      unitId: userToEdit.unitId || ''
    });
    setShowCreateForm(true);
  };

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      password: '',
      name: '',
      role: 'WORKER',
      status: 'active',
      mobile: '',
      unitId: user.role === 'OPERATOR' ? user.unitId || '' : '' // Auto-assign unit for OPERATOR
    });
    setEditingUser(null);
    setShowCreateForm(false);
  };

  const canManageUser = (targetUser) => {
    if (user.role === 'ADMIN') return true;
    if (user.role === 'OPERATOR') {
      // Both users must have unitId and they must match (convert to string for comparison)
      return user.unitId && targetUser.unitId && 
             user.unitId.toString() === targetUser.unitId.toString();
    }
    return false;
  };

  return (
    <div className="user-management">
      <div className="section-header">
        <h2>User Management</h2>
        {(user.role === 'ADMIN' || user.role === 'OPERATOR') && (
          <button 
            className="create-btn"
            onClick={() => setShowCreateForm(true)}
          >
            Create User
          </button>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Create/Edit Form */}
      {showCreateForm && (
        <div className="form-overlay">
          <div className="form-container">
            <h3>{editingUser ? 'Edit User' : 'Create New User'}</h3>
            <form onSubmit={editingUser ? handleUpdateUser : handleCreateUser}>
              <div className="form-row">
                <div className="form-group">
                  <label>Username</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    required
                  />
                </div>
              </div>

              {!editingUser && (
                <div className="form-group">
                  <label>Password</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    placeholder="Minimum 8 characters"
                    required
                  />
                </div>
              )}

              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                  >
                    <option value="WORKER">WORKER</option>
                    {user.role === 'ADMIN' && <option value="OPERATOR">OPERATOR</option>}
                    {user.role === 'ADMIN' && <option value="ADMIN">ADMIN</option>}
                  </select>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Mobile (Optional)</label>
                <input
                  type="text"
                  value={formData.mobile}
                  onChange={(e) => setFormData({...formData, mobile: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label>Unit Assignment</label>
                <select
                  value={formData.unitId}
                  onChange={(e) => setFormData({...formData, unitId: e.target.value})}
                  disabled={user.role === 'OPERATOR'} // OPERATOR can only create users in their own unit
                >
                  <option value="">No Unit Assigned</option>
                  {units.map(unit => (
                    <option key={unit._id} value={unit._id}>
                      {unit.name}
                    </option>
                  ))}
                </select>
                <small className="form-help">
                  {user.role === 'ADMIN' ? 'ADMIN users can assign users to Unit 1 or Unit 2' : 
                   user.role === 'OPERATOR' ? `OPERATOR can only create users in ${getUnitName(user.unitId)}` :
                   'WORKER can only view their assigned unit data'}
                </small>
              </div>

              <div className="form-actions">
                <button type="button" onClick={resetForm}>Cancel</button>
                <button type="submit">{editingUser ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="users-table">
        {loading ? (
          <div className="loading">Loading users...</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Unit</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(userItem => (
                <tr key={userItem._id}>
                  <td>{userItem.name}</td>
                  <td>{userItem.email}</td>
                  <td>{userItem.role}</td>
                  <td>
                    <span className={`status ${userItem.status}`}>
                      {userItem.status}
                    </span>
                  </td>
                  <td>
                    <span className={`unit-badge ${userItem.unitId ? 'assigned' : 'unassigned'}`}>
                      {getUnitName(userItem.unitId)}
                    </span>
                  </td>
                  <td>
                    {canManageUser(userItem) && (
                      <div className="actions">
                        <button 
                          className="edit-btn"
                          onClick={() => startEdit(userItem)}
                        >
                          Edit
                        </button>
                        {/* ADMIN can delete anyone, OPERATOR can delete WORKER users in their unit */}
                        {(user.role === 'ADMIN' || 
                          (user.role === 'OPERATOR' && userItem.role === 'WORKER')) && (
                          <button 
                            className="delete-btn"
                            onClick={() => handleDeleteUser(userItem._id)}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="pagination">
          <button 
            disabled={!pagination.hasPrevPage}
            onClick={() => fetchUsers(pagination.currentPage - 1)}
          >
            Previous
          </button>
          <span>
            Page {pagination.currentPage} of {pagination.totalPages}
          </span>
          <button 
            disabled={!pagination.hasNextPage}
            onClick={() => fetchUsers(pagination.currentPage + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default UserManagement;