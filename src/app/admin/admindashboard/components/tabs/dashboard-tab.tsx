"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from '@/lib/supabase'
import { Loader2, Users, UserCheck, BookOpen, AlertCircle } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface DashboardStats {
  totalStudents: number
  totalSupervisors: number
  totalRelationships: number
  unassignedStudents: number
  departmentStats: { department: string; count: number; }[]
  supervisorStats: { supervisor_name: string; student_count: number; }[]
  recentRelationships: any[]
}

export default function DashboardTab() {
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalSupervisors: 0,
    totalRelationships: 0,
    unassignedStudents: 0,
    departmentStats: [],
    supervisorStats: [],
    recentRelationships: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)

      // Fetch student count
      let studentCount = 0;
      let supervisorCount = 0;
      let relationshipCount = 0;

      try {
        // Try using count parameter first
        const { count, error } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: false })
          .eq('user_type', 'student')
        
        if (error) {
          throw error;
        }
        
        studentCount = count || 0;
      } catch (error) {
        console.error('Error fetching student count with count parameter:', error);
        
        // Fallback: fetch all students and count them
        const { data, error: fallbackError } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_type', 'student');
          
        if (fallbackError) {
          console.error('Error in student count fallback:', fallbackError);
        } else {
          studentCount = data?.length || 0;
        }
      }
      
      // Fetch supervisor count
      try {
        // Try using count parameter first
        const { count, error } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: false })
          .eq('user_type', 'supervisor')
        
        if (error) {
          throw error;
        }
        
        supervisorCount = count || 0;
      } catch (error) {
        console.error('Error fetching supervisor count with count parameter:', error);
        
        // Fallback: fetch all supervisors and count them
        const { data, error: fallbackError } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_type', 'supervisor');
          
        if (fallbackError) {
          console.error('Error in supervisor count fallback:', fallbackError);
        } else {
          supervisorCount = data?.length || 0;
        }
      }
      
      // Fetch relationship count
      try {
        // Try using count parameter first
        const { count, error } = await supabase
          .from('student_supervisor_relationships')
          .select('*', { count: 'exact', head: false })
        
        if (error) {
          throw error;
        }
        
        relationshipCount = count || 0;
      } catch (error) {
        console.error('Error fetching relationship count with count parameter:', error);
        
        // Fallback: fetch all relationships and count them
        const { data, error: fallbackError } = await supabase
          .from('student_supervisor_relationships')
          .select('id');
          
        if (fallbackError) {
          console.error('Error in relationship count fallback:', fallbackError);
        } else {
          relationshipCount = data?.length || 0;
        }
      }

      // Fetch department statistics
      const { data: departmentData, error: departmentError } = await supabase
        .from('profiles')
        .select('department, user_type')
        .not('department', 'is', null)
      
      if (departmentError) {
        console.error('Error fetching department data:', departmentError)
      }

      // Fetch supervisor workload
      const { data: supervisorWorkloads, error: supervisorWorkloadsError } = await supabase
        .from('supervisor_workload_view')
        .select('supervisor_name, student_count')
        .order('student_count', { ascending: false })
        .limit(5)
      
      if (supervisorWorkloadsError) {
        console.error('Error fetching supervisor workloads:', supervisorWorkloadsError)
      }

      // Fetch recent relationships
      const { data: recentRelationships, error: recentRelationshipsError } = await supabase
        .from('student_supervisor_relationships_view')
        .select('*')
        .order('assigned_date', { ascending: false })
        .limit(5)
      
      if (recentRelationshipsError) {
        console.error('Error fetching recent relationships:', recentRelationshipsError)
      }

      // Process department stats
      const departments = departmentData
        ? departmentData.filter(item => item.user_type === 'student')
            .reduce((acc, curr) => {
              const existing = acc.find(item => item.department === curr.department)
              if (existing) {
                existing.count++
              } else {
                acc.push({ department: curr.department, count: 1 })
              }
              return acc
            }, [] as { department: string; count: number }[])
            .sort((a, b) => b.count - a.count)
        : []

      console.log('Dashboard statistics:', {
        studentCount,
        supervisorCount,
        relationshipCount
      })

      setStats({
        totalStudents: studentCount,
        totalSupervisors: supervisorCount,
        totalRelationships: relationshipCount,
        unassignedStudents: studentCount - relationshipCount,
        departmentStats: departments,
        supervisorStats: supervisorWorkloads || [],
        recentRelationships: recentRelationships || []
      })
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500 mb-4" />
        <p className="text-gray-500">Loading dashboard data...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Admin Dashboard</h2>
      
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Total Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600 mr-2" />
              <div className="text-2xl font-bold text-gray-900">{stats.totalStudents}</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Total Supervisors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <UserCheck className="h-8 w-8 text-purple-600 mr-2" />
              <div className="text-2xl font-bold text-gray-900">{stats.totalSupervisors}</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Total Relationships</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <BookOpen className="h-8 w-8 text-green-600 mr-2" />
              <div className="text-2xl font-bold text-gray-900">{stats.totalRelationships}</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Unassigned Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <AlertCircle className="h-8 w-8 text-amber-600 mr-2" />
              <div className="text-2xl font-bold text-gray-900">{stats.unassignedStudents}</div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Charts and Tables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Students by Department */}
        <Card>
          <CardHeader>
            <CardTitle>Students by Department</CardTitle>
            <CardDescription>Distribution of students across departments</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.departmentStats.length > 0 ? (
              <div className="space-y-3">
                {stats.departmentStats.slice(0, 5).map((dept, index) => (
                  <div key={index}>
                    <div className="flex justify-between text-sm mb-1">
                      <div className="text-gray-800">{dept.department}</div>
                      <div className="font-medium text-gray-900">{dept.count} students</div>
                    </div>
                    <div className="bg-gray-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-blue-600 h-full rounded-full"
                        style={{ 
                          width: `${(dept.count / stats.totalStudents) * 100}%` 
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-500 text-center py-4">No department data available</div>
            )}
          </CardContent>
        </Card>
        
        {/* Supervisor Workload */}
        <Card>
          <CardHeader>
            <CardTitle>Supervisor Workload</CardTitle>
            <CardDescription>Top 5 supervisors by student count</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.supervisorStats.length > 0 ? (
              <div className="space-y-3">
                {stats.supervisorStats.map((supervisor, index) => (
                  <div key={index}>
                    <div className="flex justify-between text-sm mb-1">
                      <div className="truncate flex-1 pr-4">{supervisor.supervisor_name}</div>
                      <div className="font-medium">{supervisor.student_count} students</div>
                    </div>
                    <div className="bg-gray-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-purple-600 h-full rounded-full"
                        style={{ 
                          width: `${(supervisor.student_count / Math.max(...stats.supervisorStats.map(s => s.student_count))) * 100}%` 
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-500 text-center py-4">No supervisor workload data available</div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Recent Assignments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-gray-900">Recent Assignments</CardTitle>
          <CardDescription className="text-gray-600">Latest student-supervisor relationships</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-gray-700">Student</TableHead>
                <TableHead className="text-gray-700">Supervisor</TableHead>
                <TableHead className="text-gray-700">Department</TableHead>
                <TableHead className="text-gray-700">Date Assigned</TableHead>
                <TableHead className="text-gray-700">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.recentRelationships.length > 0 ? (
                stats.recentRelationships.map((relationship, index) => (
                  <TableRow key={index}>
                    <TableCell className="text-gray-900">{relationship.student_name}</TableCell>
                    <TableCell className="text-gray-900">{relationship.supervisor_name}</TableCell>
                    <TableCell className="text-gray-900">{relationship.department}</TableCell>
                    <TableCell className="text-gray-900">{new Date(relationship.assigned_date).toLocaleDateString()}</TableCell>
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
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4 text-gray-700">
                    No recent assignments found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
} 