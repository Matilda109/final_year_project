"use client"

import { useState, useEffect } from 'react'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, Plus, Filter, MoreHorizontal, Search, Download, Trash2, Edit, UserPlus } from 'lucide-react'
import { supabase, supabaseAdmin, getAdminClient } from '@/lib/supabase'
import { Badge } from '@/components/ui/badge'
import { UserTypeBadge } from '@/components/ui/user-type-badge'
import { VerificationBadge } from '@/components/ui/verification-badge'

interface User {
  id: string
  full_name: string
  reference_number: string
  email: string
  user_type: string
  department: string
  created_at: string
  is_verified?: boolean
}

export default function UsersTab() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [activeTab, setActiveTab] = useState('all')
  const [filter, setFilter] = useState({
    department: '',
  })
  
  const [newUser, setNewUser] = useState({
    full_name: '',
    reference_number: '',
    email: '',
    user_type: 'student',
    department: '',
    password: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Fetch users on component mount
  useEffect(() => {
    fetchUsers()
  }, [])
  
  // Filter users when search or filters change
  useEffect(() => {
    filterUsers()
  }, [searchQuery, filter, users, activeTab])
  
  const fetchUsers = async () => {
    try {
      setLoading(true)
      
      let client = supabase;
      // Try to use admin client if available
      try {
        client = getAdminClient();
        console.log('Using admin client for fetching users');
      } catch (error) {
        console.warn('Admin client not available, falling back to regular client:', error);
        // Continue with regular client
      }
      
      const { data, error } = await client
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error fetching users:', error)
        return
      }
      
      const usersWithVerification = await Promise.all((data || []).map(async (user) => {
        // Check verification status for each user
        const isVerified = await checkEmailVerification(user.id);
        return { ...user, is_verified: isVerified };
      }));
      
      setUsers(usersWithVerification)
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const filterUsers = () => {
    let filtered = [...users]
    
    // Apply user type filter
    if (activeTab !== 'all') {
      filtered = filtered.filter(user => user.user_type === activeTab)
    }
    
    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(user => 
        user.full_name?.toLowerCase().includes(query) ||
        user.reference_number?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query) ||
        user.department?.toLowerCase().includes(query) ||
        user.user_type?.toLowerCase().includes(query)
      )
    }
    
    // Apply department filter
    if (filter.department) {
      filtered = filtered.filter(user => 
        user.department === filter.department
      )
    }
    
    setFilteredUsers(filtered)
  }
  
  const handleCreateUser = async () => {
    try {
      setIsSubmitting(true)
      
      // Use reference_number directly as the email - make sure we trim any whitespace
      const email = newUser.reference_number.trim()
      let createdProfile: any = null; // Define createdProfile variable
      
      console.log(`Creating user with email: ${email}`)
      
      // Step 1: Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: newUser.password,
      })
      
      if (authError) {
        console.error('Error creating user:', authError)
        alert(`Failed to create user: ${authError.message}`)
        return
      }
      
      if (!authData.user) {
        alert('Failed to create user: No user returned from auth')
        return
      }
      
      console.log('Auth user created successfully with ID:', authData.user.id)
      
      // Step 2: Automatically verify the user's email
      try {
        console.log('Attempting to auto-verify user email...')
        const { data: verifyData, error: verifyError } = await supabase.rpc(
          'admin_verify_user_email',
          { user_id: authData.user.id }
        )
        
        if (verifyError) {
          console.log('Email verification failed:', verifyError)
          // Continue anyway - we'll just show a warning
        } else {
          console.log('Email verification successful:', verifyData)
        }
      } catch (verifyError) {
        console.log('Exception during email verification:', verifyError)
        // Continue anyway - we'll just show a warning
      }
      
      // Step 3: Create profile record
      const profileData = {
          id: authData.user.id,
          full_name: newUser.full_name,
        reference_number: email, // Use the same trimmed email to ensure consistency
        email: email, // Use the same email for both fields
          user_type: newUser.user_type,
          department: newUser.department,
      }
      
      console.log('Creating profile with data:', profileData)
      
      // Try directly with supabase client first - it might work if RLS is configured properly
      console.log('Attempting to create profile with regular client first');
      const { data, error } = await supabase
        .from('profiles')
        .insert(profileData)
        .select();
      
      if (error) {
        // Don't log empty error objects
        if (error && typeof error === 'object' && Object.keys(error).length > 0) {
          // Use console.log instead of console.error to avoid Next.js error tracking
          console.log('Profile creation with regular client failed:', error);
          console.log('Error code:', error.code);
          console.log('Error message:', error.message);
          console.log('Error details:', error.details);
        } else {
          console.log('Empty error object received - continuing with fallback method');
        }
        
        // Check for duplicate email constraint violation
        if (error.code === '23505' && error.message.includes('profiles_email_key')) {
          alert(`User email already exists in the system. Please use a different email address.`);
          return;
        }
        
        // Try inserting directly to the database using SQL
        console.log('Attempting direct SQL insert as fallback');
        try {
          const { data: sqlData, error: sqlError } = await supabase.rpc(
            'insert_profile_direct',
            { 
              p_id: profileData.id,
              p_full_name: profileData.full_name,
              p_reference_number: profileData.reference_number, 
              p_user_type: profileData.user_type,
              p_department: profileData.department 
            }
          );
          
          if (sqlError) {
            console.error('SQL insert failed:', sqlError);
            alert(`Failed to create profile using all methods. Error details: ${JSON.stringify(sqlError)}
            
Please check your Supabase setup and make sure:
1. You have added a policy to allow inserts to the profiles table
2. You have the proper service role key configured in .env.local
3. There are no schema validation issues with your data

Technical details: ${sqlError.message || 'Unknown error'}
            `);
            return;
          }
          
          // If we get here, the SQL insert worked
          console.log('Profile created successfully via SQL RPC:', sqlData);
          createdProfile = sqlData;
        } catch (sqlCatchError) {
          console.error('Exception during SQL insert:', sqlCatchError);
          alert(`Failed to create profile: ${JSON.stringify(error)}
          
If you've already set up RLS policies and still see this error, you may need to:
1. Check if the 'insert_profile_direct' function exists in your database
2. Create a server-side API endpoint to handle user creation
3. Check for any additional constraints on the profiles table`);
          return;
        }
      } else {
        // Regular insert worked
        console.log('Profile created successfully with regular client:', data);
        createdProfile = data;
      }
      
      // Reset form and refresh data
      setNewUser({
        full_name: '',
        reference_number: '',
        email: '',
        user_type: 'student',
        department: '',
        password: '',
      })
      
      fetchUsers()
      alert('User created successfully!')
    } catch (error: any) {
      console.error('Failed to create user - Exception details:', error);
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      alert(`An unexpected error occurred: ${error.message || 'Unknown error'}
      
Please check your browser console for more details.`);
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const handleDeleteUser = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return
    }
    
    try {
      let client = supabase;
      // Try to use admin client if available
      try {
        client = getAdminClient();
        console.log('Using admin client for user deletion');
      } catch (error) {
        console.warn('Admin client not available, falling back to regular client:', error);
        // Continue with regular client
      }
      
      // First delete from profiles table
      const { error: profileError } = await client
        .from('profiles')
        .delete()
        .eq('id', id)
      
      if (profileError) {
        console.error('Error deleting profile:', profileError)
        alert(`Failed to delete user: ${profileError.message}`)
        return
      }
      
      // Then delete from auth.users table
      // Note: This may require admin privileges or a server-side function
      const { error: authError } = await client.rpc('delete_user', { user_id: id })
      
      if (authError) {
        console.error('Error deleting auth user:', authError)
        alert(`User profile deleted but auth record may remain: ${authError.message}`)
        return
      }
      
      fetchUsers()
      alert('User deleted successfully.')
    } catch (error: any) {
      console.error('Failed to delete user:', error)
      alert(`An unexpected error occurred: ${error.message}`)
    }
  }
  
  const exportToCSV = () => {
    const headers = ['Name', 'Email Address', 'Type', 'Department', 'Created At']
    const rows = filteredUsers.map(u => [
      u.full_name,
      u.reference_number,
      u.user_type,
      u.department,
      new Date(u.created_at).toLocaleDateString()
    ])
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell || ''}"`).join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `users-${activeTab}-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
  
  // Function to verify a user's email
  const verifyUserEmail = async (userId: string) => {
    try {
      const { data, error } = await supabase.rpc(
        'admin_verify_user_email',
        { user_id: userId }
      )
      
      if (error) {
        console.error('Error verifying user email:', error)
        alert(`Failed to verify user email: ${error.message}`)
        return false
      }
      
      console.log('Email verification result:', data)
      return data === true
    } catch (error: any) {
      console.error('Exception during email verification:', error)
      alert(`An unexpected error occurred: ${error.message}`)
      return false
    }
  }
  
  // Function to check if a user's email is verified
  const checkEmailVerification = async (userId: string) => {
    try {
      const { data, error } = await supabase.rpc(
        'is_user_email_verified',
        { user_id: userId }
      )
      
      if (error) {
        console.error('Error checking email verification:', error)
        return false
      }
      
      return data === true
    } catch (error) {
      console.error('Exception during email verification check:', error)
      return false
    }
  }
  
  // Get unique departments for filter
  const departments = Array.from(new Set(users.map(u => u.department).filter(Boolean)))

  return (
    <div>
      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="all">All Users</TabsTrigger>
          <TabsTrigger value="student">Students</TabsTrigger>
          <TabsTrigger value="supervisor">Supervisors</TabsTrigger>
          <TabsTrigger value="admin">Administrators</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
        <div className="flex items-center gap-3 flex-1 md:max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search by name, email, department, or type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="filter-button bg-white text-gray-500 border-gray-200">
                <Filter className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="p-2">
                <Label className="text-xs">Department</Label>
                <Select 
                  value={filter.department} 
                  onValueChange={(value) => setFilter({...filter, department: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Departments</SelectItem>
                    {departments.map(dept => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div className="flex items-center gap-2 self-end md:self-auto">
          <Button variant="outline" size="sm" onClick={fetchUsers} className="refresh-button">
            <Loader2 className="mr-1 h-4 w-4" />
            Refresh
          </Button>
          
          <Button variant="outline" size="sm" onClick={exportToCSV} className="export-button">
            <Download className="mr-1 h-4 w-4" />
            Export
          </Button>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" className="create-button">
                <UserPlus className="mr-1 h-4 w-4" />
                New User
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input
                      id="full_name"
                      value={newUser.full_name}
                      onChange={(e) => setNewUser({...newUser, full_name: e.target.value})}
                      placeholder="Enter full name"
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="reference_number">Email Address</Label>
                    <Input
                      id="reference_number"
                      value={newUser.reference_number}
                      onChange={(e) => setNewUser({...newUser, reference_number: e.target.value})}
                      placeholder="e.g., ce-username123@st.umat.edu.gh"
                      className="w-full"
                    />
                  </div>
                </div>
                
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="user_type">User Type</Label>
                    <Select 
                      value={newUser.user_type} 
                      onValueChange={(value) => setNewUser({...newUser, user_type: value})}
                    >
                      <SelectTrigger id="user_type">
                        <SelectValue placeholder="Select user type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="supervisor">Supervisor</SelectItem>
                        <SelectItem value="admin">Administrator</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      value={newUser.department}
                      onChange={(e) => setNewUser({...newUser, department: e.target.value})}
                      placeholder="e.g., Computer Science"
                    />
                  </div>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                    placeholder="Enter password"
                  />
                </div>
              </div>
              
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button 
                  onClick={handleCreateUser}
                  disabled={
                    isSubmitting || 
                    !newUser.full_name || 
                    !newUser.reference_number || 
                    !newUser.user_type || 
                    !newUser.password
                  }
                >
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {isSubmitting ? 'Creating...' : 'Create User'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      {/* Users Table */}
      <div className="bg-white rounded-md border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email Address</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Verification</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" />
                  <p className="text-sm text-gray-500 mt-2">Loading users...</p>
                </TableCell>
              </TableRow>
            ) : filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <p className="text-sm text-gray-500">No users found.</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.full_name}</TableCell>
                  <TableCell>{user.reference_number}</TableCell>
                  <TableCell>
                    <UserTypeBadge userType={user.user_type} />
                  </TableCell>
                  <TableCell>{user.department}</TableCell>
                  <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {user.is_verified ? (
                      <VerificationBadge isVerified={true} />
                    ) : (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={async () => {
                          const success = await verifyUserEmail(user.id);
                          if (success) {
                            alert(`Email verified for ${user.full_name}`);
                            fetchUsers(); // Refresh the list
                          }
                        }}
                        className="text-xs h-7 px-2 bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                      >
                        Verify Email
                      </Button>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="text-gray-900">
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteUser(user.id)} className="text-red-600">
                          <Trash2 className="mr-2 h-4 w-4 text-red-600" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Pagination placeholder */}
      <div className="flex justify-between items-center mt-4">
        <div className="text-sm text-gray-500">
          Showing {filteredUsers.length} of {users.length} users
        </div>
        {/* Pagination would go here */}
      </div>
    </div>
  )
} 