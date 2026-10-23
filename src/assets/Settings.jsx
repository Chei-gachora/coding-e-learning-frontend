import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

const Settings = () => {
  const { user, logout, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState({ name: '', email: '', bio: '' });

  // Notification preferences
  const [notifications, setNotifications] = useState({
    emailCourseUpdates: true,
    emailNewCourses: false,
    pushReminders: true,
    weeklyReport: true,
  });

  // Preferences
  const [preferences, setPreferences] = useState({
    theme: 'dark',
    language: 'english',
  });

  const [activeTab, setActiveTab] = useState('profile');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setProfile({
      name: user?.name || '',
      email: user?.email || '',
      bio: user?.bio || '',
    });
  }, [user]);

  // Handlers
  const handleProfileChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e) => {
    setPasswords({ ...passwords, [e.target.name]: e.target.value });
  };

  const handleNotificationChange = (key) => {
    setNotifications({
      ...notifications,
      [key]: !notifications[key],
    });
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setMessage('');
    const [first_name, ...lastName] = profile.name.trim().split(/\s+/);
    setSaving(true);
    try {
      const updated = await api.patch('/auth/me/', {
        first_name: first_name || '',
        last_name: lastName.join(' '),
        bio: profile.bio,
      });
      updateProfile(updated);
      setMessage('Profile updated successfully.');
    } catch (error) {
      setMessage(error.message || 'Unable to update your profile.');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    setMessage('');
    try {
      const response = await api.requestPasswordReset(user.email);
      setMessage(response?.detail || 'If the account exists, password reset instructions have been sent.');
    } catch (error) {
      setMessage(error.message || 'Unable to request a password reset.');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      setMessage(`Unable to sign out: ${error.message}`);
    }
  };

  return (
    <div className="settings-page">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="main-content">
        <header className="page-header">
          <div>
            <h1>Settings</h1>
            <p>Manage your account and preferences</p>
          </div>
        </header>

        {/* Success / Error Message */}
        {message && (
          <div className={`message ${message.includes('success') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}

        {/* Tabs */}
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            Profile
          </button>
          <button
            className={`tab ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            Security
          </button>
          <button
            className={`tab ${activeTab === 'notifications' ? 'active' : ''}`}
            onClick={() => setActiveTab('notifications')}
          >
            Notifications
          </button>
          <button
            className={`tab ${activeTab === 'preferences' ? 'active' : ''}`}
            onClick={() => setActiveTab('preferences')}
          >
            Preferences
          </button>
        </div>

        {/* ===== PROFILE TAB ===== */}
        {activeTab === 'profile' && (
          <div className="settings-card">
            <h2>Profile Information</h2>
            <p className="section-desc">Update your personal details</p>

            <form onSubmit={handleSaveProfile}>
              <div className="avatar-section">
                <div className="avatar-large">{profile.name.charAt(0)}</div>
                <button type="button" className="btn secondary small">
                  Change Avatar
                </button>
              </div>

              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={profile.name}
                  onChange={handleProfileChange}
                />
              </div>

              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={profile.email}
                  readOnly
                />
              </div>

              <div className="form-group">
                <label>Bio</label>
                <textarea
                  name="bio"
                  rows={3}
                  value={profile.bio}
                  onChange={handleProfileChange}
                  placeholder="Tell us a bit about yourself..."
                />
              </div>

              <button type="submit" className="btn primary" disabled={saving}>
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </form>
          </div>
        )}

        {/* ===== SECURITY TAB ===== */}
        {activeTab === 'security' && (
          <div className="settings-card">
            <h2>Password &amp; Security</h2>
            <p className="section-desc">
              Password updates use a time-limited email link. Your authentication
              cookies are HttpOnly and are not stored in browser local storage.
            </p>
            <button type="button" className="btn primary" onClick={handlePasswordReset}>
                Send password reset link
              </button>
          </div>
        )}

        {/* ===== NOTIFICATIONS TAB ===== */}
        {activeTab === 'notifications' && (
          <div className="settings-card">
            <h2>Notification Preferences</h2>
            <p className="section-desc">Choose what you want to be notified about</p>

            <div className="toggle-list">
              <div className="toggle-item">
                <div>
                  <h4>Course Updates</h4>
                  <p>Get emails when your courses are updated</p>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={notifications.emailCourseUpdates}
                    onChange={() => handleNotificationChange('emailCourseUpdates')}
                  />
                  <span className="slider"></span>
                </label>
              </div>

              <div className="toggle-item">
                <div>
                  <h4>New Courses</h4>
                  <p>Notify me when new courses are released</p>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={notifications.emailNewCourses}
                    onChange={() => handleNotificationChange('emailNewCourses')}
                  />
                  <span className="slider"></span>
                </label>
              </div>

              <div className="toggle-item">
                <div>
                  <h4>Learning Reminders</h4>
                  <p>Push notifications to keep your streak</p>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={notifications.pushReminders}
                    onChange={() => handleNotificationChange('pushReminders')}
                  />
                  <span className="slider"></span>
                </label>
              </div>

              <div className="toggle-item">
                <div>
                  <h4>Weekly Progress Report</h4>
                  <p>Receive a summary of your learning every week</p>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={notifications.weeklyReport}
                    onChange={() => handleNotificationChange('weeklyReport')}
                  />
                  <span className="slider"></span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* ===== PREFERENCES TAB ===== */}
        {activeTab === 'preferences' && (
          <div className="settings-card">
            <h2>Preferences</h2>
            <p className="section-desc">Customize your learning experience</p>

            <div className="form-group">
              <label>Theme</label>
              <select
                value={preferences.theme}
                onChange={(e) =>
                  setPreferences({ ...preferences, theme: e.target.value })
                }
              >
                <option value="dark">Dark</option>
                <option value="light">Light</option>
                <option value="system">System Default</option>
              </select>
            </div>

            <div className="form-group">
              <label>Language</label>
              <select
                value={preferences.language}
                onChange={(e) =>
                  setPreferences({ ...preferences, language: e.target.value })
                }
              >
                <option value="english">English</option>
                <option value="spanish">Spanish</option>
                <option value="french">French</option>
                <option value="swahili">Swahili</option>
              </select>
            </div>

            <button className="btn primary" style={{ marginTop: '10px' }}>
              Save Preferences
            </button>
          </div>
        )}

        {/* Danger Zone */}
        <div className="settings-card danger-zone">
          <h2>Account Actions</h2>
          <p className="section-desc">Be careful with these actions</p>

          <div className="danger-actions">
            <button className="btn logout" onClick={handleLogout}>
              Log Out of Account
            </button>
            <button className="btn danger" type="button" disabled title="Account deletion is not available through this backend.">
              Delete Account
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Settings;
