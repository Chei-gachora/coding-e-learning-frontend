import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';

const Settings = () => {
  // Profile state
  const [profile, setProfile] = useState({
    name: 'Paul',
    email: 'paul@example.com',
    bio: 'Passionate about learning to code',
  });

  // Password state
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: '',
  });

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

  const handleSaveProfile = (e) => {
    e.preventDefault();
    setMessage('Profile updated successfully!');
    setTimeout(() => setMessage(''), 3000);
  };

  const handleChangePassword = (e) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      setMessage('New passwords do not match!');
      return;
    }
    if (passwords.new.length < 6) {
      setMessage('Password must be at least 6 characters');
      return;
    }
    setMessage('Password changed successfully!');
    setPasswords({ current: '', new: '', confirm: '' });
    setTimeout(() => setMessage(''), 3000);
  };

  const handleLogout = () => {
    // In a real app you would clear tokens / call logout API
    alert('You have been logged out!');
    // Example: window.location.href = '/login';
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
                  onChange={handleProfileChange}
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

              <button type="submit" className="btn primary">
                Save Changes
              </button>
            </form>
          </div>
        )}

        {/* ===== SECURITY TAB ===== */}
        {activeTab === 'security' && (
          <div className="settings-card">
            <h2>Change Password</h2>
            <p className="section-desc">Keep your account secure</p>

            <form onSubmit={handleChangePassword}>
              <div className="form-group">
                <label>Current Password</label>
                <input
                  type="password"
                  name="current"
                  value={passwords.current}
                  onChange={handlePasswordChange}
                  placeholder="Enter current password"
                />
              </div>

              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  name="new"
                  value={passwords.new}
                  onChange={handlePasswordChange}
                  placeholder="Enter new password"
                />
              </div>

              <div className="form-group">
                <label>Confirm New Password</label>
                <input
                  type="password"
                  name="confirm"
                  value={passwords.confirm}
                  onChange={handlePasswordChange}
                  placeholder="Confirm new password"
                />
              </div>

              <button type="submit" className="btn primary">
                Update Password
              </button>
            </form>
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
            <button className="btn danger">
              Delete Account
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Settings;
