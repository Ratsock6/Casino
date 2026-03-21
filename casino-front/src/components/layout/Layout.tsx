import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import '../../styles/components/layout.scss';
import WinnersTicker from '../ui/WinnersTicker';
import Notifications from '../ui/Notifications';
import { useSocket } from '../../hooks/useSocket';
import { useEffect } from 'react';

const Layout = () => {

  const { connect } = useSocket();

  useEffect(() => {
    connect();
  }, []);

  return (
    <div className="layout">
      <Navbar />
      <main className="layout__content">
        <Outlet />
      </main>
      <WinnersTicker />
      <Notifications />
    </div>
  );
};

export default Layout;