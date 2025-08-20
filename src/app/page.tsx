'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import StatisticsSection from '@/components/StatisticsSection';
import FeaturesSection from '@/components/FeaturesSection';
import AdditionalFeaturesSection from '@/components/AdditionalFeaturesSection';
import TestimonialsSection from '@/components/TestimonialsSection';
import CtaSection from '@/components/CtaSection';
import Footer from '@/components/Footer';

export default function Home() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  // Check for existing session on load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check for existing session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          // User is logged in, get their profile to determine where to redirect
          const { data: profileData } = await supabase
            .from("profiles")
            .select("user_type")
            .eq("id", session.user.id)
            .single();
            
          if (profileData) {
            // Redirect based on user type
            if (profileData.user_type === 'student') {
              router.push('/admin/studentdashboard');
              return; // Exit early
            } else if (profileData.user_type === 'supervisor') {
              router.push('/admin/supervisordashboard');
              return; // Exit early
            }
          }
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
      } finally {
        setIsChecking(false);
      }
    };
    
    checkAuth();
  }, [router]);
  
  // Show loading indicator while checking authentication
  if (isChecking) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-t-blue-600 border-blue-200 rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-700 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      <Header />
      <HeroSection />
      <StatisticsSection />
      <FeaturesSection />
      <AdditionalFeaturesSection />
      <TestimonialsSection />
      <CtaSection />
      <Footer />
    </main>
  );
}
