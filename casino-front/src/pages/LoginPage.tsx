import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { loginApi } from '../api/auth.api';
import '../styles/pages/login.scss';
import { Link } from 'react-router-dom';
import { useSearchParams } from 'react-router-dom';


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
          <span className="login-card__icon">♠</span>
          <h1 className="login-card__title">Diamond Casino</h1>
          <p className="login-card__subtitle">Connectez-vous pour jouer</p>
        </div>

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