import React from 'react';
import { Button } from "@/components/ui/button";

const HeroSection: React.FC = () => {
  return (
    <section id="home" className="relative pt-20 min-h-[50vh] flex items-center bg-gradient-to-br from-[#0A192F] to-[#112A46]">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[url('https://readdy.ai/api/search-image?query=abstract%20geometric%20pattern%20with%20connected%20dots%20and%20lines%2C%20technology%20network%20concept%2C%20dark%20blue%20professional%20background%20with%20subtle%20grid%20overlay%2C%20perfect%20for%20enterprise%20software%20interface&width=1440&height=800&seq=5&orientation=landscape')] opacity-10 bg-cover bg-center"></div>
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-white/60 via-white/30 to-transparent z-0"></div>
      <div className="container mx-auto px-6 lg:px-16 relative z-10">
        <div className="text-center max-w-4xl mx-auto mb-16">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
            Project Management System
          </h1>
          <p className="text-base md:text-lg text-blue-100/90 mb-8 max-w-2xl mx-auto">
            Empowering students and supervisors with intelligent project tracking, seamless collaboration, and comprehensive management tools.
          </p>
          
        </div>
        <div className="mt-12 flex justify-center">
          <div className="relative w-full max-w-5xl">
            <img
              src="https://readdy.ai/api/search-image?query=modern%20enterprise%20dashboard%20interface%20showing%20project%20management%20system%20with%20dark%20theme%2C%20multiple%20project%20cards%2C%20progress%20tracking%2C%20timeline%20visualization%2C%20notification%20center%2C%20clean%20and%20professional%20UI%20design%20focused%20on%20academic%20project%20management&width=1200&height=600&seq=6&orientation=landscape"
              alt="Project Management Dashboard"
              className="w-full rounded-xl shadow-2xl border border-blue-400/20"
            />
            <div className="absolute  bg-white/50 backdrop-blur-sm text-black px-4 py-2 rounded-full text-xs font-medium shadow-lg bottom-50 left-1/2 transform -translate-x-1/2 flex gap-4">
              <div className="bg-blue-500/90 backdrop-blur-sm text-white px-4 py-2 rounded-full text-xs font-medium shadow-lg">
                <i className="fas fa-chart-line mr-2"></i>
                Real-time Analytics
              </div>
              <div className="bg-blue-500/90 backdrop-blur-sm text-white px-4 py-2 rounded-full text-xs font-medium shadow-lg">
                <i className="fas fa-clock mr-2"></i>
                Automated Tracking
              </div>
              <div className="bg-blue-500/90 backdrop-blur-sm text-white px-4 py-2 rounded-full text-xs font-medium shadow-lg">
                <i className="fas fa-shield-alt mr-2"></i>
                Secure Platform
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection; 