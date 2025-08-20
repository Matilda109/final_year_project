import React from 'react';

const StatisticsSection: React.FC = () => {
  return (
    <section className="bg-[#F8FAFC] py-16">
      <div className="container mx-auto px-6 lg:px-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-lg shadow-md text-center">
            <div className="text-[#4A90E2] text-4xl font-bold mb-2">500+</div>
            <div className="text-[#1B365D] font-medium">Projects Completed</div>
          </div>
          <div className="bg-white p-8 rounded-lg shadow-md text-center">
            <div className="text-[#4A90E2] text-4xl font-bold mb-2">98%</div>
            <div className="text-[#1B365D] font-medium">Submission Success Rate</div>
          </div>
          <div className="bg-white p-8 rounded-lg shadow-md text-center">
            <div className="text-[#4A90E2] text-4xl font-bold mb-2">24/7</div>
            <div className="text-[#1B365D] font-medium">System Availability</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default StatisticsSection; 