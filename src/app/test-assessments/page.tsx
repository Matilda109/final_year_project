'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function TestAssessmentsPage() {
  const supabase = createClientComponentClient()
  const [assessments, setAssessments] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [rawData, setRawData] = useState<any>(null)
  const [policies, setPolicies] = useState<any[]>([])
  const [userInfo, setUserInfo] = useState<any>(null)

  const fetchAssessments = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('Fetching assessments directly...')
      
      // Direct query to project_assessments
      const { data, error } = await supabase
        .from('project_assessments')
        .select('*')
      
      console.log('Raw assessment query result:', { data, error })
      
      if (error) {
        throw new Error(`Failed to fetch assessments: ${error.message}`)
      }
      
      setAssessments(data || [])
      setRawData({ data, error })
    } catch (err: any) {
      console.error('Error in fetchAssessments:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }
  
  const checkPolicies = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Call our diagnostic function if it exists
      const { data, error } = await supabase
        .rpc('check_assessment_policies')
      
      console.log('Policies check result:', { data, error })
      
      if (error) {
        throw new Error(`Failed to check policies: ${error.message}`)
      }
      
      setPolicies(data || [])
    } catch (err: any) {
      console.error('Error in checkPolicies:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }
  
  const checkUserAccess = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError) {
        throw new Error(`Failed to get user: ${userError.message}`)
      }
      
      // Get user role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user?.id)
        .single()
      
      // Call our diagnostic function if it exists
      const { data: accessData, error: accessError } = await supabase
        .rpc('test_assessment_access')
      
      console.log('User access check result:', { accessData, accessError })
      
      setUserInfo({
        user: {
          id: user?.id,
          email: user?.email
        },
        role: roleData?.role || 'unknown',
        access: accessData
      })
      
    } catch (err: any) {
      console.error('Error in checkUserAccess:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }
  
  const insertTestAssessment = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError) {
        throw new Error(`Failed to get user: ${userError.message}`)
      }
      
      const testAssessment = {
        student_id: 'test-student-id',
        supervisor_id: user?.id,
        project_title: 'Test Project',
        total_score: 75,
        general_comments: 'This is a test assessment',
        criteria_scores: {
          'criterion1': { score: 80, comments: 'Good work' },
          'criterion2': { score: 70, comments: 'Needs improvement' }
        },
        is_group_assessment: false
      }
      
      console.log('Inserting test assessment:', testAssessment)
      
      const { data, error } = await supabase
        .from('project_assessments')
        .insert(testAssessment)
        .select()
      
      console.log('Insert result:', { data, error })
      
      if (error) {
        throw new Error(`Failed to insert test assessment: ${error.message}`)
      }
      
      alert('Test assessment inserted successfully!')
      fetchAssessments() // Refresh the list
      
    } catch (err: any) {
      console.error('Error in insertTestAssessment:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Assessment Diagnostics</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={fetchAssessments} 
              disabled={loading}
              className="w-full"
            >
              Fetch Assessments
            </Button>
            <Button 
              onClick={checkPolicies} 
              disabled={loading}
              className="w-full"
            >
              Check RLS Policies
            </Button>
            <Button 
              onClick={checkUserAccess} 
              disabled={loading}
              className="w-full"
            >
              Check User Access
            </Button>
            <Button 
              onClick={insertTestAssessment} 
              disabled={loading}
              className="w-full"
              variant="secondary"
            >
              Insert Test Assessment
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>User Info</CardTitle>
          </CardHeader>
          <CardContent>
            {userInfo ? (
              <div>
                <p><strong>User ID:</strong> {userInfo.user.id}</p>
                <p><strong>Email:</strong> {userInfo.user.email}</p>
                <p><strong>Role:</strong> {userInfo.role}</p>
                {userInfo.access && (
                  <>
                    <p><strong>Can Select:</strong> {userInfo.access.can_select ? 'Yes' : 'No'}</p>
                    <p><strong>Can Insert:</strong> {userInfo.access.can_insert ? 'Yes' : 'No'}</p>
                    <p><strong>Visible Assessments:</strong> {userInfo.access.assessment_count}</p>
                  </>
                )}
              </div>
            ) : (
              <p>Click "Check User Access" to see user information</p>
            )}
          </CardContent>
        </Card>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p><strong>Error:</strong> {error}</p>
        </div>
      )}
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Raw Query Results</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-60">
            {rawData ? JSON.stringify(rawData, null, 2) : 'No data yet'}
          </pre>
        </CardContent>
      </Card>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>RLS Policies</CardTitle>
        </CardHeader>
        <CardContent>
          {policies.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left">Name</th>
                    <th className="px-4 py-2 text-left">Action</th>
                    <th className="px-4 py-2 text-left">Roles</th>
                    <th className="px-4 py-2 text-left">Using</th>
                    <th className="px-4 py-2 text-left">With Check</th>
                  </tr>
                </thead>
                <tbody>
                  {policies.map((policy, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                      <td className="px-4 py-2">{policy.policy_name}</td>
                      <td className="px-4 py-2">{policy.policy_action}</td>
                      <td className="px-4 py-2">{policy.policy_roles}</td>
                      <td className="px-4 py-2">{policy.policy_using}</td>
                      <td className="px-4 py-2">{policy.policy_with_check}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>No policies found or not checked yet</p>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Assessments ({assessments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {assessments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left">ID</th>
                    <th className="px-4 py-2 text-left">Student ID</th>
                    <th className="px-4 py-2 text-left">Project Title</th>
                    <th className="px-4 py-2 text-left">Score</th>
                    <th className="px-4 py-2 text-left">Supervisor ID</th>
                    <th className="px-4 py-2 text-left">Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {assessments.map((assessment) => (
                    <tr key={assessment.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2">{assessment.id}</td>
                      <td className="px-4 py-2">{assessment.student_id}</td>
                      <td className="px-4 py-2">{assessment.project_title}</td>
                      <td className="px-4 py-2">{assessment.total_score}%</td>
                      <td className="px-4 py-2">{assessment.supervisor_id}</td>
                      <td className="px-4 py-2">{new Date(assessment.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>No assessments found</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
