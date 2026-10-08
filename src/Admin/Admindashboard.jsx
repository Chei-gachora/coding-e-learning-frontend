import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/codelearn_logo.jpg';
import { IoBookSharp } from "react-icons/io5";
import Sidebar from '../components/Sidebar';

export default function AdminDashboard() {
  const { user, logout, switchRole } = useAuth();
  const navigate = useNavigate();

  // User Management State
  const [usersList, setUsersList] = useState(() => {
    const saved = localStorage.getItem(`codelearn_admin_users_${user?.id}`);
    return saved ? JSON.parse(saved) : [
      { id: 1, name: 'Alex Johnson', email: 'student@codelearn.com', role: 'student', status: 'Active', joined: 'Jan 2026' },
      { id: 2, name: 'Dr. Sarah hadasa', email: 'instructor@codelearn.com', role: 'instructor', status: 'Active', joined: 'Feb 2026' },
      { id: 3, name: 'System Administrator', email: 'admin@codelearn.com', role: 'admin', status: 'Active', joined: 'Dec 2025' },
      { id: 4, name: 'Brian Mwangi', email: 'brian@student.com', role: 'student', status: 'Active', joined: 'Mar 2026' },
      { id: 5, name: 'Prof Dennis Muli', email: 'david@instructor.com', role: 'instructor', status: 'Active', joined: 'Feb 2026' },
      { id: 6, name: 'Ann Wanjiku', email: 'ann@student.com', role: 'student', status: 'Active', joined: 'Apr 2026' }
    ];
  });

  const [filterRole, setFilterRole] = useState('all');
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showCoursesModal, setShowCoursesModal] = useState(false);

  // New user form state
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState('student');

  // Platform settings state
  const [maintenanceMode, setMaintenanceMode] = useState(() => {
    return localStorage.getItem(`codelearn_admin_maint_${user?.id}`) === 'true';
  });
  const [allowRegistration, setAllowRegistration] = useState(() => {
    const saved = localStorage.getItem(`codelearn_admin_reg_${user?.id}`);
    return saved !== null ? saved === 'true' : true;
  });
  const [emailNotifications, setEmailNotifications] = useState(() => {
    const saved = localStorage.getItem(`codelearn_admin_email_${user?.id}`);
    return saved !== null ? saved === 'true' : true;
  });

  const [notification, setNotification] = useState('');

  // Sync state to localStorage
  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(`codelearn_admin_users_${user.id}`, JSON.stringify(usersList));
    }
  }, [usersList, user?.id]);

  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(`codelearn_admin_maint_${user.id}`, maintenanceMode);
      localStorage.setItem(`codelearn_admin_reg_${user.id}`, allowRegistration);
      localStorage.setItem(`codelearn_admin_email_${user.id}`, emailNotifications);
    }
  }, [maintenanceMode, allowRegistration, emailNotifications, user?.id]);

  const handleAddUser = (e) => {
    e.preventDefault();
    if (!newUserName || !newUserEmail) return;
    const newUser = {
      id: Date.now(),
      name: newUserName,
      email: newUserEmail,
      role: newUserRole,
      status: 'Active',
      joined: 'Just now'
    };
    setUsersList([...usersList, newUser]);
    setNewUserName('');
    setNewUserEmail('');
    showTempNotification(`New ${newUserRole} account created for ${newUserName}! 🎉`);
  };

  const handleChangeRole = (userId, newRole) => {
    setUsersList(usersList.map(u => u.id === userId ? { ...u, role: newRole } : u));
    showTempNotification(`User role updated to ${newRole}! 🔄`);
  };

  const handleDeleteUser = (userId) => {
    setUsersList(usersList.filter(u => u.id !== userId));
    showTempNotification('User account deleted from platform. 🗑️');
  };

  const showTempNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 4000);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const adminName = user?.name || 'System Admin';

  const filteredUsers = filterRole === 'all' ? usersList : usersList.filter(u => u.role === filterRole);

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="main-content" style={{ display: 'flex', flexDirection: 'column' }}>

      {notification && (
        <div style={{ background: '#10b981', color: '#fff', textAlign: 'center', padding: '10px', fontWeight: '600', fontSize: '14px' }}>
          {notification}
        </div>
      )}

      <main className="admin-page" style={{ minHeight: 'unset', padding: '0' }}>
        <div className="container" style={{ paddingTop: '0', maxWidth: '100%', padding: '0' }}>
          <div className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, #4c0519 0%, #1e293b 100%)', padding: '28px', borderRadius: '16px', border: '1px solid #9f1239', marginBottom: '28px' }}>
            <div>
              <span className="badge" style={{ background: 'rgba(244, 63, 94, 0.2)', color: '#fda4af', border: '1px solid rgba(244, 63, 94, 0.4)', marginBottom: '8px' }}>
                🛡️ ADMIN PORTAL
              </span>
              <h1 style={{ fontSize: '28px', marginTop: '6px', color: '#ffffff' }}>Administrator Dashboard</h1>
              <p style={{ color: '#94a3b8', marginTop: '4px' }}>
                Manage users, system configurations, course platform settings, and platform analytics.
              </p>
            </div>
            <button onClick={() => setShowUsersModal(true)} className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #f43f5e 0%, #be123c 100%)' }}>
              👥 Manage Users ({usersList.length})
            </button>
          </div>

          {/* STATISTICS */}
          <section className="admin-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '28px' }}>
            <div className="admin-stat card" style={{ padding: '20px' }}>
              <span style={{ color: '#94a3b8', fontSize: '13px' }}>Total Students</span>
              <strong style={{ display: 'block', fontSize: '26px', margin: '4px 0' }}>
                {usersList.filter(u => u.role === 'student').length * 40 + 200}
              </strong>
              <small style={{ color: '#34d399' }}>Registered students</small>
            </div>

            <div className="admin-stat card" style={{ padding: '20px' }}>
              <span style={{ color: '#94a3b8', fontSize: '13px' }}>Instructors</span>
              <strong style={{ display: 'block', fontSize: '26px', margin: '4px 0' }}>
                {usersList.filter(u => u.role === 'instructor').length * 6}
              </strong>
              <small style={{ color: '#60a5fa' }}>Active instructors</small>
            </div>

            <div className="admin-stat card" style={{ padding: '20px' }}>
              <span style={{ color: '#94a3b8', fontSize: '13px' }}>Courses</span>
              <strong style={{ display: 'block', fontSize: '26px', margin: '4px 0' }}>8</strong>
              <small style={{ color: '#c084fc' }}>Available courses</small>
            </div>

            <div className="admin-stat card" style={{ padding: '20px' }}>
              <span style={{ color: '#94a3b8', fontSize: '13px' }}>Enrollments</span>
              <strong style={{ display: 'block', fontSize: '26px', margin: '4px 0' }}>436</strong>
              <small style={{ color: '#fbbf24' }}>Total enrollments</small>
            </div>
          </section>

          {/* MANAGEMENT */}
          <section className="admin-section" style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', marginBottom: '16px' }}>Platform Management</h2>
            <div className="admin-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
              <div className="admin-card card" style={{ padding: '24px' }}>
                <div style={{ fontSize: '36px', marginBottom: '10px' }}>👥</div>
                <h3 style={{ fontSize: '18px' }}>User Management</h3>
                <p style={{ fontSize: '13px', color: '#94a3b8', margin: '8px 0 16px' }}>
                  View, create, edit roles, or deactivate students, instructors and admin accounts.
                </p>
                <button onClick={() => setShowUsersModal(true)} className="btn btn-primary" style={{ width: '100%', background: '#f43f5e' }}>
                  Manage Users &amp; Roles
                </button>
              </div>

              <div className="admin-card card" style={{ padding: '24px' }}>
                <div style={{ fontSize: '36px', marginBottom: '10px' }}><IoBookSharp /></div>
                <h3 style={{ fontSize: '18px' }}>Course Management</h3>
                <p style={{ fontSize: '13px', color: '#94a3b8', margin: '8px 0 16px' }}>
                  Review, approve, and organize published courses and learning modules.
                </p>
                <button onClick={() => setShowCoursesModal(true)} className="btn btn-outline" style={{ width: '100%' }}>
                  Manage Platform Courses
                </button>
              </div>

              <div className="admin-card card" style={{ padding: '24px' }}>
                <div style={{ fontSize: '36px', marginBottom: '10px' }}>⚙️</div>
                <h3 style={{ fontSize: '18px' }}>System Settings</h3>
                <p style={{ fontSize: '13px', color: '#94a3b8', margin: '8px 0 16px' }}>
                  Configure security, user registrations, maintenance mode &amp; platform preferences.
                </p>
                <button onClick={() => setShowSettingsModal(true)} className="btn btn-outline" style={{ width: '100%' }}>
                  Platform Settings
                </button>
              </div>
            </div>
          </section>

          {/* PLATFORM OVERVIEW */}
          <section className="admin-section" style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', marginBottom: '16px' }}>Platform Performance &amp; Analytics</h2>
            <div className="overview-card card" style={{ padding: '24px' }}>
              <div style={{ marginBottom: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <strong>Course Completion Rate</strong>
                  <strong style={{ color: '#34d399' }}>76%</strong>
                </div>
                <div style={{ height: '8px', background: '#1e293b', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: '76%', height: '100%', background: '#34d399' }}></div>
                </div>
              </div>

              <div style={{ marginBottom: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <strong>Active Student Participation</strong>
                  <strong style={{ color: '#60a5fa' }}>84%</strong>
                </div>
                <div style={{ height: '8px', background: '#1e293b', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: '84%', height: '100%', background: '#60a5fa' }}></div>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <strong>Assessment &amp; Quiz Success Rate</strong>
                  <strong style={{ color: '#c084fc' }}>68%</strong>
                </div>
                <div style={{ height: '8px', background: '#1e293b', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: '68%', height: '100%', background: '#c084fc' }}></div>
                </div>
              </div>
            </div>
          </section>

          {/* RECENT ACTIVITY */}
          <section className="admin-section" style={{ marginBottom: '32px' }}>
            <div className="admin-section-heading" style={{ marginBottom: '16px' }}>
              <h2 style={{ fontSize: '20px' }}>Recent Platform Activity</h2>
            </div>

            <div className="activity-card card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#34d399' }}></div>
                <div style={{ flex: 1 }}>
                  <strong>New student registration</strong>
                  <p style={{ fontSize: '13px', color: '#94a3b8' }}>Brian Mwangi registered a student account.</p>
                </div>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Today</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#60a5fa' }}></div>
                <div style={{ flex: 1 }}>
                  <strong>Course graded by instructor</strong>
                  <p style={{ fontSize: '13px', color: '#94a3b8' }}>Dr. Sarah Jenkins graded CSS Styling Challenge.</p>
                </div>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Today</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#fbbf24' }}></div>
                <div style={{ flex: 1 }}>
                  <strong>Lab submitted</strong>
                  <p style={{ fontSize: '13px', color: '#94a3b8' }}>Alex Johnson submitted Personal Profile Webpage.</p>
                </div>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Yesterday</span>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* USER MANAGEMENT MODAL */}
      {showUsersModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '850px', background: '#131c2e', padding: '28px', border: '1px solid #f43f5e', borderRadius: '16px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '22px' }}>👥 User Management &amp; Role Control</h2>
                <p style={{ fontSize: '13px', color: '#94a3b8' }}>Add new users, assign roles (Student, Instructor, Admin), or remove access.</p>
              </div>
              <button onClick={() => setShowUsersModal(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '22px', cursor: 'pointer' }}>✕</button>
            </div>

            {/* ADD USER FORM */}
            <form onSubmit={handleAddUser} style={{ background: '#090d16', padding: '16px', borderRadius: '12px', border: '1px solid #24344d', marginBottom: '20px' }}>
              <h4 style={{ fontSize: '14px', marginBottom: '12px', color: '#f43f5e' }}>+ Add New Platform User</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '12px', alignItems: 'end' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Full Name</label>
                  <input
                    type="text"
                    placeholder="Jane Doe"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    required
                    style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', color: '#fff', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Email Address</label>
                  <input
                    type="email"
                    placeholder="jane@codelearn.com"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    required
                    style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', color: '#fff', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Assign Role</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value)}
                    style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', color: '#fff', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }}
                  >
                    <option value="student">Student</option>
                    <option value="instructor">Instructor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <button type="submit" className="btn btn-primary" style={{ background: '#f43f5e' }}>
                  Create User
                </button>
              </div>
            </form>

            {/* FILTER TABS */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <span style={{ fontSize: '13px', color: '#94a3b8', alignSelf: 'center' }}>Filter:</span>
              <button onClick={() => setFilterRole('all')} className={`btn btn-small ${filterRole === 'all' ? 'btn-primary' : 'btn-outline'}`}>All ({usersList.length})</button>
              <button onClick={() => setFilterRole('student')} className={`btn btn-small ${filterRole === 'student' ? 'btn-primary' : 'btn-outline'}`}>Students ({usersList.filter(u => u.role === 'student').length})</button>
              <button onClick={() => setFilterRole('instructor')} className={`btn btn-small ${filterRole === 'instructor' ? 'btn-primary' : 'btn-outline'}`}>Instructors ({usersList.filter(u => u.role === 'instructor').length})</button>
              <button onClick={() => setFilterRole('admin')} className={`btn btn-small ${filterRole === 'admin' ? 'btn-primary' : 'btn-outline'}`}>Admins ({usersList.filter(u => u.role === 'admin').length})</button>
            </div>

            {/* USERS TABLE */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.5fr 1fr 1.5fr auto', padding: '12px 16px', background: '#090d16', borderBottom: '1px solid #24344d', fontWeight: '600', fontSize: '12px', color: '#94a3b8' }}>
                <span>Name</span>
                <span>Email</span>
                <span>Role</span>
                <span>Change Role</span>
                <span>Action</span>
              </div>

              {filteredUsers.map((u) => (
                <div key={u.id} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.5fr 1fr 1.5fr auto', padding: '12px 16px', borderBottom: '1px solid #1e293b', alignItems: 'center', fontSize: '13px' }}>
                  <strong>{u.name}</strong>
                  <span style={{ color: '#94a3b8' }}>{u.email}</span>
                  <div>
                    <span className={`badge ${u.role === 'admin' ? 'badge-danger' : u.role === 'instructor' ? 'badge-warning' : 'badge-success'}`}>
                      {u.role.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button onClick={() => handleChangeRole(u.id, 'student')} disabled={u.role === 'student'} className="btn btn-small btn-outline" style={{ fontSize: '10px', padding: '2px 6px', opacity: u.role === 'student' ? 0.4 : 1 }}>Student</button>
                    <button onClick={() => handleChangeRole(u.id, 'instructor')} disabled={u.role === 'instructor'} className="btn btn-small btn-outline" style={{ fontSize: '10px', padding: '2px 6px', opacity: u.role === 'instructor' ? 0.4 : 1 }}>Instructor</button>
                    <button onClick={() => handleChangeRole(u.id, 'admin')} disabled={u.role === 'admin'} className="btn btn-small btn-outline" style={{ fontSize: '10px', padding: '2px 6px', opacity: u.role === 'admin' ? 0.4 : 1 }}>Admin</button>
                  </div>
                  <div>
                    <button onClick={() => handleDeleteUser(u.id)} className="btn btn-small btn-outline" style={{ color: '#ef4444', borderColor: '#ef4444' }}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SYSTEM SETTINGS MODAL */}
      {showSettingsModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', background: '#131c2e', padding: '24px', border: '1px solid #f43f5e', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '20px' }}>⚙️ System Settings</h2>
              <button onClick={() => setShowSettingsModal(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#090d16', borderRadius: '8px' }}>
                <div>
                  <strong>Maintenance Mode</strong>
                  <p style={{ fontSize: '12px', color: '#94a3b8' }}>Restrict user logins during maintenance</p>
                </div>
                <button onClick={() => { setMaintenanceMode(!maintenanceMode); showTempNotification(`Maintenance mode ${!maintenanceMode ? 'ENABLED' : 'DISABLED'}`); }} className={`btn btn-small ${maintenanceMode ? 'btn-primary' : 'btn-outline'}`}>
                  {maintenanceMode ? 'ENABLED' : 'DISABLED'}
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#090d16', borderRadius: '8px' }}>
                <div>
                  <strong>Allow New Registrations</strong>
                  <p style={{ fontSize: '12px', color: '#94a3b8' }}>Permit public student registrations</p>
                </div>
                <button onClick={() => { setAllowRegistration(!allowRegistration); showTempNotification(`Public registrations ${!allowRegistration ? 'OPENED' : 'CLOSED'}`); }} className={`btn btn-small ${allowRegistration ? 'btn-primary' : 'btn-outline'}`}>
                  {allowRegistration ? 'OPEN' : 'CLOSED'}
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#090d16', borderRadius: '8px' }}>
                <div>
                  <strong>Email System Alerts</strong>
                  <p style={{ fontSize: '12px', color: '#94a3b8' }}>Send automated reports to admins</p>
                </div>
                <button onClick={() => { setEmailNotifications(!emailNotifications); showTempNotification(`Email alerts ${!emailNotifications ? 'ENABLED' : 'DISABLED'}`); }} className={`btn btn-small ${emailNotifications ? 'btn-primary' : 'btn-outline'}`}>
                  {emailNotifications ? 'ACTIVE' : 'INACTIVE'}
                </button>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <button onClick={() => setShowSettingsModal(false)} className="btn btn-primary" style={{ background: '#f43f5e' }}>Close Settings</button>
            </div>
          </div>
        </div>
      )}

      {/* PLATFORM COURSES MODAL */}
      {showCoursesModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '600px', background: '#131c2e', padding: '24px', border: '1px solid #f43f5e', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '20px' }}>📚 Platform Courses Overview</h2>
              <button onClick={() => setShowCoursesModal(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: '#090d16', borderRadius: '8px' }}>
                <div>
                  <strong>HTML &amp; Web Fundamentals</strong>
                  <p style={{ fontSize: '12px', color: '#94a3b8' }}>Instructor: Dr. Sarah hadasa | 65 Students</p>
                </div>
                <span className="badge badge-success">Published</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: '#090d16', borderRadius: '8px' }}>
                <div>
                  <strong>CSS Layouts &amp; Animations</strong>
                  <p style={{ fontSize: '12px', color: '#94a3b8' }}>Instructor: Dr. Sarah hadasa | 54 Students</p>
                </div>
                <span className="badge badge-success">Published</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: '#090d16', borderRadius: '8px' }}>
                <div>
                  <strong>JavaScript Algorithms</strong>
                  <p style={{ fontSize: '12px', color: '#94a3b8' }}>Instructor: Prof. David Miller | 38 Students</p>
                </div>
                <span className="badge badge-success">Published</span>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <button onClick={() => setShowCoursesModal(false)} className="btn btn-primary" style={{ background: '#f43f5e' }}>Close Overview</button>
            </div>
          </div>
        </div>
      )}

      <footer className="site-footer" style={{ borderTop: '1px solid #24344d', padding: '20px 0', marginTop: '40px' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '14px' }}>
          <p>© 2026 CodeLearn. Administrator Portal.</p>
          <p>LoggedIn as: {adminName} (Admin)</p>
        </div>
      </footer>
      </div>
    </div>
  );
}
