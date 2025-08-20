"use client";

import { useState, useEffect, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo');
  
  const [referenceNumber, setReferenceNumber] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // Check if the user is already logged in
  useEffect(() => {
    const checkExistingSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        console.log("User already has a session, redirecting...");
        handleRedirectAfterLogin(data.session.user.id);
      }
    };
    
    checkExistingSession();
  }, []);

  // Handle redirection based on user profile
  const handleRedirectAfterLogin = async (userId: string) => {
    try {
      console.log("Fetching user profile for redirect...");
      console.log("User ID:", userId);
      
      // Debug - check if the profile exists
      const { data: checkData, error: checkError } = await supabase
        .from("profiles")
        .select("*");
      
      console.log("All profiles:", checkData);
      
      // Get user profile to determine user type
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("user_type, reference_number")
        .eq("id", userId)
        .maybeSingle();

      if (profileError) {
        console.error("Profile fetch error:", profileError);
        setError(`Error fetching user profile: ${profileError.message}`);
        
        // Show debug info
        setDebugInfo({
          userId: userId,
          error: profileError,
          message: "Failed to find matching profile record",
          allProfiles: checkData
        });
        return;
      }

      if (!profileData) {
        console.error("No profile data found");
        setError("User profile not found. Make sure there's a profile record for your user ID.");
        
        // Show debug info
        setDebugInfo({
          userId: userId,
          message: "No profile found for this user ID",
          note: "You need to create a profile record with this exact user ID",
          allProfiles: checkData
        });
        return;
      }
      
      console.log(`User type identified: ${profileData.user_type}`);
      console.log(`Reference number: ${profileData.reference_number}`);
      console.log(`Redirect parameter: ${redirectTo}`);
      
      let redirectUrl = '';
      
      // If there's a redirectTo parameter and it's a dashboard route, use it
      if (redirectTo && (
          redirectTo.startsWith('/admin/studentdashboard') || 
          redirectTo.startsWith('/admin/supervisordashboard') ||
          redirectTo.startsWith('/admin/admindashboard')
        )) {
        // Make sure users can only access their respective dashboards
        if ((profileData.user_type === "student" && redirectTo.startsWith('/admin/studentdashboard')) ||
            (profileData.user_type === "supervisor" && redirectTo.startsWith('/admin/supervisordashboard')) ||
            (profileData.user_type === "admin" && redirectTo.startsWith('/admin/admindashboard'))) {
          redirectUrl = redirectTo;
        }
      }
      
      // If no valid redirectTo was found, use default routes
      if (!redirectUrl) {
        if (profileData.user_type === "student") {
          redirectUrl = "/admin/studentdashboard";
        } else if (profileData.user_type === "supervisor") {
          redirectUrl = "/admin/supervisordashboard";
        } else if (profileData.user_type === "admin") {
          redirectUrl = "/admin/admindashboard";
        } else {
          console.error(`Unknown user type: ${profileData.user_type}`);
          setError(`Unknown user type: ${profileData.user_type}`);
          return;
        }
      }
      
      console.log(`Redirecting to: ${redirectUrl}`);
      
      // Add a session parameter to help middleware detect authentication state
      const url = new URL(redirectUrl, window.location.origin);
      url.searchParams.set('hasSession', 'true');
      
      // Use window.location.href for hard navigation instead of router.push
      window.location.href = url.toString();
    } catch (error: any) {
      console.error("Error during redirect:", error);
      setError(`Redirect error: ${error.message}`);
      setDebugInfo({
        error: error.message,
        userId: userId,
        trace: error.stack
      });
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setDebugInfo(null);

    try {
      console.log(`Attempting login with: ${referenceNumber}`);
      
      // Sign in with Supabase (using the reference number directly as the email)
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: referenceNumber,
        password: password,
      });

      if (authError) {
        console.error("Auth error:", authError);
        setError(`Login failed: ${authError.message}`);
        setDebugInfo({
          errorType: authError.name,
          errorMessage: authError.message,
          attemptedEmail: referenceNumber,
          password: password.replace(/./g, '*'), // Masked for security
        });
        setLoading(false);
        return;
      }

      if (data?.user) {
        console.log("Login successful:", data.user);
        await handleRedirectAfterLogin(data.user.id);
      } else {
        console.error("No user data returned");
        setError("Login failed: No user data returned");
      }
    } catch (error: any) {
      console.error("Unexpected error:", error);
      setError(`Unexpected error: ${error.message || "Unknown error"}`);
      setDebugInfo({
        errorType: "UnexpectedError",
        errorMessage: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  // For development purposes - remove in production
  const createTestUsers = async () => {
    setLoading(true);
    setError(null);
    setDebugInfo(null);
    
    try {
      const studentEmail = "ce-stud001@st.umat.edu.gh";
      const supervisorEmail = "pe-msdayamba9021@st.umat.edu.gh";
      
      // First, check if the test user already exists
      const { data: existingUser, error: checkError } = await supabase.auth.signInWithPassword({
        email: studentEmail,
        password: "STUD001",
      });
      
      if (!checkError && existingUser?.user) {
        setDebugInfo({message: "Test users already exist! You can login with the test credentials"});
        setLoading(false);
        return;
      }
      
      // Create a test student
      const { data: studentData, error: studentError } = await supabase.auth.signUp({
        email: studentEmail,
        password: "STUD001",
      });

      if (studentError) {
        throw studentError;
      }
      
      if (studentData.user) {
        // Directly create verified user through admin API would be better
        // but for now, we'll just create the profile
        await supabase.from("profiles").insert({
          id: studentData.user.id,
          reference_number: studentEmail,
          user_type: "student",
          full_name: "Test Student",
          department: "Computer Science"
        });
      }

      // Create a test supervisor
      const { data: supervisorData, error: supervisorError } = await supabase.auth.signUp({
        email: supervisorEmail,
        password: "SUPER001",
      });

      if (supervisorError) {
        throw supervisorError;
      }
      
      if (supervisorData.user) {
        await supabase.from("profiles").insert({
          id: supervisorData.user.id,
          reference_number: supervisorEmail,
          user_type: "supervisor",
          full_name: "Dr. Stephen Anokye",
          department: "Computer Science"
        });
      }

      setDebugInfo({
        message: "Test users created successfully!", 
        note: "Important: You need to verify their emails before logging in. Check the Supabase authentication panel.",
        studentUserId: studentData.user?.id,
        supervisorUserId: supervisorData.user?.id
      });
    } catch (error: any) {
      console.error("Error creating test users:", error);
      setError(`Error creating test users: ${error.message}`);
      setDebugInfo({error});
    } finally {
      setLoading(false);
    }
  };

  // For development purposes - remove in production
  const checkSupabaseConnection = async () => {
    setLoading(true);
    setError(null);
    setDebugInfo(null);
    
    try {
      // First check if we can connect to Supabase
      const { data: pingData, error: pingError } = await supabase.from('_weed_ping').select('*').limit(1).maybeSingle();
      
      if (pingError && pingError.code !== 'PGRST116') {
        // Any error besides "relation does not exist" indicates a connection problem
        throw pingError;
      }
      
      // Check if the profiles table exists
      const { data, error } = await supabase.from('profiles').select('count').limit(1);
      
      // Get current auth session
      const { data: sessionData } = await supabase.auth.getSession();
      
      setDebugInfo({
        connection: error ? "Failed" : "Success",
        error: error?.message || null,
        data: data || null,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        anonKeyExists: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
        anonKeyStart: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 10) + '...',
        sessionExists: Boolean(sessionData?.session),
        sessionUser: sessionData?.session?.user?.email || null,
      });
    } catch (error: any) {
      console.error("Supabase connection error:", error);
      setDebugInfo({
        connection: "Failed with exception",
        error: error.message,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        anonKeyExists: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      });
    } finally {
      setLoading(false);
    }
  };

  // For development purposes - remove in production
  const createAdminUser = async () => {
    setLoading(true);
    setError(null);
    setDebugInfo(null);
    
    try {
      const adminEmail = "mc-apunobyin9421@stu.umat.edu.gh";
      
      // First, check if the admin user already exists
      const { data: existingUser, error: checkError } = await supabase.auth.signInWithPassword({
        email: adminEmail,
        password: "ADMIN001",
      });
      
      if (!checkError && existingUser?.user) {
        setDebugInfo({message: `Admin user already exists! You can login with ${adminEmail}`});
        setLoading(false);
        return;
      }
      
      // Create a test admin
      const { data: adminData, error: adminError } = await supabase.auth.signUp({
        email: adminEmail,
        password: "ADMIN001",
      });

      if (adminError) {
        throw adminError;
      }
      
      if (adminData.user) {
        // Create the admin profile
        await supabase.from("profiles").insert({
          id: adminData.user.id,
          reference_number: adminEmail,
          user_type: "admin",
          full_name: "James Amoah",
          department: "Computer Science"
        });
      }

      setDebugInfo({
        message: "Admin user created successfully!", 
        note: "Important: You need to verify the email before logging in. Check the Supabase authentication panel.",
        adminUserId: adminData.user?.id,
      });
    } catch (error: any) {
      console.error("Error creating admin user:", error);
      setError(`Error creating admin user: ${error.message}`);
      setDebugInfo({error});
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center p-4 md:p-8 overflow-hidden">
      {/* Blurred image background */}
      <div className="absolute inset-0 -z-10">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-70"
          style={{ 
            backgroundImage: "url('/sch.jpg')",
          }}
        />
        <div className="absolute inset-0 bg-[#1B365D]/60" />
        <div className="absolute inset-0 backdrop-blur-[60px]" />
      </div>
      
      <Card className="w-full max-w-4xl overflow-hidden rounded-xl border-0 shadow-xl bg-white/90 backdrop-blur-sm">
        <div className="flex flex-col md:flex-row">
          {/* Left side with images */}
          <div className="relative hidden md:block md:w-1/2 bg-gradient-to-b from-[#1B365D] to-[#2A5DA8]">
            <div className="absolute inset-0 flex flex-col justify-between p-8 text-white">
              <div>
                <h2 className="text-2xl font-bold">Welcome Back</h2>
                <p className="mt-2 text-sm opacity-80">Sign in to access your project management dashboard</p>
              </div>
              <div className="flex flex-col gap-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                    <Image src="/file.svg" alt="Project Management" width={20} height={20} className="text-white" />
                  </div>
                  <div>
                    <p className="font-medium">Efficient Project Management</p>
                    <p className="text-xs opacity-80">Organize and track your projects with ease</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                    <Image src="/globe.svg" alt="Global Access" width={20} height={20} />
                  </div>
                  <div>
                    <p className="font-medium">Access Anywhere</p>
                    <p className="text-xs opacity-80">Manage your projects from any device</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right side with form */}
          <div className="p-6 md:p-8 md:w-1/2">
            {showForgotPassword ? (
              <ForgotPasswordForm onBackToLogin={() => setShowForgotPassword(false)} />
            ) : (
              <>
                <div className="mb-8 text-center md:text-left">
                  <h1 className="text-2xl font-bold text-[#1B365D]">Sign In</h1>
                  <p className="mt-2 text-sm text-gray-600">Enter your school reference number to access your account</p>
                </div>
                
                <form className="space-y-4" onSubmit={handleLogin}>
                  {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                      {error}
                    </div>
                  )}
                  
                  {debugInfo && process.env.NODE_ENV === 'development' && (
                    <div className="bg-blue-50 text-blue-600 p-3 rounded-md text-xs overflow-auto max-h-24">
                      <div className="font-semibold mb-1">Debug Info:</div>
                      <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
                    </div>
                  )}
                  
                  <div>
                    <label htmlFor="reference-number" className="block text-sm font-medium text-gray-700">
                      Email Address
                    </label>
                    <input
                      id="reference-number"
                      type="text"
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[#1B365D] focus:outline-none focus:ring-1 focus:ring-[#1B365D]"
                      placeholder="e.g., ce-ezbahiise6321@st.umat.edu.gh"
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Enter your full email address (format: ce-***@st.umat.edu.gh)
                    </p>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between">
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                        Password
                      </label>
                      <button 
                        type="button"
                        onClick={() => setShowForgotPassword(true)}
                        className="text-xs font-medium text-[#1B365D] hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <input
                      id="password"
                      type="password"
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[#1B365D] focus:outline-none focus:ring-1 focus:ring-[#1B365D]"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      For first-time login, your password may be the same as your student ID
                    </p>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      id="remember-me"
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-[#1B365D] focus:ring-[#1B365D]"
                    />
                    <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                      Remember me
                    </label>
                  </div>
                  
                  <Button 
                    className="w-full bg-[#1B365D] text-white hover:bg-[#2A5DA8]"
                    disabled={loading}
                    type="submit"
                  >
                    {loading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>
                
                {/* Development tools - remove in production */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="pt-8 border-t border-gray-200">
                    <details className="text-sm text-gray-600">
                      <summary className="cursor-pointer font-medium">Developer Tools</summary>
                      <div className="mt-3 space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={createTestUsers}
                            disabled={loading}
                            className="bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded text-xs"
                          >
                            Create Test Users
                          </button>
                          <button
                            onClick={createAdminUser}
                            disabled={loading}
                            className="bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded text-xs"
                          >
                            Create Admin User
                          </button>
                          <button
                            onClick={checkSupabaseConnection}
                            disabled={loading}
                            className="bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded text-xs"
                          >
                            Check Supabase Connection
                          </button>
                        </div>
                      </div>
                    </details>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </Card>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse text-center">
          <div className="text-2xl font-semibold mb-2">Loading...</div>
          <p className="text-gray-600">Preparing your login experience</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
} 