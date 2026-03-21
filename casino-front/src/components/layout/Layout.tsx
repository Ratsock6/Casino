import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import '../../styles/components/layout.scss';
import WinnersTicker from '../ui/WinnersTicker';

const Layout = () => {
  return (
    <div className="layout">
      <Navbar />
      <main className="layout__content">
        <Outlet />
      </main>
      <WinnersTicker />
    </div>
  );
};

export default Layout;