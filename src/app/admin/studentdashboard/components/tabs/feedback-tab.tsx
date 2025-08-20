"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { getStudentFeedback } from "@/app/admin/supervisordashboard/lib/data"

interface FeedbackItem {
  id: string;
  student_id: string;
  supervisor_id: string;
  project_type: string;
  status: string;
  comments: string;
  document_url?: string;
  created_at: string;
  student_name: string;
  supervisor_name: string;
  project_title?: string;
}

const FeedbackTab: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true)
  const [feedback, setFeedback] = useState<FeedbackItem[]>([])
  const [studentId, setStudentId] = useState<string | null>(null)
  
  useEffect(() => {
    const fetchFeedback = async () => {
      try {
        setLoading(true)
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          console.error("No user found")
          setLoading(false)
          return
        }
        
        setStudentId(user.id)
        
        // Get feedback for this student
        const feedbackData = await getStudentFeedback(user.id)
        setFeedback(feedbackData)
      } catch (error) {
        console.error("Error fetching feedback:", error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchFeedback()
  }, [])
  
  // Format date for display
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }
  
  // Get status display text and color
  const getStatusInfo = (status: string): { text: string; color: string } => {
    switch (status) {
      case 'approved':
        return { text: 'Approved', color: 'bg-green-100 text-green-800' }
      case 'revisions':
        return { text: 'Revisions Needed', color: 'bg-amber-100 text-amber-800' }
      case 'rejected':
        return { text: 'Rejected', color: 'bg-red-100 text-red-800' }
      default:
        return { text: 'Unknown', color: 'bg-gray-100 text-gray-800' }
    }
  }
  
  // Get project type display text
  const getProjectTypeTitle = (type: string): string => {
    switch (type) {
      case 'proposal': return 'Project Proposal';
      case 'literature': return 'Literature Review';
      case 'methodology': return 'Methodology Chapter';
      case 'implementation': return 'Implementation & Results';
      case 'thesis': return 'Final Thesis';
      default: return type.charAt(0).toUpperCase() + type.slice(1);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    )
  }

  if (feedback.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Feedback History</CardTitle>
          <CardDescription>Review feedback from your supervisor on your project</CardDescription>
        </CardHeader>
        <CardContent className="py-10">
          <div className="text-center">
            <p className="text-gray-500">No feedback has been provided yet.</p>
            <p className="text-gray-500 mt-2">Check back after submitting your work for review.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
          <Card>
            <CardHeader>
          <CardTitle>Feedback History</CardTitle>
          <CardDescription>Review feedback from your supervisor on your project</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {feedback.map((item, index) => {
              const statusInfo = getStatusInfo(item.status)
              const projectTypeTitle = getProjectTypeTitle(item.project_type)
              
              // Parse comments to extract sections
              const commentSections = [];
              try {
                // Try to parse JSON if comments are structured
                const parsedComments = JSON.parse(item.comments);
                if (Array.isArray(parsedComments)) {
                  commentSections.push(...parsedComments);
                } else {
                  // If not an array but an object, use it as a single section
                  commentSections.push(parsedComments);
                }
              } catch (e) {
                // If not valid JSON, treat as a single text section
                commentSections.push({
                  title: "General Feedback",
                  type: "neutral",
                  content: item.comments
                });
              }
              
              return (
                <div key={item.id} className="bg-white rounded-lg p-6 shadow-sm border">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center bg-blue-100 text-blue-800 rounded-full h-8 w-8 font-medium">
                        {index + 1}
                      </span>
                      <h3 className="font-semibold text-lg">{projectTypeTitle} Feedback</h3>
                </div>
                    <div className={`${statusInfo.color} text-xs px-2 py-1 rounded-full font-medium`}>
                      {statusInfo.text}
                </div>
              </div>

              <div className="mb-4">
                <h4 className="font-medium text-gray-700 mb-1">Document Details</h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <span className="text-gray-500">Document:</span>
                        <span className="font-medium text-gray-700 ml-2">{item.project_title || projectTypeTitle}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Submitted:</span>
                        <span className="font-medium text-gray-700 ml-2">{formatDate(item.created_at)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Reviewed:</span>
                        <span className="font-medium text-gray-700 ml-2">{formatDate(item.created_at)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Reviewer:</span>
                        <span className="font-medium text-gray-700 ml-2">{item.supervisor_name}</span>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="font-medium text-gray-700 mb-2">Feedback Summary</h4>
                <p className="text-gray-600 text-sm">
                      {commentSections.length > 1 
                        ? "Your submission has been reviewed. Please address the specific comments below."
                        : commentSections[0]?.content?.substring(0, 150) + "..."}
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start space-x-4">
                  <Avatar>
                        <AvatarFallback>
                          {item.supervisor_name.split(' ').map(name => name[0]).join('')}
                        </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                          <h4 className="font-medium">{item.supervisor_name}</h4>
                          <span className="text-xs text-gray-500">{formatDate(item.created_at)}</span>
                    </div>
                    <div className="mt-2 space-y-3">
                          {commentSections.length > 1 ? (
                            // Display structured comments
                            commentSections.map((section, i) => {
                              const borderColor = section.type === 'negative' 
                                ? 'border-red-500' 
                                : section.type === 'positive'
                                ? 'border-green-500'
                                : 'border-amber-500';
                              
                              const textColor = section.type === 'negative' 
                                ? 'text-red-700' 
                                : section.type === 'positive'
                                ? 'text-green-700'
                                : 'text-amber-700';
                              
                              return (
                                <div key={i} className={`bg-gray-50 p-3 rounded-lg border-l-4 ${borderColor}`}>
                                  <h5 className={`font-medium ${textColor} mb-1`}>{section.title}</h5>
                        <p className="text-sm text-gray-700">
                                    {section.content}
                        </p>
                      </div>
                              );
                            })
                          ) : (
                            // Display plain text comment
                            <div className="bg-gray-50 p-3 rounded-lg border-l-4 border-gray-500">
                        <p className="text-sm text-gray-700">
                                {item.comments}
                        </p>
                      </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {item.document_url && (
                      <div className="flex justify-end">
                        <a 
                          href={item.document_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          <i className="fas fa-file-download mr-1"></i> Download Review Document
                        </a>
                  </div>
                    )}

                    {item.status === 'revisions' && (
                <div className="flex justify-end">
                  <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                    <i className="fas fa-reply mr-1"></i> Respond to Feedback
                  </button>
                </div>
                    )}
                  </div>
                </div>
              );
            })}
              </div>
            </CardContent>
          </Card>
    </div>
  )
}

export default FeedbackTab
