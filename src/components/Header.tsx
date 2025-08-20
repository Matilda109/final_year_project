'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

const Header: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <header className="fixed top-0 left-0 right-0 bg-white shadow-md z-50">
      <div className="flex items-center justify-between px-4 md:px-8 lg:px-16 h-16">
        <div className="flex items-center gap-4">
          <img
            src="https://readdy.ai/api/search-image?query=University%20of%20Mines%20and%20Technology%20logo%2C%20minimalist%2C%20professional%2C%20academic%20institution%20emblem%2C%20clean%20design%2C%20blue%20and%20gold%20colors%2C%20educational%20symbol%2C%20vector%20style%2C%20white%20background%2C%20high%20quality&width=80&height=80&seq=1&orientation=squarish"
            alt="University Logo"
            className="h-10 w-auto"
          />
          <Link href="/" className="text-[#1B365D] font-semibold text-xl md:text-2xl whitespace-nowrap">ProMage</Link>
        </div>
        
        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-4">
          <Link href="/login">
            <Button variant="outline" className="border-[#1B365D] bg-white text-black hover:bg-[#1B365D] hover:text-white">
              Login
            </Button>
          </Link>
        </div>
        
        {/* Mobile Menu Button */}
        <div className="md:hidden cursor-pointer" onClick={toggleMobileMenu}>
          {mobileMenuOpen ? (
            <X className="text-[#1B365D] h-6 w-6" />
          ) : (
            <Menu className="text-[#1B365D] h-6 w-6" />
          )}
        </div>
      </div>
      
      {/* Mobile Navigation Menu - Sliding from right */}
      <div 
        className={`fixed top-16 right-0 h-screen bg-white shadow-xl z-50 w-3/4 transform transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col items-center gap-6 p-6">
          <Link href="/login" className="w-full">
            <Button variant="outline" className="border-[#1B365D] bg-white text-black hover:bg-[#1B365D] hover:text-white w-full">
              Login
            </Button>
          </Link>
        </div>
      </div>
      
      {/* Backdrop when menu is open */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" 
          onClick={toggleMobileMenu}
          style={{ top: '64px' }}
        ></div>
      )}
    </header>
  );
};

export default Header; 