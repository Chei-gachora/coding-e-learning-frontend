import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MdDashboardCustomize } from "react-icons/md";
import { FaDiscourse } from "react-icons/fa";
import { FaBookReader } from "react-icons/fa";
import { BsFire } from "react-icons/bs";
import { PiCertificateFill } from "react-icons/pi";
import { FaSyringe } from "react-icons/fa";
import { GiTrophyCup } from "react-icons/gi";
import { MdAdminPanelSettings } from "react-icons/md";
import { CgProfile } from "react-icons/cg";

const Sidebar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const handleLogout = () => {
    logout();
  };

  const role = user?.role || 'student';

  const navLinks = {
    student: [
      { path: '/dashboard', icon: <MdDashboardCustomize />, label: 'Dashboard' },
      { path: '/courses', icon: <FaDiscourse />, label: 'All Courses' },
      { path: '/my-courses', icon: <FaBookReader />, label: 'My Courses' },
      { path: '/learning-paths', icon: <BsFire />, label: 'Learning Paths' },
      { path: '/certificates', icon: <PiCertificateFill />, label: 'Certificates' },
      { path: '/labs', icon: <FaSyringe />, label: 'Labs' },
      { path: '/results', icon: <GiTrophyCup />, label: 'Results' },
      { path: '/settings', icon: '⚙️', label: 'Settings' },
    ],
    instructor: [
      { path: '/instructor', icon: <CgProfile />, label: 'Dashboard' },
      { path: '/courses', icon: <FaDiscourse />, label: 'Courses' },
      { path: '/labs', icon: <FaSyringe />, label: 'Labs' },
      { path: '/results', icon: <GiTrophyCup />, label: 'Results' },
    ],
    admin: [
      { path: '/admin', icon: <MdAdminPanelSettings />, label: 'Dashboard' },
    ]
  };

  const linksToRender = navLinks[role] || navLinks.student;

  return (
    <aside className="sidebar">
      <div className="logo">
          <Link to="/" className="logo">
            Code<span>Learn</span>
          </Link>
      </div>

      <nav className="nav">
        {linksToRender.map((link) => (
          <Link
            key={link.path}
            to={link.path}
            className={`nav-item ${location.pathname === link.path ? 'active' : ''}`}
          >
            <span>{link.icon}</span> {link.label}
          </Link>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', padding: '0 8px' }}>
          <div style={{ width: '32px', height: '32px', background: 'var(--primary)', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
            {user?.avatar || (role === 'instructor' ? 'I' : 'S')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '14px', fontWeight: '600' }}>{user?.name || (role === 'instructor' ? 'Dr. Sarah' : 'Student')}</span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{role}</span>
          </div>
        </div>
        <Link to="/login" onClick={handleLogout} className="logout-btn" style={{ textAlign: 'center', textDecoration: 'none', display: 'block' }}>
          Log Out
        </Link>
      </div>
    </aside>
  );
};

export default Sidebar;
