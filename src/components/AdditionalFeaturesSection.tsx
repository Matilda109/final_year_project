import React from 'react';

const AdditionalFeaturesSection: React.FC = () => {
  return (
    <section className="py-20 bg-[#F8FAFC]">
      <div className="container mx-auto px-6 lg:px-16">
        <div className="flex flex-col md:flex-row items-center gap-12">
          <div className="w-full md:w-1/2">
            <img
              src="https://readdy.ai/api/search-image?query=professional%20academic%20dashboard%20interface%20showing%20project%20timeline%2C%20feedback%20system%2C%20and%20submission%20tracking%2C%20clean%20blue%20and%20white%20UI%20design%2C%20data%20visualization%20elements%2C%20modern%20educational%20software%20interface%2C%20minimalist%20design&width=600&height=500&seq=4&orientation=landscape"
              alt="Advanced Features"
              className="w-full rounded-lg shadow-xl"
            />
          </div>
          <div className="w-full md:w-1/2">
            <h2 className="text-3xl md:text-4xl font-bold text-[#1B365D] mb-6">Advanced Management Tools</h2>
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="bg-[#4A90E2] p-2 rounded-full text-white mt-1">
                  <i className="fas fa-check"></i>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-[#1B365D] mb-2">Automated Progress Tracking</h3>
                  <p className="text-gray-600">Monitor project milestones and deadlines with automated reminders and progress visualization.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="bg-[#4A90E2] p-2 rounded-full text-white mt-1">
                  <i className="fas fa-check"></i>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-[#1B365D] mb-2">Real-time Feedback System</h3>
                  <p className="text-gray-600">Facilitate immediate communication between students and supervisors with in-line commenting and feedback tools.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="bg-[#4A90E2] p-2 rounded-full text-white mt-1">
                  <i className="fas fa-check"></i>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-[#1B365D] mb-2">Comprehensive Analytics</h3>
                  <p className="text-gray-600">Generate detailed reports on project performance, submission trends, and assessment outcomes.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AdditionalFeaturesSection; 