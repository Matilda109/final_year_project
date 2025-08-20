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
import { Loader2, Plus, Filter, MoreHorizontal, Search, Download, Trash2, Edit, Check, RefreshCw, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'

interface Relationship {
  id: string
  student_id: string
  supervisor_id: string
  student_name: string
  student_reference: string
  supervisor_name: string
  supervisor_reference: string
  department: string
  assigned_date: string
  status: string
  project_title?: string
}

interface SupervisorWorkload {
  supervisor_id: string
  supervisor_name: string
  reference_number: string
  department: string
  student_count: number
}

interface Student {
  id: string
  full_name: string
  reference_number: string
  department: string
}

interface Supervisor {
  id: string
  full_name: string
  reference_number: string
  department: string
}

interface Group {
  id: string
  name: string
  description?: string
  supervisor_id: string
  supervisor_name: string
  supervisor_reference: string
  department: string
  project_title?: string
  status: string
  created_date: string
  member_count: number
}

interface GroupMember {
  id: string
  group_id: string
  student_id: string
  student_name: string
  student_reference: string
  joined_date: string
}

export default function RelationshipsTab() {
  // View toggle state
  const [viewType, setViewType] = useState<'individual' | 'group'>('individual')
  
  // Individual assignments state
  const [relationships, setRelationships] = useState<Relationship[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredRelationships, setFilteredRelationships] = useState<Relationship[]>([])
  const [filter, setFilter] = useState({
    department: '',
    status: '',
  })
  
  // For the assignment dialog
  const [availableStudents, setAvailableStudents] = useState<Student[]>([])
  const [availableSupervisors, setAvailableSupervisors] = useState<Supervisor[]>([])
  const [supervisorWorkloads, setSupervisorWorkloads] = useState<Record<string, number>>({})
  const [newAssignment, setNewAssignment] = useState({
    student_id: '',
    supervisor_id: '',
    status: 'active',
    project_title: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [assignmentError, setAssignmentError] = useState<string | null>(null)
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)

  // For edit project dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingRelationship, setEditingRelationship] = useState<Relationship | null>(null)
  const [editProjectTitle, setEditProjectTitle] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  
  // Group assignments state
  const [groups, setGroups] = useState<Group[]>([])
  const [groupMembers, setGroupMembers] = useState<Record<string, GroupMember[]>>({})
  const [groupsLoading, setGroupsLoading] = useState(true)
  const [filteredGroups, setFilteredGroups] = useState<Group[]>([])
  const [groupSearchQuery, setGroupSearchQuery] = useState('')
  const [groupFilter, setGroupFilter] = useState({
    department: '',
    status: '',
  })
  
  // Group creation dialog state
  const [createGroupDialogOpen, setCreateGroupDialogOpen] = useState(false)
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    supervisor_id: '',
    project_title: '',
    status: 'active',
    selected_students: [] as string[]
  })
  const [isCreatingGroup, setIsCreatingGroup] = useState(false)
  const [groupCreationError, setGroupCreationError] = useState<string | null>(null)
  
  // Group edit dialog state
  const [editGroupDialogOpen, setEditGroupDialogOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<Group | null>(null)
  const [editGroupProjectTitle, setEditGroupProjectTitle] = useState('')
  const [isEditingGroup, setIsEditingGroup] = useState(false)
  
  // Selected group for viewing details
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  
  // Fetch data on component mount
  useEffect(() => {
    if (viewType === 'individual') {
      fetchRelationships()
      fetchAvailableUsers()
    } else {
      fetchGroups()
      fetchAvailableUsers()
    }
  }, [viewType])
  
  // Filter relationships when search or filters change
  useEffect(() => {
    if (viewType === 'individual') {
      filterRelationships()
    } else {
      filterGroups()
    }
  }, [searchQuery, filter, relationships, groupSearchQuery, groupFilter, groups, viewType])
  
  const fetchRelationships = async () => {
    try {
      setLoading(true)
      
      // Using a view to get both student and supervisor details
      const { data, error } = await supabase
        .from('student_supervisor_relationships_view')
        .select('*')
      
      if (error) {
        console.error('Error fetching relationships:', error)
        return
      }
      
      setRelationships(data || [])
    } catch (error) {
      console.error('Failed to fetch relationships:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const fetchAvailableUsers = async () => {
    try {
      // Get all active student-supervisor relationships
      const { data: activeRelationships, error: relError } = await supabase
        .from('student_supervisor_relationships')
        .select('student_id')
        .eq('status', 'active')
      
      if (relError) {
        console.error('Error fetching active relationships:', relError)
        return
      }
      
      // Extract student IDs that already have active supervisors
      const assignedStudentIds = activeRelationships?.map(rel => rel.student_id) || []
      
      // Fetch students WITHOUT active supervisors
      let studentsQuery = supabase
        .from('profiles')
        .select('id, full_name, reference_number, department')
        .eq('user_type', 'student')
      
      // Only add the filter if there are assigned students
      if (assignedStudentIds.length > 0) {
        studentsQuery = studentsQuery.not('id', 'in', `(${assignedStudentIds.join(',')})`)
      }
      
      const { data: students, error: studentsError } = await studentsQuery
      
      if (studentsError) {
        console.error('Error fetching students:', studentsError)
      } else {
        setAvailableStudents(students || [])
      }
      
      // Fetch supervisors
      const { data: supervisors, error: supervisorsError } = await supabase
        .from('profiles')
        .select('id, full_name, reference_number, department')
        .eq('user_type', 'supervisor')
      
      if (supervisorsError) {
        console.error('Error fetching supervisors:', supervisorsError)
      } else {
        setAvailableSupervisors(supervisors || [])
      }
      
      // Fetch supervisor workload data
      const { data: workloadData, error: workloadError } = await supabase
        .from('supervisor_workload_view')
        .select('supervisor_id, student_count')
      
      if (workloadError) {
        console.error('Error fetching supervisor workloads:', workloadError)
      } else {
        // Create a map of supervisor_id to student_count
        const workloadMap = (workloadData || []).reduce((acc, item) => {
          acc[item.supervisor_id] = item.student_count
          return acc
        }, {} as Record<string, number>)
        
        setSupervisorWorkloads(workloadMap)
      }
    } catch (error) {
      console.error('Failed to fetch available users:', error)
    }
  }
  
  const filterRelationships = () => {
    let filtered = [...relationships]
    
    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(relationship => 
        relationship.student_name.toLowerCase().includes(query) ||
        relationship.supervisor_name.toLowerCase().includes(query) ||
        relationship.student_reference.toLowerCase().includes(query) ||
        relationship.supervisor_reference.toLowerCase().includes(query) ||
        (relationship.project_title && relationship.project_title.toLowerCase().includes(query))
      )
    }
    
    // Apply department filter
    if (filter.department) {
      filtered = filtered.filter(relationship => 
        relationship.department === filter.department
      )
    }
    
    // Apply status filter
    if (filter.status) {
      filtered = filtered.filter(relationship => 
        relationship.status === filter.status
      )
    }
    
    setFilteredRelationships(filtered)
  }
  
  // Group-related functions
  const fetchGroups = async () => {
    try {
      setGroupsLoading(true)
      
      // Fetch groups with supervisor details
      const { data: groupsData, error: groupsError } = await supabase
        .from('student_groups')
        .select(`
          *,
          supervisor:profiles!student_groups_supervisor_id_fkey(
            full_name,
            reference_number,
            department
          )
        `)
      
      if (groupsError) {
        console.error('Error fetching groups:', groupsError)
        return
      }
      
      // Transform the data to match our Group interface
      const transformedGroups: Group[] = (groupsData || []).map(group => ({
        id: group.id,
        name: group.name,
        description: group.description,
        supervisor_id: group.supervisor_id,
        supervisor_name: group.supervisor?.full_name || 'Unknown',
        supervisor_reference: group.supervisor?.reference_number || 'N/A',
        department: group.supervisor?.department || 'N/A',
        project_title: group.project_title,
        status: group.status,
        created_date: group.created_date,
        member_count: 0 // Will be updated below
      }))
      
      setGroups(transformedGroups)
      
      // Fetch group members for each group
      const membersData: Record<string, GroupMember[]> = {}
      
      for (const group of transformedGroups) {
        const { data: members, error: membersError } = await supabase
          .from('group_members')
          .select(`
            *,
            student:profiles!group_members_student_id_fkey(
              full_name,
              reference_number
            )
          `)
          .eq('group_id', group.id)
        
        if (membersError) {
          console.error(`Error fetching members for group ${group.id}:`, membersError)
          continue
        }
        
        const transformedMembers: GroupMember[] = (members || []).map(member => ({
          id: member.id,
          group_id: member.group_id,
          student_id: member.student_id,
          student_name: member.student?.full_name || 'Unknown',
          student_reference: member.student?.reference_number || 'N/A',
          joined_date: member.joined_date
        }))
        
        membersData[group.id] = transformedMembers
        
        // Update member count
        group.member_count = transformedMembers.length
      }
      
      setGroupMembers(membersData)
      
    } catch (error) {
      console.error('Failed to fetch groups:', error)
    } finally {
      setGroupsLoading(false)
    }
  }
  
  const filterGroups = () => {
    let filtered = [...groups]
    
    // Apply search query
    if (groupSearchQuery) {
      const query = groupSearchQuery.toLowerCase()
      filtered = filtered.filter(group => 
        group.name.toLowerCase().includes(query) ||
        group.supervisor_name.toLowerCase().includes(query) ||
        group.supervisor_reference.toLowerCase().includes(query) ||
        (group.project_title && group.project_title.toLowerCase().includes(query)) ||
        (group.description && group.description.toLowerCase().includes(query))
      )
    }
    
    // Apply department filter
    if (groupFilter.department) {
      filtered = filtered.filter(group => 
        group.department === groupFilter.department
      )
    }
    
    // Apply status filter
    if (groupFilter.status) {
      filtered = filtered.filter(group => 
        group.status === groupFilter.status
      )
    }
    
    setFilteredGroups(filtered)
  }
  
  const handleCreateGroup = async () => {
    try {
      setIsCreatingGroup(true)
      setGroupCreationError(null)
      
      // Validate required fields
      if (!newGroup.name || !newGroup.supervisor_id || newGroup.selected_students.length === 0) {
        setGroupCreationError('Please fill in all required fields and select at least one student')
        return
      }
      
      // Create the group
      const { data: groupData, error: groupError } = await supabase
        .from('student_groups')
        .insert({
          name: newGroup.name,
          description: newGroup.description || null,
          supervisor_id: newGroup.supervisor_id,
          project_title: newGroup.project_title || null,
          status: newGroup.status,
          created_date: new Date().toISOString()
        })
        .select()
        .single()
      
      if (groupError) {
        console.error('Error creating group:', groupError)
        setGroupCreationError('Failed to create group. Please try again.')
        return
      }
      
      // Add group members
      const memberInserts = newGroup.selected_students.map(studentId => ({
        group_id: groupData.id,
        student_id: studentId,
        joined_date: new Date().toISOString()
      }))
      
      const { error: membersError } = await supabase
        .from('group_members')
        .insert(memberInserts)
      
      if (membersError) {
        console.error('Error adding group members:', membersError)
        // Try to clean up the created group
        await supabase.from('student_groups').delete().eq('id', groupData.id)
        setGroupCreationError('Failed to add group members. Please try again.')
        return
      }
      
      // Reset form
      setNewGroup({
        name: '',
        description: '',
        supervisor_id: '',
        project_title: '',
        status: 'active',
        selected_students: []
      })
      
      // Close dialog
      setCreateGroupDialogOpen(false)
      
      // Refresh data
      fetchGroups()
      fetchAvailableUsers()
      
      alert('Group created successfully!')
    } catch (error) {
      console.error('Failed to create group:', error)
      setGroupCreationError('An unexpected error occurred. Please try again.')
    } finally {
      setIsCreatingGroup(false)
    }
  }
  
  const handleEditGroupProject = (group: Group) => {
    setEditingGroup(group)
    setEditGroupProjectTitle(group.project_title || '')
    setEditGroupDialogOpen(true)
  }
  
  const handleUpdateGroupProject = async () => {
    if (!editingGroup) return
    
    try {
      setIsEditingGroup(true)
      
      const { error } = await supabase
        .from('student_groups')
        .update({ project_title: editGroupProjectTitle || null })
        .eq('id', editingGroup.id)
      
      if (error) {
        console.error('Error updating group project:', error)
        alert('Failed to update project title. Please try again.')
        return
      }
      
      // Close dialog
      setEditGroupDialogOpen(false)
      setEditingGroup(null)
      
      // Refresh groups
      fetchGroups()
      
      alert('Project title updated successfully!')
    } catch (error) {
      console.error('Failed to update group project:', error)
      alert('An unexpected error occurred. Please try again.')
    } finally {
      setIsEditingGroup(false)
    }
  }
  
  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm('Are you sure you want to delete this group? This action cannot be undone.')) {
      return
    }
    
    try {
      // Delete group members first (due to foreign key constraint)
      const { error: membersError } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
      
      if (membersError) {
        console.error('Error deleting group members:', membersError)
        alert('Failed to delete group. Please try again.')
        return
      }
      
      // Delete the group
      const { error: groupError } = await supabase
        .from('student_groups')
        .delete()
        .eq('id', groupId)
      
      if (groupError) {
        console.error('Error deleting group:', groupError)
        alert('Failed to delete group. Please try again.')
        return
      }
      
      // Refresh data
      fetchGroups()
      fetchAvailableUsers()
      
      alert('Group deleted successfully!')
    } catch (error) {
      console.error('Failed to delete group:', error)
      alert('An unexpected error occurred. Please try again.')
    }
  }
  
  const handleCreateRelationship = async () => {
    try {
      setIsSubmitting(true)
      setAssignmentError(null)
      
      // Check if the student already has a supervisor
      const { data: existingRelationship, error: checkError } = await supabase
        .from('student_supervisor_relationships')
        .select('id')
        .eq('student_id', newAssignment.student_id)
        .eq('status', 'active')
        .single()
      
      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is the "no rows returned" error code
        console.error('Error checking existing relationship:', checkError)
        setAssignmentError('Failed to check existing relationships')
        return
      }
      
      if (existingRelationship) {
        setAssignmentError('This student already has an active supervisor assignment')
        return
      }
      
      // Insert new relationship
      const { error } = await supabase
        .from('student_supervisor_relationships')
        .insert({
          student_id: newAssignment.student_id,
          supervisor_id: newAssignment.supervisor_id,
          project_title: newAssignment.project_title || null,
          status: newAssignment.status,
          assigned_date: new Date().toISOString()
        })
      
      if (error) {
        console.error('Error creating relationship:', error)
        setAssignmentError('Failed to create relationship. Please try again.')
        return
      }
      
      // Reset form and refresh data
      setNewAssignment({
        student_id: '',
        supervisor_id: '',
        status: 'active',
        project_title: '',
      })
      
      // Close dialog
      setAssignDialogOpen(false)
      
      // Refresh both relationships and available users
      fetchRelationships()
      fetchAvailableUsers()
      
      alert('Student-Supervisor relationship created successfully!')
    } catch (error) {
      console.error('Failed to create relationship:', error)
      setAssignmentError('An unexpected error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const handleEditProjectTitle = (relationship: Relationship) => {
    setEditingRelationship(relationship)
    setEditProjectTitle(relationship.project_title || '')
    setEditDialogOpen(true)
  }
  
  const handleUpdateProjectTitle = async () => {
    if (!editingRelationship) return
    
    try {
      setIsEditing(true)
      
      const { error } = await supabase
        .from('student_supervisor_relationships')
        .update({ 
          project_title: editProjectTitle.trim() || null
        })
        .eq('id', editingRelationship.id)
      
      if (error) {
        console.error('Error updating project title:', error)
        alert('Failed to update project title. Please try again.')
        return
      }
      
      // Close dialog and refresh data
      setEditDialogOpen(false)
      setEditingRelationship(null)
      fetchRelationships()
    } catch (error) {
      console.error('Failed to update project title:', error)
      alert('An unexpected error occurred. Please try again.')
    } finally {
      setIsEditing(false)
    }
  }
  
  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('student_supervisor_relationships')
        .update({ status: newStatus })
        .eq('id', id)
      
      if (error) {
        console.error('Error updating relationship status:', error)
        alert('Failed to update status. Please try again.')
        return
      }
      
      fetchRelationships()
      fetchAvailableUsers() // Refresh available students if status changes to/from active
    } catch (error) {
      console.error('Failed to update relationship status:', error)
      alert('An unexpected error occurred. Please try again.')
    }
  }
  
  const handleDeleteRelationship = async (id: string) => {
    if (!confirm('Are you sure you want to delete this relationship? This action cannot be undone.')) {
      return
    }
    
    try {
      const { error } = await supabase
        .from('student_supervisor_relationships')
        .delete()
        .eq('id', id)
      
      if (error) {
        console.error('Error deleting relationship:', error)
        alert('Failed to delete relationship. Please try again.')
        return
      }
      
      fetchRelationships()
      fetchAvailableUsers() // Refresh available students list if a student is freed up
      alert('Relationship deleted successfully.')
    } catch (error) {
      console.error('Failed to delete relationship:', error)
      alert('An unexpected error occurred. Please try again.')
    }
  }
  
  const exportToCSV = () => {
    const headers = ['Student', 'Student ID', 'Supervisor', 'Supervisor ID', 'Department', 'Assigned Date', 'Status', 'Project']
    const rows = filteredRelationships.map(r => [
      r.student_name,
      r.student_reference,
      r.supervisor_name,
      r.supervisor_reference,
      r.department,
      r.assigned_date,
      r.status,
      r.project_title || ''
    ])
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `student-supervisor-relationships-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
  
  // Get supervisor workload for a specific supervisor
  const getWorkloadForSupervisor = (supervisorId: string): number => {
    return supervisorWorkloads[supervisorId] || 0
  }
  
  // Get a color indicator based on workload
  const getWorkloadColor = (count: number): string => {
    if (count === 0) return 'bg-gray-100 text-gray-800'
    if (count <= 3) return 'bg-green-100 text-green-800'
    if (count <= 6) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }
  
  // Get unique departments for filter
  const departments = Array.from(new Set(relationships.map(r => r.department)))

  // Calculate supervisor statistics
  const totalRelationships = relationships.length
  const activeRelationships = relationships.filter(r => r.status === 'active').length
  const uniqueSupervisors = new Set(relationships.map(r => r.supervisor_id)).size
  const avgStudentsPerSupervisor = uniqueSupervisors ? (activeRelationships / uniqueSupervisors).toFixed(1) : '0'

  return (
    <div>
      {/* View Toggle */}
      <div className="mb-6">
        <Tabs value={viewType} onValueChange={(value) => setViewType(value as 'individual' | 'group')}>
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="individual" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Individual Assignments
            </TabsTrigger>
            <TabsTrigger value="group" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Group Assignments
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="individual" className="mt-6">
            {/* Individual Assignments View */}
            {/* Header with statistics */}
            <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-lg shadow-sm border">
                <h3 className="text-sm font-medium text-gray-500">Total Relationships</h3>
                <p className="text-2xl font-bold">{totalRelationships}</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm border">
                <h3 className="text-sm font-medium text-gray-500">Active Relationships</h3>
                <p className="text-2xl font-bold">{activeRelationships}</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm border">
                <h3 className="text-sm font-medium text-gray-500">Avg. Students per Supervisor</h3>
                <p className="text-2xl font-bold">{avgStudentsPerSupervisor}</p>
              </div>
            </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
        <div className="flex items-center gap-3 flex-1 md:max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search by name, ID or project..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="bg-white text-gray-500 border-gray-200">
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
                
                <div className="mt-2">
                  <Label className="text-xs">Status</Label>
                  <Select 
                    value={filter.status} 
                    onValueChange={(value) => setFilter({...filter, status: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div className="flex items-center gap-2 self-end md:self-auto">
          <Button variant="outline" size="sm" onClick={() => {
            fetchRelationships()
            fetchAvailableUsers()
          }} className="refresh-button text-gray-700 border-gray-300 bg-white hover:bg-gray-50 hover:text-blue-600 transition-all duration-200 !rounded-button">
            <RefreshCw className="mr-1 h-4 w-4" />
            Refresh
          </Button>
          
          <Button variant="outline" size="sm" onClick={exportToCSV} className="text-gray-700 border-gray-300 bg-white hover:bg-gray-50 hover:text-blue-600 transition-all duration-200 !rounded-button">
            <Download className="mr-1 h-4 w-4" />
            Export
          </Button>
          
          <Button size="sm" onClick={() => setAssignDialogOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white !rounded-button transition-all duration-300">
            <Plus className="mr-1 h-4 w-4" />
            Assign
          </Button>
        </div>
      </div>
      
      {/* Relationships Table */}
      <div className="bg-white rounded-md border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Supervisor</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Assigned Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Project</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <div className="flex justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                  </div>
                  <div className="mt-2 text-sm text-gray-500">Loading relationships...</div>
                </TableCell>
              </TableRow>
            ) : filteredRelationships.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <div className="text-sm text-gray-500">No relationships found</div>
                  {searchQuery || filter.department || filter.status ? (
                    <div className="mt-2">
                      <Button 
                        variant="link" 
                        onClick={() => {
                          setSearchQuery('')
                          setFilter({ department: '', status: '' })
                        }}
                      >
                        Clear filters
                      </Button>
                    </div>
                  ) : null}
                </TableCell>
              </TableRow>
            ) : (
              filteredRelationships.map((relationship) => (
                <TableRow key={relationship.id}>
                  <TableCell>
                    <div className="font-medium">{relationship.student_name}</div>
                    <div className="text-sm text-gray-500">{relationship.student_reference}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{relationship.supervisor_name}</div>
                    <div className="text-sm text-gray-500">{relationship.supervisor_reference}</div>
                  </TableCell>
                  <TableCell>{relationship.department}</TableCell>
                  <TableCell>{new Date(relationship.assigned_date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      relationship.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : relationship.status === 'inactive'
                        ? 'bg-gray-100 text-gray-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {relationship.status.charAt(0).toUpperCase() + relationship.status.slice(1)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {relationship.project_title || <span className="text-gray-400">No project</span>}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditProjectTitle(relationship)}>
                          <Edit className="mr-2 h-4 w-4 text-blue-600" />
                          Edit Project
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange(relationship.id, 'active')}>
                          <Check className="mr-2 h-4 w-4 text-green-600" />
                          Mark Active
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange(relationship.id, 'inactive')}>
                          <Check className="mr-2 h-4 w-4 text-gray-600" />
                          Mark Inactive
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange(relationship.id, 'completed')}>
                          <Check className="mr-2 h-4 w-4 text-blue-600" />
                          Mark Completed
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteRelationship(relationship.id)} className="text-red-600">
                          <Trash2 className="mr-2 h-4 w-4 text-red-600" />
                          Delete Relationship
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
          Showing {filteredRelationships.length} of {relationships.length} relationships
        </div>
      </div>
      
      {/* Assignment Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Student to Supervisor</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="student">Student</Label>
              <Select 
                value={newAssignment.student_id} 
                onValueChange={(value) => setNewAssignment({...newAssignment, student_id: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a student" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {availableStudents.length === 0 ? (
                    <div className="px-2 py-4 text-sm text-center text-gray-500">
                      No unassigned students available
                    </div>
                  ) : (
                    availableStudents.map(student => (
                      <SelectItem key={student.id} value={student.id}>
                        <div className="flex flex-col">
                          <span>{student.full_name} ({student.reference_number})</span>
                          <span className="text-xs text-gray-500">{student.department}</span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="supervisor">Supervisor</Label>
              <Select 
                value={newAssignment.supervisor_id} 
                onValueChange={(value) => setNewAssignment({...newAssignment, supervisor_id: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a supervisor" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {availableSupervisors.map(supervisor => {
                    const workload = getWorkloadForSupervisor(supervisor.id);
                    return (
                      <SelectItem key={supervisor.id} value={supervisor.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{supervisor.full_name} ({supervisor.reference_number})</span>
                          <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getWorkloadColor(workload)}`}>
                            {workload} students
                          </span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {newAssignment.supervisor_id && (
                <div className="text-sm text-gray-500 mt-1">
                  <span className="font-medium">Department:</span> {
                    availableSupervisors.find(s => s.id === newAssignment.supervisor_id)?.department || 'N/A'
                  }
                </div>
              )}
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="project">Project Title (Optional)</Label>
              <Input
                id="project"
                value={newAssignment.project_title}
                onChange={(e) => setNewAssignment({...newAssignment, project_title: e.target.value})}
                placeholder="Enter project title if known"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select 
                value={newAssignment.status} 
                onValueChange={(value) => setNewAssignment({...newAssignment, status: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter className="flex flex-col space-y-2">
            {assignmentError && (
              <div className="w-full p-3 rounded-md bg-red-50 text-red-800 text-sm mb-2">
                {assignmentError}
              </div>
            )}
            <div className="flex justify-end space-x-2 w-full">
              <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateRelationship}
                disabled={isSubmitting || !newAssignment.student_id || !newAssignment.supervisor_id}
                className="bg-emerald-600 hover:bg-emerald-700 text-white !rounded-button transition-all duration-300"
              >
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isSubmitting ? 'Creating...' : 'Create Assignment'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Project Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Project Title</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Student</Label>
              <div className="p-2 border rounded-md bg-gray-50">
                {editingRelationship?.student_name} ({editingRelationship?.student_reference})
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label>Supervisor</Label>
              <div className="p-2 border rounded-md bg-gray-50">
                {editingRelationship?.supervisor_name} ({editingRelationship?.supervisor_reference})
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="project-title">Project Title</Label>
              <Input
                id="project-title"
                value={editProjectTitle}
                onChange={(e) => setEditProjectTitle(e.target.value)}
                placeholder="Enter project title"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateProjectTitle}
              disabled={isEditing}
            >
              {isEditing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isEditing ? 'Updating...' : 'Update Project'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
            </TabsContent>
            
            <TabsContent value="group" className="mt-6">
              {/* Group Assignments View */}
              {/* Group statistics */}
              <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-lg shadow-sm border">
                  <h3 className="text-sm font-medium text-gray-500">Total Groups</h3>
                  <p className="text-2xl font-bold">{groups.length}</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border">
                  <h3 className="text-sm font-medium text-gray-500">Active Groups</h3>
                  <p className="text-2xl font-bold">{groups.filter(g => g.status === 'active').length}</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border">
                  <h3 className="text-sm font-medium text-gray-500">Total Group Members</h3>
                  <p className="text-2xl font-bold">{Object.values(groupMembers).flat().length}</p>
                </div>
              </div>
              
              {/* Group Toolbar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
                <div className="flex items-center gap-3 flex-1 md:max-w-md">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                    <Input
                      placeholder="Search groups by name, supervisor, or project..."
                      value={groupSearchQuery}
                      onChange={(e) => setGroupSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon" className="bg-white text-gray-500 border-gray-200">
                        <Filter className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <div className="p-2">
                        <Label className="text-xs">Department</Label>
                        <Select 
                          value={groupFilter.department} 
                          onValueChange={(value) => setGroupFilter({...groupFilter, department: value})}
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
                        
                        <div className="mt-2">
                          <Label className="text-xs">Status</Label>
                          <Select 
                            value={groupFilter.status} 
                            onValueChange={(value) => setGroupFilter({...groupFilter, status: value})}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="All Statuses" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">All Statuses</SelectItem>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="inactive">Inactive</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                <div className="flex items-center gap-2">
                  <Dialog open={createGroupDialogOpen} onOpenChange={setCreateGroupDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-emerald-600 hover:bg-emerald-700 text-white !rounded-button transition-all duration-300">
                        <Plus className="mr-2 h-4 w-4" />
                        Create Group
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Create New Group</DialogTitle>
                      </DialogHeader>
                      
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="group-name">Group Name *</Label>
                          <Input
                            id="group-name"
                            value={newGroup.name}
                            onChange={(e) => setNewGroup({...newGroup, name: e.target.value})}
                            placeholder="Enter group name"
                          />
                        </div>
                        
                        <div className="grid gap-2">
                          <Label htmlFor="group-description">Description</Label>
                          <Input
                            id="group-description"
                            value={newGroup.description}
                            onChange={(e) => setNewGroup({...newGroup, description: e.target.value})}
                            placeholder="Enter group description (optional)"
                          />
                        </div>
                        
                        <div className="grid gap-2">
                          <Label htmlFor="group-supervisor">Supervisor *</Label>
                          <Select 
                            value={newGroup.supervisor_id} 
                            onValueChange={(value) => setNewGroup({...newGroup, supervisor_id: value})}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select supervisor" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableSupervisors.map((supervisor) => {
                                const workload = getWorkloadForSupervisor(supervisor.id);
                                return (
                                  <SelectItem key={supervisor.id} value={supervisor.id}>
                                    <div className="flex items-center justify-between w-full">
                                      <span>{supervisor.full_name} ({supervisor.reference_number})</span>
                                      <span className={`ml-2 px-2 py-1 rounded-full text-xs ${getWorkloadColor(workload)}`}>
                                        {workload} students
                                      </span>
                                    </div>
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="grid gap-2">
                          <Label>Select Students *</Label>
                          <div className="border rounded-md p-3 max-h-48 overflow-y-auto">
                            {availableStudents.length === 0 ? (
                              <p className="text-sm text-gray-500">No available students (all students may already be assigned)</p>
                            ) : (
                              availableStudents.map((student) => (
                                <div key={student.id} className="flex items-center space-x-2 py-1">
                                  <Checkbox
                                    id={student.id}
                                    checked={newGroup.selected_students.includes(student.id)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setNewGroup({
                                          ...newGroup,
                                          selected_students: [...newGroup.selected_students, student.id]
                                        });
                                      } else {
                                        setNewGroup({
                                          ...newGroup,
                                          selected_students: newGroup.selected_students.filter(id => id !== student.id)
                                        });
                                      }
                                    }}
                                  />
                                  <label htmlFor={student.id} className="text-sm cursor-pointer">
                                    {student.full_name} ({student.reference_number}) - {student.department}
                                  </label>
                                </div>
                              ))
                            )}
                          </div>
                          <p className="text-xs text-gray-500">
                            Selected: {newGroup.selected_students.length} student(s)
                          </p>
                        </div>
                        
                        <div className="grid gap-2">
                          <Label htmlFor="group-project">Project Title</Label>
                          <Input
                            id="group-project"
                            value={newGroup.project_title}
                            onChange={(e) => setNewGroup({...newGroup, project_title: e.target.value})}
                            placeholder="Enter project title (optional)"
                          />
                        </div>
                      </div>
                      
                      <DialogFooter className="flex flex-col space-y-2">
                        {groupCreationError && (
                          <div className="w-full p-3 rounded-md bg-red-50 text-red-800 text-sm mb-2">
                            {groupCreationError}
                          </div>
                        )}
                        <div className="flex justify-end space-x-2 w-full">
                          <Button variant="outline" onClick={() => setCreateGroupDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button 
                            onClick={handleCreateGroup}
                            disabled={isCreatingGroup || !newGroup.name || !newGroup.supervisor_id || newGroup.selected_students.length === 0}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white !rounded-button transition-all duration-300"
                          >
                            {isCreatingGroup ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {isCreatingGroup ? 'Creating...' : 'Create Group'}
                          </Button>
                        </div>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
              
              {/* Groups Table */}
              <div className="bg-white rounded-lg border">
                {groupsLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    <span>Loading groups...</span>
                  </div>
                ) : filteredGroups.length === 0 ? (
                  <div className="text-center p-8">
                    <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No groups found</h3>
                    <p className="text-gray-500 mb-4">
                      {groups.length === 0 ? 'Create your first group to get started.' : 'Try adjusting your search or filters.'}
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Group Name</TableHead>
                        <TableHead>Supervisor</TableHead>
                        <TableHead>Members</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Project Title</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredGroups.map((group) => (
                        <TableRow key={group.id}>
                          <TableCell className="font-medium">{group.name}</TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{group.supervisor_name}</div>
                              <div className="text-sm text-gray-500">{group.supervisor_reference}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {group.member_count} members
                            </span>
                          </TableCell>
                          <TableCell>{group.department}</TableCell>
                          <TableCell>
                            {group.project_title ? (
                              <span className="text-sm">{group.project_title}</span>
                            ) : (
                              <span className="text-sm text-gray-400 italic">No project assigned</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              group.status === 'active' ? 'bg-green-100 text-green-800' :
                              group.status === 'inactive' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {group.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {new Date(group.created_date).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditGroupProject(group)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit Project
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteGroup(group.id)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete Group
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
              
              {/* Group Edit Project Dialog */}
              <Dialog open={editGroupDialogOpen} onOpenChange={setEditGroupDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Group Project</DialogTitle>
                  </DialogHeader>
                  
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label>Group Name</Label>
                      <div className="p-2 border rounded-md bg-gray-50">
                        {editingGroup?.name}
                      </div>
                    </div>
                    
                    <div className="grid gap-2">
                      <Label>Supervisor</Label>
                      <div className="p-2 border rounded-md bg-gray-50">
                        {editingGroup?.supervisor_name} ({editingGroup?.supervisor_reference})
                      </div>
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="group-project-title">Project Title</Label>
                      <Input
                        id="group-project-title"
                        value={editGroupProjectTitle}
                        onChange={(e) => setEditGroupProjectTitle(e.target.value)}
                        placeholder="Enter project title"
                      />
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setEditGroupDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleUpdateGroupProject}
                      disabled={isEditingGroup}
                    >
                      {isEditingGroup ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      {isEditingGroup ? 'Updating...' : 'Update Project'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    )
  } 