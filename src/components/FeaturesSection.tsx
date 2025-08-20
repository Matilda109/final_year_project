import React from 'react';
import { Card } from "@/components/ui/card";

const FeaturesSection: React.FC = () => {
  return (
    <section id="benefits" className="py-24 bg-[#F8FAFD]">
      <div className="container mx-auto px-6 lg:px-16">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-bold text-[#0A192F] mb-6">Powerful Features</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Experience a new standard in project management with our comprehensive suite of tools designed specifically for academic excellence
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <Card className="p-8 bg-white/50 backdrop-blur-sm border-2 border-blue-100 hover:border-blue-300 transition-all duration-300 hover:transform hover:-translate-y-2">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-5 rounded-2xl mb-8 w-16 h-16 flex items-center justify-center">
              <i className="fas fa-tasks text-white text-2xl"></i>
            </div>
            <h3 className="text-2xl font-semibold text-[#0A192F] mb-4">Project Tracking</h3>
            <p className="text-gray-600 text-lg">
              Advanced milestone tracking with automated progress updates and deadline management system.
            </p>
            <ul className="mt-6 space-y-3">
              <li className="flex items-center text-gray-600">
                <i className="fas fa-check text-blue-500 mr-3"></i>
                Milestone Management
              </li>
              <li className="flex items-center text-gray-600">
                <i className="fas fa-check text-blue-500 mr-3"></i>
                Progress Analytics
              </li>
              <li className="flex items-center text-gray-600">
                <i className="fas fa-check text-blue-500 mr-3"></i>
                Deadline Reminders
              </li>
            </ul>
          </Card>

          <Card className="p-8 bg-white/50 backdrop-blur-sm border-2 border-blue-100 hover:border-blue-300 transition-all duration-300 hover:transform hover:-translate-y-2">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-5 rounded-2xl mb-8 w-16 h-16 flex items-center justify-center">
              <i className="fas fa-comments text-white text-2xl"></i>
            </div>
            <h3 className="text-2xl font-semibold text-[#0A192F] mb-4">Smart Collaboration</h3>
            <p className="text-gray-600 text-lg">
              Real-time communication and feedback system between students and supervisors.
            </p>
            <ul className="mt-6 space-y-3">
              <li className="flex items-center text-gray-600">
                <i className="fas fa-check text-blue-500 mr-3"></i>
                Instant Messaging
              </li>
              <li className="flex items-center text-gray-600">
                <i className="fas fa-check text-blue-500 mr-3"></i>
                Document Sharing
              </li>
              <li className="flex items-center text-gray-600">
                <i className="fas fa-check text-blue-500 mr-3"></i>
                Feedback System
              </li>
            </ul>
          </Card>

          <Card className="p-8 bg-white/50 backdrop-blur-sm border-2 border-blue-100 hover:border-blue-300 transition-all duration-300 hover:transform hover:-translate-y-2">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-5 rounded-2xl mb-8 w-16 h-16 flex items-center justify-center">
              <i className="fas fa-shield-alt text-white text-2xl"></i>
            </div>
            <h3 className="text-2xl font-semibold text-[#0A192F] mb-4">Secure Repository</h3>
            <p className="text-gray-600 text-lg">
              Enterprise-grade security for all your project documents and research materials.
            </p>
            <ul className="mt-6 space-y-3">
              <li className="flex items-center text-gray-600">
                <i className="fas fa-check text-blue-500 mr-3"></i>
                Version Control
              </li>
              <li className="flex items-center text-gray-600">
                <i className="fas fa-check text-blue-500 mr-3"></i>
                Backup System
              </li>
              <li className="flex items-center text-gray-600">
                <i className="fas fa-check text-blue-500 mr-3"></i>
                Access Control
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection; 