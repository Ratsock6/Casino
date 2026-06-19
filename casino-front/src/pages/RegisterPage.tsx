import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { registerApi } from '../api/auth.api';
import '../styles/pages/register.scss';
import { useAuthStore } from '../store/auth.store';
import { loginApi } from '../api/auth.api';
import bellagioLogo from '../assets/bellagio_logo_white.png';

const RegisterPage = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: '',
    firstName: '',
    lastName: '',
    birthDate: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      return setError('Les mots de passe ne correspondent pas.');
    }

    setLoading(true);
    try {
      await registerApi({
        username: form.username,
        firstName: form.firstName,
        lastName: form.lastName,
        birthDate: form.birthDate,
        phoneNumber: form.phoneNumber,
        password: form.password,
        hasAcceptedTerms: acceptedTerms,
      });

      const data = await loginApi(form.username, form.password);
      login(data.user, data.accessToken);

      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <div className="register-card">
        <div className="register-card__header">
          <img src={bellagioLogo} alt="Bellagio Casino" className="register-card__logo" />
          <p className="register-card__subtitle">Créez votre compte</p>
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

        {<p className="register-form__warning">Tout les virements se feront avec le numéro de téléphone. Veuillez le renseigner correctement. Le nom et prénom peuvent être faussé pour votre anonymat.</p>}

        <form className="register-form" onSubmit={handleSubmit}>
          <div className="register-form__field">
            <label htmlFor="firstName">Prénom</label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              value={form.firstName}
              onChange={handleChange}
              placeholder="Prénom"
              required
            />
          </div>

          <div className="register-form__field">
            <label htmlFor="lastName">Nom</label>
            <input
              id="lastName"
              name="lastName"
              type="text"
              value={form.lastName}
              onChange={handleChange}
              placeholder="Nom"
              required
            />
          </div>

          <div className="register-form__field">
            <label htmlFor="username">Nom d'utilisateur</label>
            <input
              id="username"
              name="username"
              type="text"
              value={form.username}
              onChange={handleChange}
              placeholder="nom_utilisateur"
              required
            />
          </div>

          <div className="register-form__field">
            <label htmlFor="birthDate">Date de naissance</label>
            <input
              id="birthDate"
              name="birthDate"
              type="date"
              value={form.birthDate}
              onChange={handleChange}
              required
            />
          </div>

          <div className="register-form__field">
            <label htmlFor="phoneNumber">Numéro de téléphone RP</label>
            <input
              id="phoneNumber"
              name="phoneNumber"
              type="text"
              value={form.phoneNumber}
              onChange={handleChange}
              placeholder="12345-67890"
              maxLength={11}
              required
            />
          </div>

          <div className="register-form__field">
            <label htmlFor="password">Mot de passe</label>
            <input
              id="password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
            />
          </div>

          <div className="register-form__field">
            <label htmlFor="confirmPassword">Confirmer le mot de passe</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={handleChange}
              placeholder="••••••••"
              required
            />
          </div>

          <div className="register-form__terms">
            <input
              type="checkbox"
              id="terms"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              required
            />
            <label htmlFor="terms">
              J'ai lu et j'accepte le{' '}
              <a href="/reglement" target="_blank" rel="noopener noreferrer">
                règlement du Bellagio Casino
              </a>
            </label>
          </div>

          {error && <p className="register-form__error">{error}</p>}


          <button
            className="register-form__submit"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Création...' : 'Créer mon compte'}
          </button>

          <p className="register-form__login">
            Déjà un compte ?{' '}
            <Link to="/login">Se connecter</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;