import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import '../../styles/components/layout.scss';

const Layout = () => {
  return (
    <div className="layout">
      <Navbar />
      <main className="layout__content">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;