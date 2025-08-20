"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { LogOut } from "lucide-react"
import tabSessionManager from "@/lib/tabSessionManager"
import { supabase } from "@/lib/supabase"

interface HeaderProps {
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
}

export default function Header({ activeTab, setActiveTab }: HeaderProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [studentName, setStudentName] = useState("Student");
  const [department, setDepartment] = useState("");
  const [initials, setInitials] = useState("ST");

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Get current authenticated user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          console.error("Error fetching user:", userError);
          return;
        }

        // Fetch profile from the profiles table based on SUPABASE_SETUP.md
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('full_name, department')
          .eq('id', user.id)
          .eq('user_type', 'student')
          .single();

        if (profileError) {
          console.error("Error fetching profile data:", profileError);
          return;
        }

        if (profileData) {
          setStudentName(profileData.full_name || "Student");
          setDepartment(profileData.department || "");
          
          // Generate initials from name
          if (profileData.full_name) {
            const nameWords = profileData.full_name.split(' ');
            const initials = nameWords.length > 1 
              ? `${nameWords[0][0]}${nameWords[1][0]}`
              : `${nameWords[0][0]}${nameWords[0][1] || ''}`;
            setInitials(initials.toUpperCase());
          }
        } else {
          console.log("No profile data found for user");
        }
      } catch (error) {
        console.error("Failed to fetch profile data:", error);
      }
    };

    fetchUserData();
  }, []);

  const handleLogout = async () => {
    if (confirm("Are you sure you want to log out?")) {
      try {
        setIsLoggingOut(true);
        await tabSessionManager.logout('/login', true);
      } catch (error) {
        console.error("Error during logout:", error);
        setIsLoggingOut(false);
        alert("Failed to log out. Please try again.");
      }
    }
  }

  const handleProfileSettingsClick = () => {
    if (setActiveTab) {
      setActiveTab("settings");
    }
  }

  return (
    <header className="bg-white border-b px-6 py-3 sticky top-0 z-10 shadow-sm">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">Student Dashboard</h1>

        <div className="flex items-center">
          <div className="mr-4 text-right hidden sm:block">
            <p className="font-medium text-gray-800">{studentName}</p>
            <p className="text-xs text-gray-500">{department}</p>
          </div>
        
          {/* Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="relative flex items-center gap-2 bg-blue-50 border-blue-200 hover:bg-blue-100 hover:border-blue-300 text-blue-700" size="sm">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/placeholder.svg" />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <span className="sm:hidden font-medium">{studentName}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleProfileSettingsClick}>Profile Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} disabled={isLoggingOut} className="text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                <span>{isLoggingOut ? "Logging out..." : "Logout"}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
