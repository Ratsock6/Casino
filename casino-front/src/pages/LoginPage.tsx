import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { loginApi } from '../api/auth.api';
import '../styles/pages/login.scss';
import { Link } from 'react-router-dom';
import { useSearchParams } from 'react-router-dom';
import bellagioLogo from '../assets/bellagio_logo_white.png';


const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const bannedReason = searchParams.get('reason');


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await loginApi(username, password);
      login(data.user, data.accessToken);
      navigate('/');
    } catch (err: any) {
      setError('Identifiants incorrects.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-card__header">
          <img src={bellagioLogo} alt="Bellagio Casino" className="login-card__logo" />
          <p className="login-card__subtitle">Connectez-vous pour jouer</p>
        </div>

        <a
          href="https://discord.gg/cvYz49ds4Z"
          target="_blank"
          rel="noopener noreferrer"
          className="discord-join-btn"
        >
          <svg className="discord-join-btn__icon" viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
            <path d="M20.317 4.369A19.79 19.79 0 0 0 16.558 3.2a.074.074 0 0 0-.079.037c-.34.6-.717 1.385-.98 2.001a18.27 18.27 0 0 0-5.487 0 12.6 12.6 0 0 0-.997-2.001A.077.077 0 0 0 8.937 3.2 19.736 19.736 0 0 0 5.177 4.37a.07.07 0 0 0-.032.027C2.768 7.94 2.119 11.4 2.438 14.815a.082.082 0 0 0 .031.056 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.009c.12.099.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.891.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.094-.838-9.52-3.549-13.442a.06.06 0 0 0-.031-.028ZM8.02 12.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418Zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418Z" />
          </svg>
          Rejoindre le Discord
        </a>

        {bannedReason && (
          <div className="login-form__banned">
            🚫 {decodeURIComponent(bannedReason)}
          </div>
        )}

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-form__field">
            <label htmlFor="username">Nom d'utilisateur</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="identifiant"
              required
            />
          </div>

          <div className="login-form__field">
            <label htmlFor="password">Mot de passe</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && <p className="login-form__error">{error}</p>}

          <button
            className="login-form__submit"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
          <p className="login-form__register">
            Pas encore de compte ?{' '}
            <Link to="/register">S'inscrire</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;