"use client"

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Save, AlertCircle, Eye, EyeOff } from "lucide-react"
import { supabase } from '@/lib/supabase'
import { toast } from "sonner"

interface AdminProfile {
  id: string
  full_name: string
  email: string
  reference_number?: string
  department?: string
}

export default function SettingsTab() {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<AdminProfile | null>(null)
  const [accountSettings, setAccountSettings] = useState({
    fullName: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  
  const [systemSettings, setSystemSettings] = useState({
    maxStudentsPerSupervisor: 10,
    defaultDepartment: 'Computer Science',
    enableNotifications: true,
    notificationFrequency: 'daily',
  })
  
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch profile data on component mount
  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setLoading(true)
        
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
        
        // Get admin profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name, email, reference_number, department')
          .eq('id', user.id)
          .single()
        
        if (profileError) {
          console.error("Error fetching profile:", profileError)
          toast.error("Failed to fetch profile data")
        } else if (profileData) {
          setProfile(profileData)
          setAccountSettings({
            ...accountSettings,
            fullName: profileData.full_name || '',
            email: profileData.email || ''
          })
        }
        
        // Fetch system settings (this would typically come from a system_settings table)
        // For now, we'll use the default values
        
      } catch (error) {
        console.error("Error fetching profile data:", error)
        toast.error("Failed to load settings")
      } finally {
        setLoading(false)
      }
    }
    
    fetchProfileData()
  }, [])
  
  const handleAccountSettingChange = (field: string, value: string) => {
    setAccountSettings({
      ...accountSettings,
      [field]: value
    })
  }
  
  const handleSystemSettingChange = (field: string, value: any) => {
    setSystemSettings({
      ...systemSettings,
      [field]: value
    })
  }
  
  const handleUpdateAccount = async () => {
    if (!profile) return
    
    setIsSubmitting(true)
    
    // Check if we're trying to update the password
    const isPasswordUpdate = accountSettings.newPassword && accountSettings.currentPassword
    
    // Validate passwords match if changing password
    if (accountSettings.newPassword || accountSettings.confirmPassword) {
      if (accountSettings.newPassword !== accountSettings.confirmPassword) {
        toast.error("Passwords do not match")
        setIsSubmitting(false)
        return
      }
      
      if (accountSettings.newPassword.length < 8) {
        toast.error("Password must be at least 8 characters long")
        setIsSubmitting(false)
        return
      }
      
      if (!accountSettings.currentPassword) {
        toast.error("Current password is required to set a new password")
        setIsSubmitting(false)
        return
      }
    }
    
    try {
      // Update profile if name changed
      if (accountSettings.fullName !== profile.full_name) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ full_name: accountSettings.fullName })
          .eq('id', profile.id)
        
        if (updateError) {
          throw new Error("Failed to update profile")
        }
      }
      
      // Change password if provided
      if (isPasswordUpdate) {
        try {
          // First verify the current password is correct
          console.log("Verifying current password for:", profile.email);
          
          // Get current user session to get the exact email used for authentication
          const { data: sessionData } = await supabase.auth.getSession();
          const authEmail = sessionData?.session?.user?.email || profile.email;
          
          console.log("Using auth email:", authEmail);
          
          // Trim the password to avoid whitespace issues
          const trimmedCurrentPassword = accountSettings.currentPassword.trim();
          
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: authEmail,
            password: trimmedCurrentPassword
          });
          
          if (signInError) {
            console.error("Password verification failed:", signInError);
            toast.error("Current password is incorrect");
            throw new Error("Current password verification failed");
          }
          
          console.log("Current password verified successfully, updating to new password");
          
          // If current password is correct, update to the new password
          const { error: passwordError } = await supabase.auth.updateUser({
            password: accountSettings.newPassword
          });
          
          if (passwordError) {
            throw new Error(`Failed to update password: ${passwordError.message}`);
          }
          
          toast.success("Password updated successfully");
        } catch (passwordError: any) {
          // Don't show generic error message if we already showed specific one
          if (!passwordError.message.includes("Current password verification failed")) {
            toast.error(passwordError.message || "Failed to update password");
          }
          // Continue with other updates even if password update failed
        }
      }
      
      // Only show general success message if no password update or if password update succeeded
      if (!isPasswordUpdate) {
        toast.success("Account settings updated successfully")
      }
      
      // Clear password fields
      setAccountSettings({
        ...accountSettings,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
    } catch (error: any) {
      console.error("Error updating account:", error)
      toast.error(error.message || "Failed to update account settings")
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const handleSaveSystemSettings = async () => {
    setIsSubmitting(true)
    
    try {
      // Here you would typically save to a system_settings table
      // For this example, we'll just simulate success
      await new Promise(resolve => setTimeout(resolve, 1000))
      toast.success("System settings saved successfully")
    } catch (error) {
      console.error("Error saving system settings:", error)
      toast.error("Failed to save system settings")
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const handleResetSystemSettings = () => {
    setSystemSettings({
      maxStudentsPerSupervisor: 10,
      defaultDepartment: 'Computer Science',
      enableNotifications: true,
      notificationFrequency: 'daily',
    })
    toast.info("System settings reset to defaults")
  }

  const handleDangerAction = (action: string) => {
    toast.error(`This action (${action}) is not implemented in this demo`)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-gray-500">Manage your account and system settings.</p>
      </div>
      
      {/* Account Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Account Settings</CardTitle>
          <CardDescription>Update your account information and change your password</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-1">
            <Label htmlFor="fullName">Full Name</Label>
            <Input 
              id="fullName" 
              value={accountSettings.fullName}
              onChange={(e) => handleAccountSettingChange('fullName', e.target.value)}
              placeholder="Your full name"
            />
          </div>
          
          <div className="space-y-1">
            <Label htmlFor="email">Email Address</Label>
            <Input 
              id="email" 
              type="email"
              value={accountSettings.email}
              onChange={(e) => handleAccountSettingChange('email', e.target.value)}
              placeholder="Your email address"
              disabled
            />
            <p className="text-sm text-gray-500">Email cannot be changed directly. Contact system administrator.</p>
          </div>
          
          <Separator />
          
          <div>
            <h3 className="text-lg font-medium mb-4">Change Password</h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="currentPassword">Current Password</Label>
                <div className="relative">
                  <Input 
                    id="currentPassword" 
                    type={showCurrentPassword ? "text" : "password"}
                    value={accountSettings.currentPassword}
                    onChange={(e) => handleAccountSettingChange('currentPassword', e.target.value)}
                    className="pr-10"
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
              <div className="space-y-1">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input 
                    id="newPassword" 
                    type={showNewPassword ? "text" : "password"}
                    value={accountSettings.newPassword}
                    onChange={(e) => handleAccountSettingChange('newPassword', e.target.value)}
                    className="pr-10"
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
                <p className="text-sm text-gray-500 mt-1">
                  Password must be at least 8 characters long
                </p>
              </div>
              <div className="space-y-1">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Input 
                    id="confirmPassword" 
                    type={showConfirmPassword ? "text" : "password"}
                    value={accountSettings.confirmPassword}
                    onChange={(e) => handleAccountSettingChange('confirmPassword', e.target.value)}
                    className="pr-10"
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
          </div>
        </CardContent>
        <CardFooter>
          <Button
            onClick={handleUpdateAccount}
            disabled={isSubmitting}
          >
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Account Settings
          </Button>
        </CardFooter>
      </Card>
      
      {/* System Settings */}
      <Card>
        <CardHeader>
          <CardTitle>System Settings</CardTitle>
          <CardDescription>Configure global settings for the student-supervisor management system</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="maxStudents" className="block mb-1">Maximum Students per Supervisor</Label>
              <p className="text-sm text-gray-500">Limit the number of students that can be assigned to a single supervisor</p>
            </div>
            <Input 
              id="maxStudents"
              type="number"
              className="w-20 text-right"
              value={systemSettings.maxStudentsPerSupervisor}
              onChange={(e) => handleSystemSettingChange('maxStudentsPerSupervisor', parseInt(e.target.value))}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="defaultDepartment" className="block mb-1">Default Department</Label>
              <p className="text-sm text-gray-500">Set the default department for new users</p>
            </div>
            <div className="w-56">
              <Input 
                id="defaultDepartment"
                value={systemSettings.defaultDepartment}
                onChange={(e) => handleSystemSettingChange('defaultDepartment', e.target.value)}
              />
            </div>
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div>
              <Label className="block mb-1">Enable Notifications</Label>
              <p className="text-sm text-gray-500">Send email notifications for new assignments and updates</p>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="enableNotifications" 
                checked={systemSettings.enableNotifications}
                onCheckedChange={(checked: boolean) => handleSystemSettingChange('enableNotifications', checked)}
              />
              <Label htmlFor="enableNotifications">
                {systemSettings.enableNotifications ? "Enabled" : "Disabled"}
              </Label>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="notificationFrequency" className="block mb-1">Notification Frequency</Label>
              <p className="text-sm text-gray-500">How often to send digest notifications</p>
            </div>
            <div className="w-40">
              <Select 
                value={systemSettings.notificationFrequency} 
                onValueChange={(value) => handleSystemSettingChange('notificationFrequency', value)}
                disabled={!systemSettings.enableNotifications}
              >
                <SelectTrigger id="notificationFrequency">
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="realtime">Real-time</SelectItem>
                  <SelectItem value="daily">Daily Digest</SelectItem>
                  <SelectItem value="weekly">Weekly Digest</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={handleResetSystemSettings}>
            Reset to Defaults
          </Button>
          <Button
            onClick={handleSaveSystemSettings}
            disabled={isSubmitting}
          >
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save System Settings
          </Button>
        </CardFooter>
      </Card>
      
      {/* Danger Zone */}
      <Card className="border-red-200">
        <CardHeader className="text-red-600">
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription className="text-red-600">
            These actions are destructive and cannot be undone
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Clear All Relationships</h3>
                <p className="text-sm text-gray-500">Remove all student-supervisor relationships</p>
              </div>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => handleDangerAction("clear relationships")}
              >
                Clear All
              </Button>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Reset System</h3>
                <p className="text-sm text-gray-500">Reset the entire system to its initial state</p>
              </div>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => handleDangerAction("reset system")}
              >
                Reset System
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 