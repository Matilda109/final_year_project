"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Search, AlertCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { getAllProjects } from "@/lib/projectRepository"
import { getStudentSubmissions, submitProject } from "@/lib/projectSubmissions";
import { supabase } from "@/lib/supabase"
import { createDraft, getUserDrafts, updateDraft, deleteDraft, getDraftById, ProjectDraft } from "@/lib/projectDrafts"

// Import the ProjectSubmission type from the library instead of redefining it
import { ProjectSubmission } from "@/lib/projectSubmissions";

interface SimilarProject {
  id: string;
  title: string;
  author: string;
  supervisor: string;
  year: number;
  department: string;
  description: string;
  similarity: number;
}

// Define milestone structure
interface Milestone {
  type: 'proposal' | 'literature' | 'methodology' | 'implementation' | 'thesis';
  title: string;
  description: string;
  dueDate?: string;
  submission?: ProjectSubmission;
  status: 'completed' | 'in_progress' | 'rejected' | 'not_started';
}

const ProjectsTab: React.FC = () => {
  const [activeTab, setActiveTab] = useState("current");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftTags, setDraftTags] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // New state variables for project submissions and milestones
  const [submissions, setSubmissions] = useState<ProjectSubmission[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(true);
  const [currentProject, setCurrentProject] = useState<ProjectSubmission | null>(null);
  const [supervisorName, setSupervisorName] = useState<string>("");
  const [currentMilestonePhase, setCurrentMilestonePhase] = useState<string>("");
  const [currentPhaseStatus, setCurrentPhaseStatus] = useState<string>('not_submitted');
  
  // New state variables for similarity check
  const [isCheckingProject, setIsCheckingProject] = useState(false);
  const [checkingProjectId, setCheckingProjectId] = useState<string | null>(null);
  const [similarityResults, setSimilarityResults] = useState<SimilarProject[]>([]);
  const [showSimilarityDialog, setShowSimilarityDialog] = useState(false);
  
  // New state variables for drafts
  const [drafts, setDrafts] = useState<ProjectDraft[]>([]);
  const [loadingDrafts, setLoadingDrafts] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [editingDraft, setEditingDraft] = useState<ProjectDraft | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeletingDraft, setIsDeletingDraft] = useState(false);
  const [deletingDraftId, setDeletingDraftId] = useState<string | null>(null);
  
  // Add submittingDraftId to component state
  const [submittingDraftId, setSubmittingDraftId] = useState<string | null>(null);
  
  // Fetch project submissions when component mounts
  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        setLoadingSubmissions(true);
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          console.error("No user found");
          setLoadingSubmissions(false);
          return;
        }
        
        // Get submissions for this student
        const submissionsData = await getStudentSubmissions(user.id);
        setSubmissions(submissionsData);
        
        // Find the most recent submission of each type
        const latestSubmissions = new Map<string, ProjectSubmission>();
        submissionsData.forEach(submission => {
          const existing = latestSubmissions.get(submission.project_type);
          if (!existing || 
              (submission.submitted_at && existing.submitted_at && 
               new Date(submission.submitted_at) > new Date(existing.submitted_at))) {
            latestSubmissions.set(submission.project_type, submission);
          }
        });
        
        // Set current project (most recent thesis or implementation or approved proposal)
        const thesis = latestSubmissions.get('thesis');
        const implementation = latestSubmissions.get('implementation');
        const proposal = latestSubmissions.get('proposal');
        
        if (thesis) {
          setCurrentProject(thesis);
        } else if (implementation) {
          setCurrentProject(implementation);
        } else if (proposal && proposal.status === 'approved') {
          setCurrentProject(proposal);
        }
        
        // Define milestone order and status
        const milestoneOrder: Array<'proposal' | 'literature' | 'methodology' | 'implementation' | 'thesis'> = [
          'proposal', 'literature', 'methodology', 'implementation', 'thesis'
        ];
        
        // Create milestone objects with their statuses
        const milestonesData: Milestone[] = [];
        let nextMilestoneFound = false;
        let nextPhase = '';
        let nextPhaseStatus = 'not_submitted';
        let nextPhaseType = '';
        
        milestoneOrder.forEach((type, index) => {
          const submission = latestSubmissions.get(type);
          let status: 'completed' | 'in_progress' | 'rejected' | 'not_started' = 'not_started';
          
          if (submission) {
            if (submission.status === 'approved') {
              status = 'completed';
              
              // If this is approved, set the next milestone as the next phase
              if (index < milestoneOrder.length - 1 && !nextPhase) {
                nextPhase = getMilestoneTitle(milestoneOrder[index + 1]);
                nextPhaseType = milestoneOrder[index + 1];
                
                // Check if there's a submission for the next phase
                const nextSubmission = latestSubmissions.get(milestoneOrder[index + 1]);
                if (nextSubmission) {
                  nextPhaseStatus = nextSubmission.status || 'pending';
                } else {
                  nextPhaseStatus = 'not_submitted';
                }
              }
            } else if (submission.status === 'rejected') {
              status = 'rejected';
            } else {
              status = 'in_progress';
              nextMilestoneFound = true;
            }
          } else if (!nextMilestoneFound) {
            // If we haven't found the next milestone yet, and the previous milestone is completed
            const prevType = index > 0 ? milestoneOrder[index - 1] : null;
            const prevSubmission = prevType ? latestSubmissions.get(prevType) : null;
            
            if (!prevType || (prevSubmission && prevSubmission.status === 'approved')) {
              // This is the next milestone to work on, but no submission yet
              status = 'not_started';
              nextMilestoneFound = true;
              
              // Set the current milestone phase
              if (!currentMilestonePhase) {
                setCurrentMilestonePhase(getMilestoneTitle(type));
                nextPhaseType = type;
                nextPhaseStatus = 'not_submitted';
              }
            }
          }
          
          milestonesData.push({
            type,
            title: getMilestoneTitle(type),
            description: getMilestoneDescription(type),
            submission,
            status,
            dueDate: getMilestoneDueDate(type)
          });
        });
        
        setMilestones(milestonesData);
        
        // Find the current milestone phase - either the in-progress one or the next one after the last approved
        const inProgressMilestone = milestonesData.find(m => m.status === 'in_progress');
        if (inProgressMilestone) {
          setCurrentMilestonePhase(inProgressMilestone.title);
          
          // Check if there's a submission for this phase
          const currentPhaseSubmission = latestSubmissions.get(inProgressMilestone.type);
          if (currentPhaseSubmission && currentPhaseSubmission.status) {
            setCurrentPhaseStatus(currentPhaseSubmission.status);
          } else {
            setCurrentPhaseStatus('not_submitted');
          }
        } else if (nextPhase) {
          setCurrentMilestonePhase(nextPhase);
          setCurrentPhaseStatus(nextPhaseStatus);
        }
      } catch (error) {
        console.error("Error fetching submissions:", error);
        toast.error("Failed to fetch project submissions");
      } finally {
        setLoadingSubmissions(false);
      }
    };
    
    fetchSubmissions();
  }, []);
  
  // Fetch supervisor name when current project changes
  useEffect(() => {
    const fetchSupervisorName = async () => {
      if (currentProject) {
        try {
          // Fetch supervisor details
          const { data: supervisorData, error } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', currentProject.supervisor_id)
            .single();
            
          if (supervisorData && !error) {
            setSupervisorName(supervisorData.full_name);
          } else {
            setSupervisorName("Unknown Supervisor");
          }
        } catch (error) {
          console.error("Error fetching supervisor:", error);
          setSupervisorName("Unknown Supervisor");
        }
      }
    };
    
    fetchSupervisorName();
  }, [currentProject]);
  
  // Fetch student name
  const [studentName, setStudentName] = useState<string>("");
  
  useEffect(() => {
    const fetchStudentName = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          return;
        }
        
        // Get student profile
        const { data: studentData, error } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();
          
        if (studentData && !error) {
          setStudentName(studentData.full_name);
        }
        
        // Set current user ID for drafts
        setCurrentUserId(user.id);
      } catch (error) {
        console.error("Error fetching student name:", error);
      }
    };
    
    fetchStudentName();
  }, []);
  
  // Add a new useEffect to fetch drafts
  useEffect(() => {
    const fetchDrafts = async () => {
      // Only fetch drafts when the drafts tab is active
      if (activeTab !== "drafts") return;
      
      try {
        setLoadingDrafts(true);
        
        if (!currentUserId) {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            console.error("No user found");
            setLoadingDrafts(false);
            return;
          }
          setCurrentUserId(user.id);
        }
        
        // Try to get drafts from database
        try {
          const draftsData = await getUserDrafts(currentUserId);
          setDrafts(draftsData);
        } catch (error) {
          console.error("Error fetching user drafts:", error);
          
          // Fallback: Create test drafts for similarity testing
          console.log("🔧 Database error - using test drafts for similarity testing");
          const testDrafts: ProjectDraft[] = [
            {
              id: 'test-draft-1',
              user_id: currentUserId,
              title: 'AI-Driven Customer Experience Optimization',
              description: 'This project focuses on developing an AI-powered system to enhance customer experience through personalized recommendations and automated support. The system uses machine learning algorithms to analyze customer behavior patterns and provide real-time assistance to customers.',
              tags: ['AI', 'Customer Experience', 'Machine Learning'],
              status: 'draft',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            {
              id: 'test-draft-2',
              user_id: currentUserId,
              title: 'Blockchain Supply Chain Management',
              description: 'A comprehensive blockchain solution for tracking and managing supply chain operations. This project implements smart contracts to ensure transparency and traceability throughout the supply chain process.',
              tags: ['Blockchain', 'Supply Chain', 'Smart Contracts'],
              status: 'draft',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ];
          
          setDrafts(testDrafts);
          toast.info("📝 Using test drafts for similarity testing (database connection issue)");
        }
      } catch (error) {
        console.error("Error in fetchDrafts:", error);
        toast.error("Failed to load drafts");
      } finally {
        setLoadingDrafts(false);
      }
    };
    
    fetchDrafts();
  }, [activeTab, currentUserId]);

  // Helper functions for milestone data
  const getMilestoneTitle = (type: string): string => {
    switch (type) {
      case 'proposal': return 'Project Proposal';
      case 'literature': return 'Literature Review';
      case 'methodology': return 'Methodology Chapter';
      case 'implementation': return 'Implementation & Results';
      case 'thesis': return 'Final Thesis & Defense';
      default: return 'Unknown Milestone';
    }
  };
  
  // Function to refresh data
  const refreshData = async () => {
    try {
      setIsRefreshing(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error("No user found");
        setIsRefreshing(false);
        return;
      }
      
      // Get submissions for this student
      const submissionsData = await getStudentSubmissions(user.id);
      setSubmissions(submissionsData);
      
      // Find the most recent submission of each type
      const latestSubmissions = new Map<string, ProjectSubmission>();
      submissionsData.forEach(submission => {
        const existing = latestSubmissions.get(submission.project_type);
        if (!existing || 
            (submission.submitted_at && existing.submitted_at && 
             new Date(submission.submitted_at) > new Date(existing.submitted_at))) {
          latestSubmissions.set(submission.project_type, submission);
        }
      });
      
      // Set current project (most recent thesis or implementation or approved proposal)
      const thesis = latestSubmissions.get('thesis');
      const implementation = latestSubmissions.get('implementation');
      const proposal = latestSubmissions.get('proposal');
      
      if (thesis) {
        setCurrentProject(thesis);
      } else if (implementation) {
        setCurrentProject(implementation);
      } else if (proposal && proposal.status === 'approved') {
        setCurrentProject(proposal);
      }
      
      // Refresh milestones
      // Similar logic as in useEffect...
      
      toast.success("Data refreshed successfully");
    } catch (error) {
      console.error("Error refreshing data:", error);
      toast.error("Failed to refresh data");
    } finally {
      setIsRefreshing(false);
    }
  };
  
  const getMilestoneDescription = (type: string): string => {
    switch (type) {
      case 'proposal': return 'Initial project proposal and scope definition';
      case 'literature': return 'Review of existing research and methodologies';
      case 'methodology': return 'Detailed description of research methodology';
      case 'implementation': return 'Implementation of methodology and analysis of results';
      case 'thesis': return 'Complete thesis document and project defense';
      default: return '';
    }
  };
  
  const getMilestoneDueDate = (type: string): string => {
    // In a real app, these would come from the database or be calculated
    const currentYear = new Date().getFullYear();
    switch (type) {
      case 'proposal': return `March 1, ${currentYear}`;
      case 'literature': return `May 15, ${currentYear}`;
      case 'methodology': return `June 19, ${currentYear}`;
      case 'implementation': return `July 30, ${currentYear}`;
      case 'thesis': return `August 30, ${currentYear}`;
      default: return '';
    }
  };
  
  const handleCreateDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("User not authenticated");
        setIsSubmitting(false);
        return;
      }
      
      // Create a new draft
      const newDraft: ProjectDraft = {
        user_id: user.id,
        title: draftTitle,
        description: draftDescription,
        tags: draftTags ? draftTags.split(',').map(tag => tag.trim()) : [],
      };
      
      const result = await createDraft(newDraft);
      
      if (result) {
        toast.success("Draft saved successfully");
        setIsDialogOpen(false);
        
        // Reset form
        setDraftTitle("");
        setDraftDescription("");
        setDraftTags("");
        
        // Refresh drafts list
        const draftsData = await getUserDrafts(user.id);
        setDrafts(draftsData);
      } else {
        toast.error("Failed to save draft");
      }
    } catch (error) {
      console.error("Error creating draft:", error);
      toast.error("Failed to save draft");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to open the edit dialog with the selected draft
  const handleEditDraftClick = (draft: ProjectDraft) => {
    setEditingDraft(draft);
    setDraftTitle(draft.title);
    setDraftDescription(draft.description);
    setDraftTags(draft.tags ? draft.tags.join(', ') : '');
    setIsEditDialogOpen(true);
  };

  // Function to save the edited draft
  const handleUpdateDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingDraft || !editingDraft.id) {
      toast.error("No draft selected for editing");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Update the draft
      const updatedDraft: ProjectDraft = {
        ...editingDraft,
        title: draftTitle,
        description: draftDescription,
        tags: draftTags ? draftTags.split(',').map(tag => tag.trim()) : [],
      };
      
      const result = await updateDraft(updatedDraft);
      
      if (result) {
        toast.success("Draft updated successfully");
        setIsEditDialogOpen(false);
        
        // Reset form
        setDraftTitle("");
        setDraftDescription("");
        setDraftTags("");
        setEditingDraft(null);
        
        // Refresh drafts list
        const draftsData = await getUserDrafts(currentUserId);
        setDrafts(draftsData);
      } else {
        toast.error("Failed to update draft");
      }
    } catch (error) {
      console.error("Error updating draft:", error);
      toast.error("Failed to update draft");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to handle deleting a draft
  const handleDeleteDraft = async (draftId: string) => {
    if (!draftId) {
      toast.error("Invalid draft ID");
      return;
    }
    
    setIsDeletingDraft(true);
    setDeletingDraftId(draftId);
    
    try {
      const success = await deleteDraft(draftId, currentUserId);
      
      if (success) {
        toast.success("Draft deleted successfully");
        
        // Refresh drafts list
        const draftsData = await getUserDrafts(currentUserId);
        setDrafts(draftsData);
      } else {
        toast.error("Failed to delete draft");
      }
    } catch (error) {
      console.error("Error deleting draft:", error);
      toast.error("Failed to delete draft");
    } finally {
      setIsDeletingDraft(false);
      setDeletingDraftId(null);
    }
  };
  
  // Function to check for similar projects using BERT similarity API
  const handleCheckSimilarity = async (projectId: string, title: string, description: string) => {
    setIsCheckingProject(true);
    setCheckingProjectId(projectId);
    
    try {
      // Get all projects from the repository for comparison
      const projects = await getAllProjects();
      
      if (!projects || projects.length === 0) {
        toast.info("No projects in repository to compare against.");
        return;
      }
      
      // Prepare the query text (combine title and description with better formatting)
      let queryText = '';
      if (title && title.trim()) {
        queryText += title.trim();
      }
      if (description && description.trim()) {
        queryText += (queryText ? '. ' : '') + description.trim();
      }
      
      // Validate query text
      if (!queryText || queryText.length < 10) {
        toast.error("❌ Project title and description are too short for meaningful similarity comparison. Please add more details.");
        return;
      }
      
      // Debug: Log the query text and projects data
      console.log('🔍 Student Dashboard Similarity Check Debug:');
      console.log('📝 Query Text:', queryText);
      console.log('📝 Query Text Length:', queryText.length);
      console.log('📝 Query Word Count:', queryText.split(' ').length);
      console.log('📚 Total Projects in Repository:', projects.length);
      console.log('📋 First few projects:', projects.slice(0, 3).map(p => ({ title: p.title, author: p.author, hasUrl: !!p.document_url })));
      
      // Prepare projects data for the similarity API
      const projectsForAPI = projects.map(project => ({
        id: project.id || '',
        title: project.title,
        author: project.author,
        year: project.year,
        description: project.description,
        tags: project.tags || [],
        document_url: project.document_url || null
      }));
      
      // Debug: Log the API request payload
      const apiPayload = {
        text: queryText,
        projects: projectsForAPI
      };
      console.log('📤 API Request Payload:', {
        text_length: apiPayload.text.length,
        projects_count: apiPayload.projects.length,
        first_project: apiPayload.projects[0]
      });
      
      // Call the simple metadata similarity API (student dashboard only compares title + description)
      console.log('🌐 Calling metadata similarity API at http://localhost:8000/check-metadata-similarity');
      const response = await fetch('http://localhost:8000/check-metadata-similarity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title,
          description: description,
          projects: projectsForAPI
        })
      });
      
      console.log('📥 API Response Status:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        console.error('❌ API Error Response:', errorData);
        throw new Error(errorData.detail || `API returned ${response.status}: ${response.statusText}`);
      }
      
      const similarityReport = await response.json();
      
      // Debug: Log the API response
      console.log('📊 API Response:', {
        overall_similarity: similarityReport.overall_similarity,
        total_matches: similarityReport.matches?.length || 0,
        methodology: similarityReport.methodology,
        database_size: similarityReport.database_size
      });
      
      // Debug: Log first few matches with their scores
      if (similarityReport.matches && similarityReport.matches.length > 0) {
        console.log('🎯 Top matches from API:', similarityReport.matches.slice(0, 5).map((m: any) => ({
          title: m.title,
          author: m.author,
          similarity_score: m.similarity_score
        })));
      } else {
        console.log('❌ No matches returned from API');
      }
      
      // Filter matches with similarity > 30% and map to our SimilarProject interface
      const significantMatches: SimilarProject[] = (similarityReport.matches || [])
        .filter((match: any) => {
          const hasScore = match.similarity_score > 30;
          console.log(`🔍 Match "${match.title}" - Score: ${match.similarity_score}% - Included: ${hasScore}`);
          return hasScore;
        })
        .map((match: any) => ({
          id: match.id,
          title: match.title,
          author: match.author,
          supervisor: 'Unknown', // We don't have supervisor info in the current data structure
          year: match.year,
          department: 'Unknown', // We don't have department info in the current data structure
          description: projects.find(p => p.id === match.id)?.description || 'No description available',
          similarity: match.similarity_score / 100 // Convert percentage to decimal
        }));
      
      console.log(`🎯 Final Results: ${significantMatches.length} significant matches after filtering`);
      
      setSimilarityResults(significantMatches);
      
      if (significantMatches.length === 0) {
        // Debug: Check if there were any matches at all before filtering
        const allMatches = similarityReport.matches || [];
        console.log(`⚠️ No significant matches found. Total API matches: ${allMatches.length}`);
        if (allMatches.length > 0) {
          console.log('🔍 All matches (including low similarity):', allMatches.map((m: any) => ({
            title: m.title,
            similarity: m.similarity_score
          })));
        }
        toast.success("✅ No similar projects found! Your project appears to be unique.");
      } else {
        // Show different messages based on similarity levels
        const highSimilarity = significantMatches.filter(p => p.similarity > 0.7);
        const mediumSimilarity = significantMatches.filter(p => p.similarity >= 0.5 && p.similarity <= 0.7);
        
        console.log(`📊 Similarity Distribution: High: ${highSimilarity.length}, Medium: ${mediumSimilarity.length}, Low: ${significantMatches.length - highSimilarity.length - mediumSimilarity.length}`);
        
        if (highSimilarity.length > 0) {
          toast.warning(`⚠️ Found ${highSimilarity.length} highly similar project(s). Please review carefully.`);
        } else if (mediumSimilarity.length > 0) {
          toast.info(`ℹ️ Found ${mediumSimilarity.length} moderately similar project(s). Consider reviewing for inspiration.`);
        } else {
          toast.success(`✅ Found ${significantMatches.length} projects with low similarity. Your project looks good!`);
        }
        
        setShowSimilarityDialog(true);
      }
      
      // Log detailed analysis for debugging
      console.log('Similarity Analysis:', {
        overall_similarity: similarityReport.overall_similarity,
        total_matches: similarityReport.matches.length,
        significant_matches: significantMatches.length,
        query_word_count: similarityReport.word_count,
        database_size: similarityReport.database_size,
        methodology: similarityReport.methodology
      });
      
    } catch (error) {
      console.error("Error checking project similarity:", error);
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('fetch')) {
          toast.error("❌ Cannot connect to similarity service. Please ensure the API server is running.");
        } else {
          toast.error(`❌ Similarity check failed: ${error.message}`);
        }
      } else {
        toast.error("❌ Failed to check for similar projects. Please try again.");
      }
    } finally {
      setIsCheckingProject(false);
      setCheckingProjectId(null);
    }
  };

  // Function to handle submitting a draft as a project proposal
  const handleSubmitDraft = async (draft: ProjectDraft) => {
    if (!draft.id) {
      toast.error("Invalid draft ID");
      return;
    }
    
    // Set the ID of the draft being submitted to track loading state
    setIsSubmitting(true);
    setSubmittingDraftId(draft.id);
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("User not authenticated");
        setIsSubmitting(false);
        setSubmittingDraftId(null);
        return;
      }
      
      // Create a project submission from the draft
      const submission: ProjectSubmission = {
        student_id: user.id,
        supervisor_id: '', // This will be assigned later in the workflow
        project_type: 'proposal',
        title: draft.title,
        abstract: draft.description,
        keywords: draft.tags,
        status: 'pending',
        submitted_at: new Date().toISOString()
      };
      
      // Submit the project
      const result = await submitProject(submission);
      
      if (result.success) {
        toast.success("Draft submitted as project proposal");
        
        // Delete the draft since it's now submitted
        await deleteDraft(draft.id, currentUserId);
        
        // Refresh drafts list
        const draftsData = await getUserDrafts(currentUserId);
        setDrafts(draftsData);
        
        // Refresh submissions
        await refreshData();
        
        // Switch to the current projects tab
        setActiveTab("current");
      } else {
        toast.error("Failed to submit draft as project proposal");
      }
    } catch (error) {
      console.error("Error submitting draft:", error);
      toast.error("Failed to submit draft as project proposal");
    } finally {
      setIsSubmitting(false);
      setSubmittingDraftId(null);
    }
  };
  
  return (
    <div className="space-y-2 -mt-2">
      <Tabs defaultValue="current" onValueChange={setActiveTab}>
        <div className="flex justify-between items-center mb-2">
          <TabsList>
            <TabsTrigger value="current">Current Projects</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="drafts">Draft Proposals</TabsTrigger>
          </TabsList>
          
          {/* Only show the Create Draft button when the drafts tab is active */}
          {activeTab === "drafts" && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="!rounded-button whitespace-nowrap bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-md transition-all duration-200 border border-indigo-100">
                  <i className="fas fa-pen-fancy mr-2"></i> Create Draft
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[550px]">
                <form onSubmit={handleCreateDraft}>
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Create Draft Proposal</DialogTitle>
                    <DialogDescription className="text-gray-500">
                      Draft your project proposal. You can save it now and submit it later when you're ready.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-6 py-6">
                    <div className="space-y-2">
                      <Label htmlFor="draft-title" className="text-sm font-medium">
                        Project Title <span className="text-red-500">*</span>
                      </Label>
                      <Input 
                        id="draft-title" 
                        placeholder="Enter a clear and concise title for your project" 
                        className="w-full"
                        value={draftTitle}
                        onChange={(e) => setDraftTitle(e.target.value)}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="draft-description" className="text-sm font-medium">
                        Project Description <span className="text-red-500">*</span>
                      </Label>
                      <Textarea
                        id="draft-description"
                        placeholder="Provide a detailed description of your project, including objectives, methodology, and expected outcomes"
                        className="min-h-[150px] resize-none"
                        value={draftDescription}
                        onChange={(e) => setDraftDescription(e.target.value)}
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">Minimum 100 characters recommended for a comprehensive description</p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="draft-tags" className="text-sm font-medium">
                        Tags (comma separated)
                      </Label>
                      <Input 
                        id="draft-tags" 
                        placeholder="E.g. AI, Machine Learning, Computer Vision" 
                        className="w-full"
                        value={draftTags}
                        onChange={(e) => setDraftTags(e.target.value)}
                      />
                      <p className="text-xs text-gray-500 mt-1">Add relevant tags to categorize your project</p>
                    </div>
                  </div>
                  <DialogFooter className="flex items-center justify-between border-t pt-4">
                    <p className="text-xs text-gray-500">
                      <span className="text-red-500">*</span> Required fields
                    </p>
                    <div className="flex space-x-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="!rounded-button whitespace-nowrap bg-transparent"
                        onClick={() => setIsDialogOpen(false)}
                        disabled={isSubmitting}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        className="!rounded-button whitespace-nowrap bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          "Save Draft"
                        )}
                      </Button>
                    </div>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Current Projects Tab Content */}
        <TabsContent value="current" className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {loadingSubmissions ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
              </div>
            ) : currentProject ? (
              <Card className="overflow-hidden border-0 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-3">
                  <CardTitle className="text-xl">Final Year Project</CardTitle>
                  <CardDescription className="text-blue-100">
                    Project Details
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="bg-white p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Left column - Student and Project Info */}
                      <div>
                        <div className="flex items-center mb-5">
                          <Avatar className="h-16 w-16 mr-4 border-2 border-blue-100">
                            <AvatarImage src="/placeholder.svg?height=64&width=64" />
                            <AvatarFallback>{studentName ? studentName.charAt(0) : 'S'}</AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="text-xl font-semibold">{studentName || 'Student'}</h3>
                            <p className="text-gray-500 mt-1">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {currentProject.project_type.charAt(0).toUpperCase() + currentProject.project_type.slice(1)}
                              </span>
                            </p>
                          </div>
                        </div>

                        <div className="mt-5">
                          <h4 className="text-sm font-medium text-gray-500 mb-2">Project Title</h4>
                          <p className="text-lg font-medium text-gray-800">{currentProject.title}</p>
                        </div>

                        {currentProject.abstract && (
                          <div className="mt-5">
                            <h4 className="text-sm font-medium text-gray-500 mb-2">Project Abstract</h4>
                            <div className="bg-gray-50 p-4 rounded-md border border-gray-100">
                              <p className="text-sm text-gray-700">{currentProject.abstract}</p>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Right column - Project Details */}
                      <div className="space-y-4 border-l pl-8 border-gray-100">
                        <div>
                          <h4 className="text-sm font-medium text-gray-500 mb-2">Supervisor</h4>
                          <div className="flex items-center">
                            <Avatar className="h-10 w-10 mr-3">
                              <AvatarImage src="/placeholder.svg?height=32&width=32" />
                              <AvatarFallback>{supervisorName ? supervisorName.charAt(0) : 'S'}</AvatarFallback>
                            </Avatar>
                            <p className="font-medium text-gray-800">{supervisorName || 'Unknown Supervisor'}</p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          {currentProject.reviewed_at && (
                            <>
                              <div>
                                <h4 className="text-sm font-medium text-gray-500 mb-1">Start Date</h4>
                                <p className="font-medium text-gray-800">
                                  {new Date(currentProject.reviewed_at).toLocaleDateString()}
                                </p>
                              </div>
                              
                              <div>
                                <h4 className="text-sm font-medium text-gray-500 mb-1">Expected Completion</h4>
                                <p className="font-medium text-gray-800">
                                  {(() => {
                                    const completionDate = new Date(currentProject.reviewed_at);
                                    completionDate.setMonth(completionDate.getMonth() + 5);
                                    return completionDate.toLocaleDateString();
                                  })()}
                                </p>
                              </div>
                            </>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <h4 className="text-sm font-medium text-gray-500 mb-1">Current Phase</h4>
                            <p className="font-medium text-gray-800">{currentMilestonePhase || 'Getting Started'}</p>
                          </div>

                          <div>
                            <h4 className="text-sm font-medium text-gray-500 mb-1">Phase Status</h4>
                            {currentPhaseStatus === 'approved' ? (
                              <Badge className="bg-green-500 hover:bg-green-600">Approved</Badge>
                            ) : currentPhaseStatus === 'rejected' ? (
                              <Badge className="bg-red-500 hover:bg-red-600">Rejected</Badge>
                            ) : currentPhaseStatus === 'pending' ? (
                              <Badge className="bg-amber-500 hover:bg-amber-600">Under Review</Badge>
                            ) : (
                              <Badge className="bg-gray-700 text-white">Not Started</Badge>
                            )}
                          </div>
                        </div>
                        
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 px-6 py-4 border-t border-gray-100">
                    <div className="flex justify-between items-center">
                      <div className="text-sm text-gray-500 flex items-center">
                        <i className="fas fa-clock mr-2"></i> Last updated: {
                          currentProject.reviewed_at ? 
                            new Date(currentProject.reviewed_at).toLocaleString() : 
                            new Date(currentProject.submitted_at || '').toLocaleString()
                        }
                      </div>
                      <div>
                        <Button 
                          variant="outline"
                          size="sm" 
                          className="!rounded-button whitespace-nowrap bg-white text-blue-600 border-blue-200 hover:bg-blue-50"
                          onClick={refreshData}
                          disabled={isRefreshing}
                        >
                          {isRefreshing ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Refreshing...
                            </>
                          ) : (
                            <>
                              <i className="fas fa-sync-alt mr-2"></i> Refresh
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-file-alt text-gray-400 text-xl"></i>
                </div>
                <h3 className="text-lg font-medium text-gray-700 mb-2">No Current Project</h3>
                <p className="text-gray-500 max-w-md mx-auto mb-6">
                  You haven't submitted any projects yet. Start by creating a project proposal.
                </p>
                <Button 
                  onClick={() => window.location.href = '/admin/studentdashboard/components/tabs/submit-tab'}
                  className="!rounded-button whitespace-nowrap bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-md transition-all duration-200"
                >
                  <i className="fas fa-plus-circle mr-2"></i> Submit Your First Project
                </Button>
              </div>
            )}
          </div>

          <Card>
            <CardHeader className="py-3">
              <CardTitle>Project Milestones</CardTitle>
              <CardDescription>Track your progress against key milestones</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingSubmissions ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute top-0 bottom-0 left-[15px] w-0.5 bg-gray-200"></div>
                  <ul className="space-y-6">
                    {milestones.map((milestone, index) => (
                      <li key={milestone.type} className="relative pl-8">
                        <span className={`absolute left-0 flex items-center justify-center w-8 h-8 rounded-full border-4 border-white ${
                          milestone.status === 'completed' ? 'bg-green-100 text-green-600' :
                          milestone.submission ? 'bg-amber-100 text-amber-600' :
                          milestone.status === 'rejected' ? 'bg-red-100 text-red-600' :
                          'bg-gray-700 text-white'
                        }`}>
                          {milestone.status === 'completed' ? (
                            <i className="fas fa-check"></i>
                          ) : milestone.submission ? (
                            <i className="fas fa-spinner fa-spin"></i>
                          ) : milestone.status === 'rejected' ? (
                            <i className="fas fa-times"></i>
                          ) : (
                            <i className="fas fa-circle"></i>
                          )}
                        </span>
                        <div>
                          <div className="flex justify-between items-start">
                            <h4 className="font-medium">{milestone.title}</h4>
                            {milestone.status === 'completed' ? (
                              <Badge className="bg-green-500 hover:bg-green-600">Approved</Badge>
                            ) : milestone.submission && milestone.submission.status === 'pending' ? (
                              <Badge className="bg-amber-500 hover:bg-amber-600">Pending</Badge>
                            ) : milestone.status === 'rejected' ? (
                              <Badge className="bg-red-500 hover:bg-red-600">Rejected</Badge>
                            ) : (
                              <Badge className="bg-gray-700 text-white">Not Started</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">{milestone.description}</p>
                          {milestone.submission && milestone.submission.reviewed_at && (
                            <p className="text-xs text-gray-400 mt-1">
                              {milestone.status === 'completed' ? 'Approved on ' : 
                               milestone.status === 'rejected' ? 'Rejected on ' : 
                               'Submitted on '}
                              {new Date(milestone.submission.reviewed_at).toLocaleDateString()}
                            </p>
                          )}
                          {milestone.submission && !milestone.submission.reviewed_at && (
                            <p className="text-xs text-gray-400 mt-1">
                              Submitted on {new Date(milestone.submission.submitted_at || '').toLocaleDateString()}
                            </p>
                          )}
                          {!milestone.submission && milestone.status === 'not_started' && (
                            <p className="text-xs text-gray-400 mt-1">Due on {milestone.dueDate}</p>
                          )}
                          {milestone.status === 'rejected' && milestone.submission?.feedback && (
                            <div className="mt-2 p-2 bg-red-50 border border-red-100 rounded-md">
                              <p className="text-sm font-medium text-red-700">Feedback:</p>
                              <p className="text-xs text-red-600">{milestone.submission.feedback}</p>
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Completed Projects Tab Content */}
        <TabsContent value="completed" className="space-y-4">
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-check text-gray-400 text-xl"></i>
            </div>
            <h3 className="text-lg font-medium text-gray-700 mb-2">No Completed Projects Yet</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              Your completed projects will appear here once you've finished your current work.
            </p>
          </div>
        </TabsContent>

        {/* Draft Proposals Tab Content */}
        <TabsContent value="drafts" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {loadingDrafts ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
              </div>
            ) : drafts.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-file-alt text-gray-400 text-xl"></i>
                </div>
                <h3 className="text-lg font-medium text-gray-700 mb-2">No Draft Proposals</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  You haven't created any draft proposals yet. Start by creating one.
                </p>
              </div>
            ) : (
              drafts.map((draft) => (
                <Card key={draft.id} className="overflow-hidden border-0 shadow-md hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-xl">{draft.title}</CardTitle>
                      <Badge variant="outline">Draft</Badge>
                    </div>
                    <CardDescription>Created on {draft.created_at ? new Date(draft.created_at).toLocaleDateString() : 'N/A'}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 mb-4">{draft.description}</p>
                    <div className="flex flex-wrap gap-1 mt-3">
                      {draft.tags && draft.tags.map((tag, index) => (
                        <Badge variant="outline" key={index} className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                  <CardFooter className="border-t pt-4 flex justify-between">
                    <div className="text-sm text-gray-500">
                      <i className="fas fa-clock mr-2"></i> Last edited: {draft.updated_at ? new Date(draft.updated_at).toLocaleDateString() : 'N/A'}
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="!rounded-button whitespace-nowrap bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200"
                        onClick={() => handleCheckSimilarity(
                          draft.id || '', 
                          draft.title,
                          draft.description
                        )}
                        disabled={isCheckingProject && checkingProjectId === draft.id}
                      >
                        {isCheckingProject && checkingProjectId === draft.id ? (
                          <>
                            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                            Checking...
                          </>
                        ) : (
                          <>
                            <Search className="mr-2 h-3 w-3" />
                            Check
                          </>
                        )}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="!rounded-button whitespace-nowrap bg-transparent"
                        onClick={() => handleDeleteDraft(draft.id || '')}
                        disabled={isDeletingDraft && deletingDraftId === draft.id}
                      >
                        {isDeletingDraft && deletingDraftId === draft.id ? (
                          <>
                            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-trash-alt mr-2"></i> Delete
                          </>
                        )}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="!rounded-button whitespace-nowrap bg-transparent"
                        onClick={() => handleEditDraftClick(draft)}
                      >
                        <i className="fas fa-edit mr-2"></i> Edit
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              ))
            )}
          </div>
          
          {drafts.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4">Ready to Submit</h3>
              <Card>
                <CardContent className="p-0">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left p-4 font-medium text-gray-600">Title</th>
                        <th className="text-left p-4 font-medium text-gray-600">Last Edited</th>
                        <th className="text-right p-4 font-medium text-gray-600">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {drafts.map((draft) => (
                        <tr key={draft.id} className="border-b">
                          <td className="p-4 text-gray-800">{draft.title}</td>
                          <td className="p-4 text-gray-500">{draft.updated_at ? new Date(draft.updated_at).toLocaleDateString() : 'N/A'}</td>
                          <td className="p-4 text-right">
                            <Button 
                              size="sm" 
                              className="!rounded-button whitespace-nowrap bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white"
                              onClick={() => handleSubmitDraft(draft)}
                              disabled={isSubmitting && (submittingDraftId === draft.id)}
                            >
                              {isSubmitting && submittingDraftId === draft.id ? (
                                <>
                                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                  Submitting...
                                </>
                              ) : (
                                <>
                                  <i className="fas fa-paper-plane mr-2"></i> Submit as Proposal
                                </>
                              )}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Dialog for displaying similarity results */}
      <Dialog open={showSimilarityDialog} onOpenChange={setShowSimilarityDialog}>
        <DialogContent className="sm:max-w-[650px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold">Similar Projects Found</DialogTitle>
            <DialogDescription className="text-gray-500">
              We found the following similar projects in our repository. Please review them before proceeding.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4 max-h-[400px] overflow-y-auto">
            {similarityResults.length > 0 ? (
              similarityResults.map((project) => (
                <Card key={project.id} className="border-l-4 border-l-amber-500">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{project.title}</CardTitle>
                      <Badge 
                        className={`${
                          project.similarity > 0.7 
                            ? 'bg-red-100 text-red-700 border-red-300' 
                            : 'bg-amber-100 text-amber-700 border-amber-300'
                        }`}
                      >
                        {(project.similarity * 100).toFixed(0)}% Similar
                      </Badge>
                    </div>
                    <CardDescription>
                      By {project.author} • Supervised by {project.supervisor} • {project.year}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-700 line-clamp-3">{project.description}</p>
                    <div className="flex items-center mt-3 text-amber-700 bg-amber-50 p-2 rounded-md">
                      <AlertCircle className="h-4 w-4 mr-2" />
                      <p className="text-xs">
                        Your project appears similar to this existing work. Consider modifying your approach or consulting with your supervisor.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-check text-green-600 text-xl"></i>
                </div>
                <h3 className="text-lg font-medium text-gray-700 mb-2">No Similar Projects Found</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  Your project idea appears to be unique in our repository. You can proceed with your submission.
                </p>
              </div>
            )}
          </div>
          
          <DialogFooter className="border-t pt-4">
            <Button 
              onClick={() => setShowSimilarityDialog(false)}
              className="!rounded-button whitespace-nowrap"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog for editing drafts */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <form onSubmit={handleUpdateDraft}>
            <DialogHeader>
              <DialogTitle className="text-2xl font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Edit Draft Proposal</DialogTitle>
              <DialogDescription className="text-gray-500">
                Update your draft proposal details.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-6">
              <div className="space-y-2">
                <Label htmlFor="draft-title-edit" className="text-sm font-medium">
                  Project Title <span className="text-red-500">*</span>
                </Label>
                <Input 
                  id="draft-title-edit" 
                  placeholder="Enter a clear and concise title for your project" 
                  className="w-full"
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="draft-description-edit" className="text-sm font-medium">
                  Project Description <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="draft-description-edit"
                  placeholder="Provide a detailed description of your project, including objectives, methodology, and expected outcomes"
                  className="min-h-[150px] resize-none"
                  value={draftDescription}
                  onChange={(e) => setDraftDescription(e.target.value)}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Minimum 100 characters recommended for a comprehensive description</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="draft-tags-edit" className="text-sm font-medium">
                  Tags (comma separated)
                </Label>
                <Input 
                  id="draft-tags-edit" 
                  placeholder="E.g. AI, Machine Learning, Computer Vision" 
                  className="w-full"
                  value={draftTags}
                  onChange={(e) => setDraftTags(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">Add relevant tags to categorize your project</p>
              </div>
            </div>
            <DialogFooter className="flex items-center justify-between border-t pt-4">
              <p className="text-xs text-gray-500">
                <span className="text-red-500">*</span> Required fields
              </p>
              <div className="flex space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="!rounded-button whitespace-nowrap bg-transparent"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setEditingDraft(null);
                    setDraftTitle("");
                    setDraftDescription("");
                    setDraftTags("");
                  }}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="!rounded-button whitespace-nowrap bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update Draft"
                  )}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ProjectsTab
