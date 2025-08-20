import React from 'react';
import { Card } from "@/components/ui/card";

const TestimonialsSection: React.FC = () => {
  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-6 lg:px-16">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-[#1B365D] mb-4">What Our Users Say</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Hear from students and faculty members who have experienced the benefits of our system
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="p-8 shadow-md">
            <div className="flex items-center mb-6">
              <div className="mr-4">
                <i className="fas fa-quote-left text-[#4A90E2] text-4xl"></i>
              </div>
              <div>
                <p className="text-gray-700 italic">
                  "The Final Year Project Management System has revolutionized how I track student progress. The automated notifications and centralized document storage have saved me countless hours."
                </p>
                <div className="mt-4 flex items-center">
                  <div className="bg-[#1B365D] text-white w-10 h-10 rounded-full flex items-center justify-center mr-3">
                    <i className="fas fa-user"></i>
                  </div>
                  <div>
                    <div className="font-semibold text-[#1B365D]">Dr. Samuel Owusu</div>
                    <div className="text-sm text-gray-500">Project Supervisor, Engineering Department</div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
          <Card className="p-8 shadow-md">
            <div className="flex items-center mb-6">
              <div className="mr-4">
                <i className="fas fa-quote-left text-[#4A90E2] text-4xl"></i>
              </div>
              <div>
                <p className="text-gray-700 italic">
                  "As a final year student, this platform made my project submission process seamless. The feedback system allowed me to quickly iterate on my work based on my supervisor's comments."
                </p>
                <div className="mt-4 flex items-center">
                  <div className="bg-[#1B365D] text-white w-10 h-10 rounded-full flex items-center justify-center mr-3">
                    <i className="fas fa-user-graduate"></i>
                  </div>
                  <div>
                    <div className="font-semibold text-[#1B365D]">Abena Mensah</div>
                    <div className="text-sm text-gray-500">Computer Science Graduate, Class of 2024</div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection; 