import React from 'react';
import { Separator } from "@/components/ui/separator";

const Footer: React.FC = () => {
  return (
    <footer id="contact" className="bg-[#152A4E] text-white py-12">
      <div className="container mx-auto px-6 lg:px-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <h3 className="text-xl font-semibold mb-4">About Us</h3>
            <p className="text-white/70">
              The Final Year Project Management System is designed to streamline the entire project lifecycle for both students and supervisors at the University of Mines and Technology.
            </p>
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-4">Contact Information</h3>
            <div className="space-y-2">
              <div className="flex items-center">
                <i className="fas fa-map-marker-alt w-6"></i>
                <span className="text-white/70 ml-2">University of Mines and Technology, Tarkwa, Ghana</span>
              </div>
              <div className="flex items-center">
                <i className="fas fa-envelope w-6"></i>
                <span className="text-white/70 ml-2">support@umat.edu.gh</span>
              </div>
              <div className="flex items-center">
                <i className="fas fa-phone w-6"></i>
                <span className="text-white/70 ml-2">+233 30 239 0240</span>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-white/70 hover:text-white transition-colors cursor-pointer">Help Center</a></li>
              <li><a href="#" className="text-white/70 hover:text-white transition-colors cursor-pointer">Privacy Policy</a></li>
              <li><a href="#" className="text-white/70 hover:text-white transition-colors cursor-pointer">Terms of Service</a></li>
              <li><a href="#" className="text-white/70 hover:text-white transition-colors cursor-pointer">University Website</a></li>
            </ul>
          </div>
        </div>
        <Separator className="bg-white/20 my-6" />
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="text-white/70 mb-4 md:mb-0">
            © 2025 University of Mines and Technology. All rights reserved.
          </div>
          <div className="flex space-x-4">
            <a href="#" className="text-white hover:text-[#4A90E2] transition-colors cursor-pointer">
              <i className="fab fa-facebook-f text-xl"></i>
            </a>
            <a href="#" className="text-white hover:text-[#4A90E2] transition-colors cursor-pointer">
              <i className="fab fa-twitter text-xl"></i>
            </a>
            <a href="#" className="text-white hover:text-[#4A90E2] transition-colors cursor-pointer">
              <i className="fab fa-linkedin-in text-xl"></i>
            </a>
            <a href="#" className="text-white hover:text-[#4A90E2] transition-colors cursor-pointer">
              <i className="fab fa-instagram text-xl"></i>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 