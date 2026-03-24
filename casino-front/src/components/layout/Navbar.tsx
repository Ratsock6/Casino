import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import { useWalletStore } from '../../store/wallet.store';
import { getWalletApi } from '../../api/wallet.api';
import '../../styles/components/navbar.scss';
import { getUnclaimedRewardsApi } from '../../api/levels.api';


const Navbar = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { balance, setBalance } = useWalletStore();
  const [unclaimedCount, setUnclaimedCount] = useState(0);

  useEffect(() => {
    const fetchWallet = async () => {
      try {
        const data = await getWalletApi();
        setBalance(parseFloat(data.balance));
      } catch (err) {
        console.error('Erreur wallet:', err);
      }
    };
    fetchWallet();
  }, []);

  useEffect(() => {
    if (!user) return;
    getUnclaimedRewardsApi()
      .then((rewards) => setUnclaimedCount(rewards.length))
      .catch(() => { });
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar__brand">
        <span className="navbar__icon">♠</span>
        <span className="navbar__title">Bellagio Casino</span>
      </div>

      <div className="navbar__links">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            isActive ? 'navbar__link navbar__link--active' : 'navbar__link'
          }
        >
          Accueil
        </NavLink>
        <NavLink
          to="/slots"
          className={({ isActive }) =>
            isActive ? 'navbar__link navbar__link--active' : 'navbar__link'
          }
        >
          Slots
        </NavLink>
        <NavLink
          to="/roulette"
          className={({ isActive }) =>
            isActive ? 'navbar__link navbar__link--active' : 'navbar__link'
          }
        >
          Roulette
        </NavLink>
        <NavLink
          to="/blackjack"
          className={({ isActive }) =>
            isActive ? 'navbar__link navbar__link--active' : 'navbar__link'
          }
        >
          Blackjack
        </NavLink>

        <NavLink
          to="/vip"
          className={({ isActive }) =>
            isActive ? 'navbar__link navbar__link--active navbar__link--vip' : 'navbar__link navbar__link--vip'
          }
        >
          👑 VIP
        </NavLink>

        <NavLink to="/level" className={({ isActive }) =>
          isActive ? 'navbar__link navbar__link--active' : 'navbar__link'
        }>
          ⭐ Niveau
          {unclaimedCount > 0 && (
            <span className="navbar__notif-badge">{unclaimedCount}</span>
          )}
        </NavLink>

        {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              isActive ? 'navbar__link navbar__link--active' : 'navbar__link'
            }
          >
            Admin
          </NavLink>

        )}

      </div>

      <div className="navbar__right">
        <div className="navbar__wallet">
          <span className="navbar__wallet-icon">🪙</span>
          <span className="navbar__wallet-balance">
            {balance.toLocaleString()} jetons
          </span>
        </div>
        <Link to="/profile" className="navbar__user">
          <span className="navbar__username">{user?.username}</span>
          <span className="navbar__role">{user?.role}</span>
        </Link>
        <button className="navbar__logout" onClick={handleLogout}>
          Déconnexion
        </button>
      </div>
    </nav >
  );
};

export default Navbar;