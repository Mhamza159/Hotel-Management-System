import React from 'react';
import Navbar from '../components/guest/Navbar';
import Footer from '../components/guest/Footer';

export const GuestLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-[#F5F1E8] text-[#2A2A28] flex flex-col justify-between selection:bg-[#2B3A2A] selection:text-[#F5F1E8]">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
};

export default GuestLayout;
