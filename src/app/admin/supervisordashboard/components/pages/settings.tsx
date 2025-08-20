"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { supabase } from "@/lib/supabase"
import { Loader2, Eye, EyeOff } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"

interface SupervisorProfile {
  id: string
  full_name: string
  reference_number: string
  email: string
  department: string
}

export function Settings() {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<SupervisorProfile | null>(null)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setLoading(true)
        console.log("Starting to fetch supervisor profile data...")
        
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError) {
          console.error("Error fetching user:", userError)
          return
        }
        
        if (!user) {
          console.error("No user found")
          setLoading(false)
          return
        }
        
        console.log("User authenticated:", user.id, user.email)
        
        // Get supervisor profile
        console.log("Fetching profile data for user ID:", user.id)
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name, reference_number, email, department')
          .eq('id', user.id)
          .single()
        
        if (profileError) {
          console.error("Error fetching profile:", profileError)
        } else if (profileData) {
          console.log("Profile data fetched successfully:", profileData)
          setProfile(profileData)
        } else {
          console.error("No profile data returned")
        }
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchProfileData()
  }, [])
  
  // Debug: Log profile data whenever it changes
  useEffect(() => {
    console.log("Profile data updated:", profile)
  }, [profile])

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!currentPassword) {
      toast.error("Current password is required")
      return
    }
    
    if (newPassword !== confirmPassword) {
      toast.error("Passwords don't match")
      return
    }
    
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters")
      return
    }
    
    try {
      setIsSubmitting(true)
      
      // First verify the current password is correct
      console.log("Verifying current password for supervisor");
      
      // Get current user session to get the exact email used for authentication
      const { data: sessionData } = await supabase.auth.getSession();
      const authEmail = sessionData?.session?.user?.email || profile?.email || '';
      
      console.log("Using auth email:", authEmail);
      
      // Trim the password to avoid whitespace issues
      const trimmedCurrentPassword = currentPassword.trim();
      
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: trimmedCurrentPassword
      });
      
      if (signInError) {
        console.error("Password verification failed:", signInError);
        toast.error("Current password is incorrect");
        return;
      }
      
      console.log("Current password verified successfully, updating to new password");
      
      // If current password is correct, update to the new password
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) {
        toast.error(error.message);
        return;
      }
      
      toast.success("Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error("Error updating password:", error);
      toast.error("Failed to update password");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    )
  }

  console.log("Rendering supervisor settings with profile:", profile)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Supervisor Profile</h1>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="profile">Profile Information</TabsTrigger>
          <TabsTrigger value="security">Security & Password</TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 p-6 shadow-md">
              <h2 className="text-xl font-semibold mb-6">Supervisor Details</h2>
              <div className="space-y-5">
                <div className="flex items-center space-x-4 mb-6">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src="/placeholder.svg" alt="Profile" />
                    <AvatarFallback>
                      {profile?.full_name?.split(' ').map(name => name[0]).join('') || 'SV'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-bold text-lg">{profile?.full_name || 'Supervisor Name'}</h3>
                    <p className="text-gray-500">{profile?.department || 'Department'}</p>
                    <p className="text-gray-500">Senior Supervisor</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Full Name</label>
                    <Input
                      type="text"
                      value={profile?.full_name || ''}
                      readOnly
                      className="!rounded-button bg-gray-100 border-gray-300 text-gray-600"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Email Address</label>
                    <Input
                      type="email"
                      value={profile?.email || ''}
                      readOnly
                      className="!rounded-button bg-gray-100 border-gray-300 text-gray-600"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Department</label>
                    <Input
                      type="text"
                      value={profile?.department || ''}
                      readOnly
                      className="!rounded-button bg-gray-100 border-gray-300 text-gray-600"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Reference Number</label>
                    <Input
                      type="text"
                      value={profile?.reference_number || ''}
                      readOnly
                      className="!rounded-button bg-gray-100 border-gray-300 text-gray-600"
                    />
                  </div>
                </div>
              </div>
            </Card>

            <div className="space-y-6">
              <Card className="p-6 shadow-md">
                <h3 className="font-bold mb-4">Notification Settings</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Email Notifications</p>
                      <p className="text-xs text-gray-500">Receive updates via email</p>
                    </div>
                    <Checkbox defaultChecked disabled />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Project Submissions</p>
                      <p className="text-xs text-gray-500">When students submit projects</p>
                    </div>
                    <Checkbox defaultChecked disabled />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Meeting Reminders</p>
                      <p className="text-xs text-gray-500">Upcoming scheduled meetings</p>
                    </div>
                    <Checkbox defaultChecked disabled />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">System Announcements</p>
                      <p className="text-xs text-gray-500">Updates and maintenance notices</p>
                    </div>
                    <Checkbox disabled />
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="security">
          <Card className="p-6 shadow-md">
            <h2 className="text-xl font-semibold mb-6">Password Reset</h2>
            <form onSubmit={handlePasswordReset} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Current Password</label>
                  <div className="relative">
                    <Input
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="!rounded-button pr-10"
                      placeholder="Enter your current password"
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 transform -translate-y-1/2"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-500" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-500" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">New Password</label>
                  <div className="relative">
                    <Input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="!rounded-button pr-10"
                      placeholder="Enter new password"
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 transform -translate-y-1/2"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-500" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-500" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Password must be at least 8 characters long
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Confirm New Password</label>
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="!rounded-button pr-10"
                      placeholder="Confirm new password"
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 transform -translate-y-1/2"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-500" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-500" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update Password"
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
