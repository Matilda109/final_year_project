"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { supabase } from "@/lib/supabase"
import { Loader2, Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"

interface StudentProfile {
  id: string
  full_name: string
  reference_number: string
  email: string
  department: string
}

interface SupervisorInfo {
  name: string
  reference_number: string
  email: string
  department: string
}

const SettingsTab: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<StudentProfile | null>(null)
  const [supervisor, setSupervisor] = useState<SupervisorInfo | null>(null)
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
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          console.error("No user found")
          setLoading(false)
          return
        }
        
        // Get student profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name, reference_number, email, department')
          .eq('id', user.id)
          .single()
        
        if (profileError) {
          console.error("Error fetching profile:", profileError)
        } else if (profileData) {
          setProfile(profileData)
        }
        
        // Get supervisor information
        const { data: relationship, error: relationshipError } = await supabase
          .from('student_supervisor_relationships_view')
          .select('supervisor_id, supervisor_name, supervisor_reference, department')
          .eq('student_id', user.id)
          .eq('status', 'active')
          .single()
        
        if (relationshipError) {
          if (relationshipError.code !== 'PGRST116') { // No rows returned error
            console.error("Error fetching supervisor relationship:", relationshipError)
          }
        } else if (relationship) {
          // Get supervisor email
          const { data: supervisorProfile, error: supervisorError } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', relationship.supervisor_id)
            .single()
            
          let supervisorEmail = ""
          if (supervisorError) {
            console.error("Error fetching supervisor email:", supervisorError)
          } else if (supervisorProfile) {
            supervisorEmail = supervisorProfile.email || ""
          }
          
          setSupervisor({
            name: relationship.supervisor_name,
            reference_number: relationship.supervisor_reference,
            email: supervisorEmail,
            department: relationship.department
          })
        }
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchProfileData()
  }, [])

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
      console.log("Verifying current password for student");
      
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

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-1">Student Profile</h2>
        <p className="text-gray-500">Your personal information and account details</p>
      </div>

      <Tabs defaultValue="personal">
        <TabsList className="mb-6">
          <TabsTrigger value="personal">Personal Information</TabsTrigger>
          <TabsTrigger value="supervisor">Supervisor</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="personal">
          <Card>
            <CardHeader>
              <CardTitle>Student Details</CardTitle>
              <CardDescription>Your personal and academic information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-8">
                <div className="md:w-1/3 flex flex-col items-center">
                  <Avatar className="w-32 h-32 border-4 border-white shadow">
                    <AvatarImage src="/placeholder.svg" />
                    <AvatarFallback>
                      {profile?.full_name?.split(' ').map(name => name[0]).join('') || 'ST'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="mt-4 text-center">
                    <h3 className="font-medium text-lg">{profile?.full_name || 'Student Name'}</h3>
                    <p className="text-gray-500">{profile?.department || 'Department'}</p>
                    <p className="text-gray-500">ID: {profile?.reference_number || 'N/A'}</p>
                  </div>
                </div>

                <div className="md:w-2/3 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input
                        id="fullName"
                        value={profile?.full_name || ''}
                        readOnly
                        className="!rounded-button bg-gray-100 border-gray-300 text-gray-600"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        value={profile?.email || ''}
                        readOnly
                        className="!rounded-button bg-gray-100 border-gray-300 text-gray-600"
                      />
                    </div>
                    <div>
                      <Label htmlFor="department">Department</Label>
                      <Input
                        id="department"
                        value={profile?.department || ''}
                        readOnly
                        className="!rounded-button bg-gray-100 border-gray-300 text-gray-600"
                      />
                    </div>
                    <div>
                      <Label htmlFor="referenceNumber">Reference Number</Label>
                      <Input
                        id="referenceNumber"
                        value={profile?.reference_number || ''}
                        readOnly
                        className="!rounded-button bg-gray-100 border-gray-300 text-gray-600"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="supervisor">
          <Card>
            <CardHeader>
              <CardTitle>Supervisor Information</CardTitle>
              <CardDescription>Your assigned supervisor details</CardDescription>
            </CardHeader>
            <CardContent>
              {supervisor ? (
                <div className="space-y-6">
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-16 w-16">
                      <AvatarFallback>
                        {supervisor.name?.split(' ').map(name => name[0]).join('') || 'SV'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-medium text-lg">{supervisor.name || 'Not Assigned'}</h3>
                      <p className="text-gray-500">{supervisor.department || 'Department'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Name</Label>
                      <Input
                        value={supervisor.name || ''}
                        readOnly
                        className="!rounded-button bg-gray-100 border-gray-300 text-gray-600"
                      />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input
                        value={supervisor.email || ''}
                        readOnly
                        className="!rounded-button bg-gray-100 border-gray-300 text-gray-600"
                      />
                    </div>
                    <div>
                      <Label>Department</Label>
                      <Input
                        value={supervisor.department || ''}
                        readOnly
                        className="!rounded-button bg-gray-100 border-gray-300 text-gray-600"
                      />
                    </div>
                    <div>
                      <Label>Reference Number</Label>
                      <Input
                        value={supervisor.reference_number || ''}
                        readOnly
                        className="!rounded-button bg-gray-100 border-gray-300 text-gray-600"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">No supervisor assigned yet.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Password Reset</CardTitle>
              <CardDescription>Update your account password</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordReset} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        type={showCurrentPassword ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="!rounded-button pr-10 text-gray-800 bg-white"
                        placeholder="Enter your current password"
                        required
                        style={{ color: '#1f2937' }}
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
                    <Label htmlFor="newPassword">New Password</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="!rounded-button pr-10 text-gray-800 bg-white"
                        placeholder="Enter new password"
                        required
                        style={{ color: '#1f2937' }}
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
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="!rounded-button pr-10 text-gray-800 bg-white"
                        placeholder="Confirm new password"
                        required
                        style={{ color: '#1f2937' }}
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default SettingsTab
