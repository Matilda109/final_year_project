import React from 'react';
import { Button } from "@/components/ui/button";

const CtaSection: React.FC = () => {
  return (
    <section className="py-20 bg-[#1B365D] text-white">
      <div className="container mx-auto px-6 lg:px-16 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Get Started?</h2>
        <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
          Join hundreds of students and faculty members already using our platform
        </p>
        
      </div>
    </section>
  );
};

export default CtaSection; 