"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { supabase } from "@/lib/supabase"
import { Loader2 } from "lucide-react"

interface Student {
  id: string
  full_name: string
  reference_number: string
  email: string
  department: string
  progress?: number
  assignment_type?: 'individual' | 'group'
  group_name?: string
  group_id?: string
  project_title?: string
}

export function StudentManagement() {
  const [loading, setLoading] = useState(true)
  const [students, setStudents] = useState<Student[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  
  // Function to generate elegant avatar styles based on name
  const getAvatarStyle = (name: string) => {
    // List of elegant gradient backgrounds with complementary text colors
    const styles = [
      { bg: 'bg-gradient-to-br from-purple-100 to-blue-200', text: 'text-indigo-800' },
      { bg: 'bg-gradient-to-br from-blue-100 to-cyan-200', text: 'text-blue-800' },
      { bg: 'bg-gradient-to-br from-emerald-100 to-teal-200', text: 'text-emerald-800' },
      { bg: 'bg-gradient-to-br from-orange-100 to-amber-200', text: 'text-orange-800' },
      { bg: 'bg-gradient-to-br from-pink-100 to-rose-200', text: 'text-pink-800' },
      { bg: 'bg-gradient-to-br from-violet-100 to-indigo-200', text: 'text-violet-800' },
      { bg: 'bg-gradient-to-br from-blue-100 to-indigo-200', text: 'text-blue-800' },
      { bg: 'bg-gradient-to-br from-emerald-100 to-green-200', text: 'text-emerald-800' }
    ];
    
    // Generate a simple hash of the name
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Get a style from the array based on the hash
    const index = Math.abs(hash) % styles.length;
    return styles[index];
  }
  
  // Function to get initials from name
  const getInitials = (name: string) => {
    if (!name) return '??';
    
    return name.split(' ')
      .filter(part => part.length > 0)
      .slice(0, 2) // Take only first two parts of the name
      .map(n => n[0])
      .join('')
      .toUpperCase();
  }
  
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true)
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          console.error("No user found")
          setLoading(false)
          return
        }
        
        // Get students assigned to this supervisor (both individual and group assignments)
        const allStudentIds = new Set<string>()
        const studentAssignmentInfo = new Map<string, { type: 'individual' | 'group', groupName?: string, groupId?: string }>()
        
        // 1. Get individual student assignments
        const { data: relationshipData, error: relationshipError } = await supabase
          .from('student_supervisor_relationships')
          .select('student_id, status')
          .eq('supervisor_id', user.id)
          .eq('status', 'active')
        
        if (relationshipError) {
          console.error("Error fetching individual relationships:", relationshipError)
        } else if (relationshipData && relationshipData.length > 0) {
          relationshipData.forEach(rel => {
            allStudentIds.add(rel.student_id)
            studentAssignmentInfo.set(rel.student_id, { type: 'individual' })
          })
        }
        
        // 2. Get group assignments
        const { data: groupData, error: groupError } = await supabase
          .from('student_groups')
          .select(`
            id,
            name,
            status,
            group_members!inner(
              student_id
            )
          `)
          .eq('supervisor_id', user.id)
          .eq('status', 'active')
        
        if (groupError) {
          console.error("Error fetching group assignments:", groupError)
        } else if (groupData && groupData.length > 0) {
          groupData.forEach(group => {
            group.group_members.forEach((member: any) => {
              allStudentIds.add(member.student_id)
              studentAssignmentInfo.set(member.student_id, { 
                type: 'group', 
                groupName: group.name,
                groupId: group.id 
              })
            })
          })
        }
        
        // 3. Fetch all student profiles
        if (allStudentIds.size > 0) {
          const studentIdsArray = Array.from(allStudentIds)
          
          const { data: studentData, error: studentError } = await supabase
            .from('profiles')
            .select('id, full_name, reference_number, email, department')
            .in('id', studentIdsArray)
          
          if (studentError) {
            console.error("Error fetching students:", studentError)
          } else if (studentData) {
            // Get project progress data for each student
            const studentsWithProgress = await Promise.all(
              studentData.map(async (student) => {
                // First check if student has project submissions
                let progress = 0;
                let projectTitle = '';
                
                try {
                  // Get all submissions with project titles for this student
                  const { data: submissions, error: submissionsError } = await supabase
                    .from('project_submissions')
                    .select('id, project_type, status, title')
                    .eq('student_id', student.id);
                    
                  if (submissionsError) {
                    console.error(`Error fetching submissions for student ${student.id}:`, submissionsError.message);
                  } else if (submissions && submissions.length > 0) {
                    // Define milestone order for calculating progress
                    const milestoneOrder = ['proposal', 'literature', 'methodology', 'implementation', 'thesis'];
                    
                    // Count how many different milestone types have been approved
                    const approvedMilestoneTypes = new Set();
                    
                    // First, try to find an approved proposal
                    const approvedProposal = submissions.find(
                      s => s.project_type === 'proposal' && s.status === 'approved' && s.title
                    );
                    
                    // If no approved proposal, try to find any proposal with a title
                    const anyProposal = approvedProposal || 
                      submissions.find(s => s.project_type === 'proposal' && s.title);
                    
                    // Set the project title if we found one
                    if (anyProposal?.title) {
                      projectTitle = anyProposal.title;
                    }
                    
                    // Calculate progress based on approved milestones
                    submissions.forEach(submission => {
                      if (submission.status === 'approved' && milestoneOrder.includes(submission.project_type)) {
                        approvedMilestoneTypes.add(submission.project_type);
                      }
                    });
                    
                    progress = Math.round((approvedMilestoneTypes.size / milestoneOrder.length) * 100);
                  }
                } catch (error) {
                  console.error(`Error calculating progress for student ${student.id}:`, error);
                }
                
                // Get assignment info for this student
                const assignmentInfo = studentAssignmentInfo.get(student.id);
                
                // Create a new student object with all the required properties
                const studentWithExtras: Student = {
                  id: student.id,
                  full_name: student.full_name,
                  reference_number: student.reference_number,
                  email: student.email,
                  department: student.department,
                  progress: progress,
                  assignment_type: assignmentInfo?.type || 'individual',
                  group_name: assignmentInfo?.groupName,
                  group_id: assignmentInfo?.groupId,
                  project_title: projectTitle || undefined
                };
                
                return studentWithExtras;
              })
            );
            
            setStudents(studentsWithProgress);
          }
        }
      } catch (error) {
        console.error("Error fetching students:", error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchStudents()
  }, [])
  
  // Group students by their group_id and find the highest progress in each group
  const groupStudents = (students: Student[]) => {
    const groups: { [key: string]: { students: Student[], leadingTitle?: string } } = {};
    const individualStudents: Student[] = [];

    // First, group students by their group_id
    students.forEach(student => {
      if (student.assignment_type === 'group' && student.group_id) {
        if (!groups[student.group_id]) {
          groups[student.group_id] = { students: [] };
        }
        groups[student.group_id].students.push(student);
      } else {
        individualStudents.push(student);
      }
    });

    // Process each group to find the leading student and their project title
    Object.entries(groups).forEach(([groupId, groupData]) => {
      if (groupData.students.length > 0) {
        // Find the student with highest progress and a project title
        const leadingStudent = [...groupData.students]
          .filter(s => s.project_title) // Only consider students with a project title
          .sort((a, b) => (b.progress || 0) - (a.progress || 0))[0] 
          || groupData.students[0]; // Fallback to first student if no one has a title
        
        // Set the leading title for the group
        if (leadingStudent?.project_title) {
          groupData.leadingTitle = leadingStudent.project_title;
        }
        
        // Update all group members to show the highest progress
        const highestProgress = Math.max(...groupData.students.map(s => s.progress || 0));
        groupData.students.forEach(student => {
          student.progress = highestProgress;
        });
      }
    });

    return { groups, individualStudents };
  };

  const filterStudents = (students: Student[]) => {
    return students.filter(student => 
      student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.reference_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.department.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const filteredStudents = filterStudents(students);
  const { groups, individualStudents } = groupStudents(filteredStudents);
  const filteredIndividualStudents = filterStudents(individualStudents);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Student Management</h1>
        <div className="flex space-x-2">
          <Input
            type="text"
            placeholder="Search students..."
            className="w-64 !rounded-button bg-white border-gray-800 text-black"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Button className="bg-[#424769] hover:bg-[#2D3250] text-white !rounded-button whitespace-nowrap cursor-pointer transition-all duration-300">
            <i className="fas fa-plus mr-2"></i> Add Student
          </Button>
        </div>
      </div>

      {filteredStudents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Render group cards */}
          {Object.entries(groups).map(([groupId, groupData]) => {
            const groupStudents = groupData.students;
            const groupName = groupStudents[0]?.group_name || 'Group';
            const groupProgress = groupStudents[0]?.progress || 0;
            
            return (
              <Card key={`group-${groupId}`} className="p-6 shadow-md hover:shadow-lg transition-shadow h-auto overflow-hidden border-2 border-blue-200">
                <div className="flex flex-col space-y-4 w-full">
                  <div className="flex items-center mb-2">
                    <div className="bg-blue-100 p-3 rounded-full mr-3">
                      <i className="fas fa-users text-blue-600"></i>
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{groupName}</h3>
                      <span className="text-sm text-blue-600 font-medium">👥 Group • {groupStudents.length} members</span>
                    </div>
                  </div>
                  
                  {/* Project Title */}
                  {groupData.leadingTitle && (
                    <div className="bg-blue-50 p-3 rounded-md">
                      <p className="text-sm font-medium text-gray-700">Project Title:</p>
                      <p className="text-sm text-gray-900 font-semibold mt-1">{groupData.leadingTitle}</p>
                    </div>
                  )}
                  
                  <div className="space-y-3">
                    {groupStudents.map((student) => {
                      const style = getAvatarStyle(student.full_name);
                      return (
                        <div key={student.id} className="flex items-center p-2 bg-gray-50 rounded-md">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${style.bg} mr-3`}>
                            <span className={`${style.text} font-bold text-sm`}>
                              {getInitials(student.full_name)}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{student.full_name}</p>
                            <p className="text-xs text-gray-500 truncate">{student.reference_number}</p>
                          </div>
                          <div className="text-sm font-medium ml-2">{student.progress}%</div>
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="w-full pt-2">
                    <div className="flex items-center mb-1">
                      <div className="text-sm font-medium">Group Progress</div>
                      <span className="ml-auto text-sm font-medium">{groupProgress}%</span>
                    </div>
                    <Progress value={groupProgress} className="h-2 w-full" />
                  </div>
                </div>
              </Card>
            );
          })}
          
          {/* Render individual student cards */}
          {filteredIndividualStudents.map((student) => {
            const style = getAvatarStyle(student.full_name);
            return (
              <Card key={student.id} className="p-6 shadow-md hover:shadow-lg transition-shadow h-auto overflow-hidden border-2 border-green-200">
                <div className="flex flex-col space-y-4 w-full">
                  <div className="flex items-center mb-2">
                    <div className="bg-green-100 p-3 rounded-full mr-3">
                      <i className="fas fa-user text-green-600"></i>
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{student.full_name}</h3>
                      <span className="text-sm text-green-600 font-medium">👤 Individual Student</span>
                    </div>
                  </div>
                  
                  {/* Project Title */}
                  {student.project_title && (
                    <div className="bg-green-50 p-3 rounded-md">
                      <p className="text-sm font-medium text-gray-700">Project Title:</p>
                      <p className="text-sm text-gray-900 font-semibold mt-1">{student.project_title}</p>
                    </div>
                  )}
                  
                  <div className="space-y-3">
                    <div className="flex items-center p-2 bg-gray-50 rounded-md">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${style.bg} mr-3`}>
                        <span className={`${style.text} font-bold text-sm`}>
                          {getInitials(student.full_name)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{student.reference_number}</p>
                      </div>
                      <div className="text-sm font-medium ml-2">{student.progress || 0}%</div>
                    </div>
                  </div>
                  
                  <div className="w-full pt-2">
                    <div className="flex items-center mb-1">
                      <div className="text-sm font-medium">Project Completion</div>
                      <span className="ml-auto text-sm font-medium">{student.progress || 0}%</span>
                    </div>
                    <Progress value={student.progress || 0} className="h-2 w-full" />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <div className="mb-4">
            <i className="fas fa-users text-gray-400 text-4xl"></i>
          </div>
          <h3 className="text-lg font-medium text-gray-900">No students found</h3>
          {searchTerm ? (
            <p className="mt-2 text-gray-500">No students match your search criteria. Try a different search term.</p>
          ) : (
            <p className="mt-2 text-gray-500">You don't have any students assigned to you yet.</p>
          )}
        </div>
      )}
    </div>
  )
}
