import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ImRocket } from 'react-icons/im';
import { detectRoleFromEmail } from '../context/AuthContext';

// Comprehensive country list
const COUNTRIES = [
  'Afghanistan','Albania','Algeria','Andorra','Angola','Argentina','Armenia',
  'Australia','Austria','Azerbaijan','Bahamas','Bahrain','Bangladesh','Belarus',
  'Belgium','Belize','Benin','Bhutan','Bolivia','Bosnia and Herzegovina',
  'Botswana','Brazil','Brunei','Bulgaria','Burkina Faso','Burundi','Cambodia',
  'Cameroon','Canada','Cape Verde','Central African Republic','Chad','Chile',
  'China','Colombia','Comoros','Congo','Costa Rica','Croatia','Cuba','Cyprus',
  'Czech Republic','Denmark','Djibouti','Dominican Republic','DR Congo','Ecuador',
  'Egypt','El Salvador','Equatorial Guinea','Eritrea','Estonia','Eswatini',
  'Ethiopia','Fiji','Finland','France','Gabon','Gambia','Georgia','Germany',
  'Ghana','Greece','Guatemala','Guinea','Guinea-Bissau','Guyana','Haiti',
  'Honduras','Hungary','Iceland','India','Indonesia','Iran','Iraq','Ireland',
  'Israel','Italy','Ivory Coast','Jamaica','Japan','Jordan','Kazakhstan','Kenya',
  'Kosovo','Kuwait','Kyrgyzstan','Laos','Latvia','Lebanon','Lesotho','Liberia',
  'Libya','Liechtenstein','Lithuania','Luxembourg','Madagascar','Malawi',
  'Malaysia','Maldives','Mali','Malta','Mauritania','Mauritius','Mexico',
  'Moldova','Monaco','Mongolia','Montenegro','Morocco','Mozambique','Myanmar',
  'Namibia','Nepal','Netherlands','New Zealand','Nicaragua','Niger','Nigeria',
  'North Korea','North Macedonia','Norway','Oman','Pakistan','Palestine','Panama',
  'Papua New Guinea','Paraguay','Peru','Philippines','Poland','Portugal','Qatar',
  'Romania','Russia','Rwanda','Saudi Arabia','Senegal','Serbia','Sierra Leone',
  'Singapore','Slovakia','Slovenia','Somalia','South Africa','South Korea',
  'South Sudan','Spain','Sri Lanka','Sudan','Suriname','Sweden','Switzerland',
  'Syria','Taiwan','Tajikistan','Tanzania','Thailand','Timor-Leste','Togo',
  'Trinidad and Tobago','Tunisia','Turkey','Turkmenistan','Uganda','Ukraine',
  'United Arab Emirates','United Kingdom','United States','Uruguay','Uzbekistan',
  'Venezuela','Vietnam','Yemen','Zambia','Zimbabwe',
];

// Common dial codes
const DIAL_CODES = [
  { code: '+1',   label: '🇺🇸 +1 (US/CA)' },
  { code: '+7',   label: '🇷🇺 +7' },
  { code: '+20',  label: '🇪🇬 +20' },
  { code: '+27',  label: '🇿🇦 +27' },
  { code: '+30',  label: '🇬🇷 +30' },
  { code: '+31',  label: '🇳🇱 +31' },
  { code: '+32',  label: '🇧🇪 +32' },
  { code: '+33',  label: '🇫🇷 +33' },
  { code: '+34',  label: '🇪🇸 +34' },
  { code: '+39',  label: '🇮🇹 +39' },
  { code: '+40',  label: '🇷🇴 +40' },
  { code: '+44',  label: '🇬🇧 +44' },
  { code: '+46',  label: '🇸🇪 +46' },
  { code: '+47',  label: '🇳🇴 +47' },
  { code: '+48',  label: '🇵🇱 +48' },
  { code: '+49',  label: '🇩🇪 +49' },
  { code: '+51',  label: '🇵🇪 +51' },
  { code: '+52',  label: '🇲🇽 +52' },
  { code: '+54',  label: '🇦🇷 +54' },
  { code: '+55',  label: '🇧🇷 +55' },
  { code: '+56',  label: '🇨🇱 +56' },
  { code: '+57',  label: '🇨🇴 +57' },
  { code: '+60',  label: '🇲🇾 +60' },
  { code: '+61',  label: '🇦🇺 +61' },
  { code: '+62',  label: '🇮🇩 +62' },
  { code: '+63',  label: '🇵🇭 +63' },
  { code: '+64',  label: '🇳🇿 +64' },
  { code: '+65',  label: '🇸🇬 +65' },
  { code: '+66',  label: '🇹🇭 +66' },
  { code: '+81',  label: '🇯🇵 +81' },
  { code: '+82',  label: '🇰🇷 +82' },
  { code: '+84',  label: '🇻🇳 +84' },
  { code: '+86',  label: '🇨🇳 +86' },
  { code: '+90',  label: '🇹🇷 +90' },
  { code: '+91',  label: '🇮🇳 +91' },
  { code: '+92',  label: '🇵🇰 +92' },
  { code: '+93',  label: '🇦🇫 +93' },
  { code: '+94',  label: '🇱🇰 +94' },
  { code: '+98',  label: '🇮🇷 +98' },
  { code: '+212', label: '🇲🇦 +212' },
  { code: '+213', label: '🇩🇿 +213' },
  { code: '+216', label: '🇹🇳 +216' },
  { code: '+218', label: '🇱🇾 +218' },
  { code: '+220', label: '🇬🇲 +220' },
  { code: '+221', label: '🇸🇳 +221' },
  { code: '+233', label: '🇬🇭 +233' },
  { code: '+234', label: '🇳🇬 +234' },
  { code: '+254', label: '🇰🇪 +254' },
  { code: '+255', label: '🇹🇿 +255' },
  { code: '+256', label: '🇺🇬 +256' },
  { code: '+260', label: '🇿🇲 +260' },
  { code: '+263', label: '🇿🇼 +263' },
  { code: '+966', label: '🇸🇦 +966' },
  { code: '+971', label: '🇦🇪 +971' },
  { code: '+972', label: '🇮🇱 +972' },
  { code: '+977', label: '🇳🇵 +977' },
];

