import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { registerApi } from '../api/auth.api';
import '../styles/pages/register.scss';

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
      });
      navigate('/login');
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
          <span className="register-card__icon">♠</span>
          <h1 className="register-card__title">Diamond Casino</h1>
          <p className="register-card__subtitle">Créez votre compte</p>
        </div>

        <form className="register-form" onSubmit={handleSubmit}>
          <div className="register-form__row">
            <div className="register-form__field">
              <label htmlFor="firstName">Prénom</label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                value={form.firstName}
                onChange={handleChange}
                placeholder="Diego"
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
                placeholder="Guerrero"
                required
              />
            </div>
          </div>

          <div className="register-form__field">
            <label htmlFor="username">Nom d'utilisateur</label>
            <input
              id="username"
              name="username"
              type="text"
              value={form.username}
              onChange={handleChange}
              placeholder="DiegoGuerrero"
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