export default function Register() {
  const [fullName, setFullName]   = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [dialCode, setDialCode]   = useState('+1');
  const [phone, setPhone]         = useState('');
  const [country, setCountry]     = useState('');
  const [error, setError]         = useState('');
  const navigate = useNavigate();

  // Detect role from email (same logic as login)
  const detectedRole = email ? detectRoleFromEmail(email) : null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPwd) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    const role = detectRoleFromEmail(email);
    if (role === 'instructor') {
      navigate('/instructor');
    } else {
      navigate('/dashboard');
    }
  };

  const selectStyle = {
    width: '100%',
    padding: '10px 12px',
    background: '#1e293b',
    border: '1px solid #334155',
    color: '#fff',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    cursor: 'pointer',
  };

  return (
    <section className="login-page">
      <div className="login-container">

        {/* ── LEFT SIDE ── */}
        <div className="login-info">
          <Link to="/" className="logo">Code<span>Learn</span></Link>
          <h1>Join CodeLearn Today!</h1>
          <p>
            Start your coding journey with interactive courses, daily labs,
            and instructor-guided learning paths.
          </p>

          <div className="login-features">
            <div>
              <strong><ImRocket /></strong>
              <span>Hands-on coding exercises</span>
            </div>
            <div>
              <strong>&#x1F9EA;</strong>
              <span>Practical daily labs</span>
            </div>
            <div>
              <strong>&#x1F3C6;</strong>
              <span>Earn industry-recognized certificates</span>
            </div>
          </div>
        </div>

        {/* ── RIGHT SIDE ── */}
        <div className="login-card">
          <div className="login-heading">
            <h2>Create Account</h2>
            <p>Fill in your details to get started.</p>
          </div>

          {error && (
            <div style={{ background: 'rgba(244,63,94,0.15)', color: '#f87171', border: '1px solid rgba(244,63,94,0.3)', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>
              {error}
            </div>
          )}

          <form id="registerForm" onSubmit={handleSubmit}>

            {/* Full Name */}
            <div className="form-group">
              <label htmlFor="fullName">Full Name</label>
              <input
                type="text"
                id="fullName"
                className="form-control"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            {/* Email */}
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                className="form-control"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              {detectedRole && (
                <div style={{ marginTop: '6px', fontSize: '12px', color: detectedRole === 'instructor' ? '#a78bfa' : '#34d399', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  {detectedRole === 'instructor' ? '\u{1F4DA}' : '\u{1F393}'}
                  You will be registered as a&nbsp;<strong style={{ textTransform: 'capitalize' }}>{detectedRole}</strong>.
                </div>
              )}
            </div>

            {/* Phone Number */}
            <div className="form-group">
              <label htmlFor="phone">Phone Number</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select
                  id="dialCode"
                  value={dialCode}
                  onChange={(e) => setDialCode(e.target.value)}
                  style={{ ...selectStyle, width: '140px', flexShrink: 0 }}
                >
                  {DIAL_CODES.map((d) => (
                    <option key={d.code} value={d.code}>{d.label}</option>
                  ))}
                </select>
                <input
                  type="tel"
                  id="phone"
                  className="form-control"
                  placeholder="e.g. 712 345 678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^0-9\s\-]/g, ''))}
                  required
                  style={{ flex: 1 }}
                />
              </div>
            </div>

            {/* Country */}
            <div className="form-group">
              <label htmlFor="country">Country</label>
              <select
                id="country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                style={selectStyle}
                required
              >
                <option value="" disabled>Select your country</option>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Password */}
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                className="form-control"
                placeholder="Create a strong password (min 6 chars)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {/* Confirm Password */}
            <div className="form-group">
              <label htmlFor="confirmPwd">Confirm Password</label>
              <input
                type="password"
                id="confirmPwd"
                className="form-control"
                placeholder="Re-enter your password"
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                required
              />
              {confirmPwd && password !== confirmPwd && (
                <div style={{ marginTop: '5px', fontSize: '12px', color: '#f87171' }}>
                  Passwords do not match.
                </div>
              )}
              {confirmPwd && password === confirmPwd && confirmPwd.length > 0 && (
                <div style={{ marginTop: '5px', fontSize: '12px', color: '#34d399' }}>
                  &#x2713; Passwords match.
                </div>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary login-btn"
              style={{ marginTop: '12px' }}
            >
              Create Account &amp; Start Learning &#x2192;
            </button>
          </form>

          <div className="register-link" style={{ marginTop: '16px' }}>
            <p>
              Already have an account? <Link to="/login">Sign In</Link>
            </p>
          </div>

          <div className="back-home">
            <Link to="/">\u2190 Back to Home</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
