"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getAllProjects, RepositoryProject } from "@/lib/projectRepository"
import { checkDocumentSimilarity, extractTextFromFile, SimilarityReport, SimilarityMatch } from "@/lib/similarityService"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"

// Interface for duplication alerts
interface DuplicationAlert {
  id: string
  studentName: string
  projectTitle: string
  similarity: number
  matchedWith: string
  date: string
  status: 'pending' | 'reviewed' | 'flagged'
  submittedDocument?: string
  matchedProject?: SimilarityMatch
}

export function DuplicationCheck() {
  const [similarityScore, setSimilarityScore] = useState<number | null>(null)
  const [documentText, setDocumentText] = useState<string>("")
  const [fileName, setFileName] = useState<string>("")
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const [isFileUploaded, setIsFileUploaded] = useState<boolean>(false)
  const [projects, setProjects] = useState<RepositoryProject[]>([])
  const [similarityReport, setSimilarityReport] = useState<SimilarityReport | null>(null)
  const [comparisonOpen, setComparisonOpen] = useState<boolean>(false)
  const [selectedMatch, setSelectedMatch] = useState<SimilarityMatch | null>(null)
  const [duplicationAlerts, setDuplicationAlerts] = useState<DuplicationAlert[]>([])
  const [alertDialogOpen, setAlertDialogOpen] = useState<boolean>(false)
  const [selectedAlert, setSelectedAlert] = useState<DuplicationAlert | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Load existing alerts from localStorage
  useEffect(() => {
    const savedAlerts = localStorage.getItem('duplicationAlerts')
    if (savedAlerts) {
      try {
        setDuplicationAlerts(JSON.parse(savedAlerts))
      } catch (error) {
        console.error('Error loading saved alerts:', error)
      }
    }
  }, [])

  // Save alerts to localStorage whenever alerts change
  useEffect(() => {
    if (duplicationAlerts.length > 0) {
      localStorage.setItem('duplicationAlerts', JSON.stringify(duplicationAlerts))
    }
  }, [duplicationAlerts])

  // Fetch projects on component mount
  useEffect(() => {
    async function fetchProjects() {
      try {
        const projectsData = await getAllProjects()
        setProjects(projectsData)
      } catch (error) {
        console.error("Error fetching projects:", error)
        toast.error("Failed to load project repository")
      }
    }
    
    fetchProjects()
  }, [])

  // Function to create a new duplication alert
  const createDuplicationAlert = (match: SimilarityMatch, studentName: string = 'Anonymous Student') => {
    const newAlert: DuplicationAlert = {
      id: Date.now().toString(),
      studentName,
      projectTitle: fileName || 'Untitled Document',
      similarity: match.similarity_score,
      matchedWith: match.title,
      date: new Date().toISOString().split('T')[0],
      status: match.similarity_score >= 80 ? 'flagged' : 'pending',
      submittedDocument: documentText,
      matchedProject: match
    }
    
    setDuplicationAlerts(prev => [newAlert, ...prev.slice(0, 9)]) // Keep only 10 most recent
    
    if (match.similarity_score >= 70) {
      toast.warning(`High similarity detected (${match.similarity_score.toFixed(1)}%) - Alert created`)
    }
  }

  // Function to handle alert review
  const handleReviewAlert = (alert: DuplicationAlert) => {
    setSelectedAlert(alert)
    setAlertDialogOpen(true)
  }

  // Function to update alert status
  const updateAlertStatus = (alertId: string, status: DuplicationAlert['status']) => {
    setDuplicationAlerts(prev => 
      prev.map(alert => 
        alert.id === alertId ? { ...alert, status } : alert
      )
    )
    toast.success(`Alert marked as ${status}`)
  }
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setFileName(file.name)
    setIsFileUploaded(true)
    setIsProcessing(true)
    
    try {
      // Extract text from the uploaded file but don't display it
      const text = await extractTextFromFile(file)
      setDocumentText(text)
      toast.success(`File "${file.name}" uploaded successfully`)
    } catch (error) {
      toast.error("Failed to read file. Please try a different format.")
      console.error("File reading error:", error)
      setIsFileUploaded(false)
    } finally {
      setIsProcessing(false)
    }
  }
  
  const handleCheckSimilarity = async () => {
    if (!documentText.trim()) {
      toast.error("Please enter or upload document content first")
      return
    }
    
    setIsProcessing(true)
    
    try {
      console.log(`📚 Total projects in repository: ${projects.length}`);
      
      // Format projects to match the structure expected by the similarity API
      // This ensures consistency with the student dashboard
      const projectsForAPI = projects.map(project => ({
        id: project.id || '',
        title: project.title,
        author: project.author,
        year: project.year,
        description: project.description,
        tags: project.tags || [],
        document_url: project.document_url || null
      }));
      
      console.log(`🔍 Formatted ${projectsForAPI.length} projects for similarity API`);
      console.log(`📄 Document text length: ${documentText.length} characters`);
      
      // Debug: Log the first few characters of document text
      console.log(`📝 Document text preview: "${documentText.substring(0, 200)}..."`);
      
      // Debug: Log first project for comparison
      if (projectsForAPI.length > 0) {
        console.log(`🎯 First project in repository:`, {
          title: projectsForAPI[0].title,
          description: projectsForAPI[0].description?.substring(0, 100) + '...',
          tags: projectsForAPI[0].tags
        });
      }
      
      // Call the similarity API with properly formatted data
      const report = await checkDocumentSimilarity(documentText, projectsForAPI)
      
      console.log(`✅ Similarity check completed. Overall similarity: ${report.overall_similarity}%`);
      console.log(`🎯 Found ${report.matches.length} matches in database of ${report.database_size} projects`);
      
      // Debug: Log top matches
      if (report.matches.length > 0) {
        console.log(`🏆 Top 3 matches:`);
        report.matches.slice(0, 3).forEach((match, i) => {
          console.log(`  ${i + 1}. "${match.title}" by ${match.author} - ${match.similarity_score}%`);
        });
      }
      
      // Automatically create alerts for high similarity matches
      const highSimilarityMatches = report.matches.filter(match => match.similarity_score >= 60)
      if (highSimilarityMatches.length > 0) {
        console.log(`🚨 Creating alerts for ${highSimilarityMatches.length} high similarity matches`);
        highSimilarityMatches.forEach(match => {
          createDuplicationAlert(match, 'Current User') // In real app, get actual student name
        })
      }
      
      setSimilarityReport(report)
      setSimilarityScore(report.overall_similarity)
    } catch (error) {
      console.error("Error checking similarity:", error)
      toast.error("Failed to process similarity check")
    } finally {
      setIsProcessing(false)
    }
  }

  const getSimilarityColor = (score: number | null) => {
    if (score === null) return "bg-gray-200"
    if (score < 30) return "bg-green-500"
    if (score < 70) return "bg-orange-500"
    return "bg-red-500"
  }
  
  const handleFlagForReview = (projectTitle: string) => {
    // In a real implementation, this would send a notification or create a record in the database
    toast.success(`Project "${projectTitle}" has been flagged for review`)
  }
  
  const handleViewComparison = (match: SimilarityMatch) => {
    setSelectedMatch(match)
    setComparisonOpen(true)
  }

  return (
    <div className="space-y-6">
      <Card className="p-6 shadow-md">
        <h2 className="text-lg font-semibold mb-4">Check Project for Similarity</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Paste project abstract or content</label>
            {!isFileUploaded ? (
              <textarea
                className="w-full h-40 p-3 border border-black rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white text-black"
                placeholder="Paste the project content here to check for potential duplications..."
                value={documentText}
                onChange={(e) => setDocumentText(e.target.value)}
              ></textarea>
            ) : (
              <div className="w-full h-40 p-3 border border-black rounded-lg bg-white text-black flex flex-col items-center justify-center">
                <div className="text-center">
                  <i className="fas fa-file-alt text-3xl mb-2 text-blue-500"></i>
                  <p className="font-medium">{fileName}</p>
                  <p className="text-sm text-gray-500 mt-1">File uploaded successfully</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-3"
                    onClick={() => {
                      setIsFileUploaded(false);
                      setFileName("");
                      setDocumentText("");
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                  >
                    <i className="fas fa-times mr-1"></i> Remove File
                  </Button>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center">
            <span className="text-sm text-gray-500 mr-4">Or upload a file:</span>
            <div className="relative">
              <Button variant="outline" className="!rounded-button whitespace-nowrap cursor-pointer bg-white">
                <i className="fas fa-upload mr-2"></i> Choose File
              </Button>
              <input 
                type="file" 
                className="absolute inset-0 opacity-0 cursor-pointer" 
                onChange={handleFileChange}
                ref={fileInputRef}
                accept=".txt,.pdf,.doc,.docx"
              />
            </div>
            <span className="ml-3 text-sm text-gray-500">
              {fileName || "No file chosen"}
            </span>
          </div>
          <div className="pt-2">
            <Button
              onClick={handleCheckSimilarity}
              className="bg-blue-600 hover:bg-blue-700 text-white !rounded-button whitespace-nowrap cursor-pointer"
              disabled={isProcessing || !documentText.trim()}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <i className="fas fa-search mr-2"></i> Check Similarity
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {similarityScore !== null && (
        <Card className="p-6 shadow-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Similarity Results</h2>
            <div className="flex items-center mt-4 md:mt-0">
              <div className="text-sm mr-4">
                <span className="font-medium">Analyzed:</span> {similarityReport?.word_count || 0} words
              </div>
              <div className="text-sm">
                <span className="font-medium">Database:</span> {similarityReport?.database_size || 0} projects
              </div>
            </div>
          </div>
          <div className="flex flex-col md:flex-row space-y-6 md:space-y-0 md:space-x-6">
            <div className="md:w-1/3 flex flex-col items-center">
              <div className="text-center mb-4">
                <p className="text-sm text-gray-500 mb-2">Similarity Score</p>
                <div
                  className={`h-32 w-32 rounded-full flex items-center justify-center ${getSimilarityColor(similarityScore)}`}
                >
                  <span className="text-3xl font-bold text-white">{similarityScore.toFixed(1)}%</span>
                </div>
              </div>
              <div className="text-center space-y-2">
                <p className="text-sm font-medium">
                  {similarityScore < 30
                    ? "Low similarity detected"
                    : similarityScore < 70
                      ? "Moderate similarity detected"
                      : "High similarity detected"}
                </p>
                <p className="text-xs text-gray-500">
                  {similarityScore < 30
                    ? "The content appears to be original."
                    : similarityScore < 70
                      ? "Some sections may need review."
                      : "Significant overlap with existing projects."}
                </p>
                {similarityScore >= 70 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="mt-2 !rounded-button whitespace-nowrap cursor-pointer bg-red-600 hover:bg-red-700"
                    onClick={() => handleFlagForReview("Current Project")}
                  >
                    <i className="fas fa-flag mr-2"></i> Flag for Review
                  </Button>
                )}
              </div>
            </div>
            <div className="md:w-2/3">
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-100 px-4 py-2 font-medium">Top Matching Projects</div>
                <div className="divide-y">
                  {similarityReport && similarityReport.matches.length > 0 ? (
                    similarityReport.matches.map((match, index) => (
                      <div className="p-4" key={match.id || index}>
                        <div className="flex justify-between mb-2">
                          <span className="font-medium">{match.title}</span>
                          <Badge 
                            className={`${
                              match.similarity_score < 30 
                                ? "bg-green-100 text-green-800" 
                                : match.similarity_score < 70 
                                  ? "bg-orange-100 text-orange-800" 
                                  : "bg-red-100 text-red-800"
                            }`}
                          >
                            {match.similarity_score.toFixed(1)}% Match
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{match.author} ({match.year})</p>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="!rounded-button whitespace-nowrap cursor-pointer bg-white"
                            onClick={() => handleViewComparison(match)}
                          >
                            <i className="fas fa-eye mr-2"></i> View Comparison
                          </Button>
                          {match.similarity_score >= 70 && (
                            <Button
                              variant="destructive"
                              size="sm"
                              className="!rounded-button whitespace-nowrap cursor-pointer bg-red-600 hover:bg-red-700"
                              onClick={() => handleFlagForReview(match.title)}
                            >
                              <i className="fas fa-flag mr-2"></i> Flag
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-gray-500">
                      No matching projects found
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-6 shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Recent Duplication Alerts</h2>
          <Badge variant="outline" className="text-sm">
            {duplicationAlerts.length} Alert{duplicationAlerts.length !== 1 ? 's' : ''}
          </Badge>
        </div>
        
        {duplicationAlerts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <i className="fas fa-shield-alt text-4xl mb-4 text-gray-300"></i>
            <p className="text-lg font-medium mb-2">No Duplication Alerts</p>
            <p className="text-sm">When high similarity is detected, alerts will appear here for review.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Project Title</TableHead>
                <TableHead>Similarity</TableHead>
                <TableHead>Matched With</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {duplicationAlerts.map((alert) => (
                <TableRow key={alert.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <div className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                          {alert.studentName.charAt(0).toUpperCase()}
                        </div>
                      </Avatar>
                      <span className="font-medium">{alert.studentName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs truncate font-medium">
                    {alert.projectTitle}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      className={`${
                        alert.similarity >= 80 
                          ? "bg-red-100 text-red-800" 
                          : alert.similarity >= 60 
                            ? "bg-orange-100 text-orange-800" 
                            : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {alert.similarity.toFixed(1)}%
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-gray-600">
                    {alert.matchedWith}
                  </TableCell>
                  <TableCell className="text-gray-600">
                    {new Date(alert.date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline"
                      className={`${
                        alert.status === 'flagged' 
                          ? "border-red-200 text-red-700" 
                          : alert.status === 'reviewed' 
                            ? "border-green-200 text-green-700" 
                            : "border-yellow-200 text-yellow-700"
                      }`}
                    >
                      {alert.status.charAt(0).toUpperCase() + alert.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex space-x-2 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        className="!rounded-button whitespace-nowrap cursor-pointer bg-white"
                        onClick={() => handleReviewAlert(alert)}
                      >
                        <i className="fas fa-eye mr-2"></i> Review
                      </Button>
                      {alert.status === 'pending' && (
                        <Button
                          variant="destructive"
                          size="sm"
                          className="!rounded-button whitespace-nowrap cursor-pointer bg-red-600 hover:bg-red-700"
                          onClick={() => updateAlertStatus(alert.id, 'flagged')}
                        >
                          <i className="fas fa-flag mr-2"></i> Flag
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Comparison Dialog */}
      <Dialog open={comparisonOpen} onOpenChange={setComparisonOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Similarity Comparison</DialogTitle>
            <DialogDescription>
              Comparing your document with "{selectedMatch?.title || ''}" ({selectedMatch?.year || ''})
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="border rounded p-4">
              <h3 className="font-medium mb-2">Submitted Document</h3>
              <div className="mb-3 text-xs text-gray-500 flex items-center space-x-4">
                <span>📄 {fileName || 'Uploaded Document'}</span>
                <span>📊 {documentText.split(' ').length.toLocaleString()} words</span>
                <span>📁 {Math.ceil(documentText.length / 2000)} pages (est.)</span>
              </div>
              <div className="max-h-96 overflow-y-auto bg-gray-50 p-4 text-sm leading-relaxed">
                <div className="whitespace-pre-wrap text-gray-800">
                  {documentText.length > 2000 
                    ? `${documentText.substring(0, 2000).trim()}...\n\n[Content truncated for display. Full document used for similarity analysis.]`
                    : documentText
                  }
                </div>
              </div>
            </div>
            
            <div className="border rounded p-4">
              <h3 className="font-medium mb-2">{selectedMatch?.title || ''}</h3>
              <div className="max-h-96 overflow-y-auto bg-gray-50 p-3 text-sm">
                <p className="text-gray-600 italic mb-2">By {selectedMatch?.author || ''}</p>
                {selectedMatch?.document_url ? (
                  <div className="text-gray-800">
                    <p className="mb-2">This document is available for detailed review.</p>
                    <a 
                      href={selectedMatch.document_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      <i className="fas fa-external-link-alt mr-1"></i> Open Document
                    </a>
                  </div>
                ) : (
                  <p className="text-gray-700">Full document content not available for preview.</p>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Alert Review Dialog */}
      <Dialog open={alertDialogOpen} onOpenChange={setAlertDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Duplication Alert Review</DialogTitle>
            <DialogDescription>
              Reviewing alert for "{selectedAlert?.projectTitle || ''}" by {selectedAlert?.studentName || ''}
            </DialogDescription>
          </DialogHeader>
          
          {selectedAlert && (
            <div className="space-y-6">
              {/* Alert Summary */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-600">Similarity Score:</span>
                    <div className="mt-1">
                      <Badge 
                        className={`${
                          selectedAlert.similarity >= 80 
                            ? "bg-red-100 text-red-800" 
                            : selectedAlert.similarity >= 60 
                              ? "bg-orange-100 text-orange-800" 
                              : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {selectedAlert.similarity.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Status:</span>
                    <div className="mt-1">
                      <Badge 
                        variant="outline"
                        className={`${
                          selectedAlert.status === 'flagged' 
                            ? "border-red-200 text-red-700" 
                            : selectedAlert.status === 'reviewed' 
                              ? "border-green-200 text-green-700" 
                              : "border-yellow-200 text-yellow-700"
                        }`}
                      >
                        {selectedAlert.status.charAt(0).toUpperCase() + selectedAlert.status.slice(1)}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Date:</span>
                    <div className="mt-1 text-gray-800">
                      {new Date(selectedAlert.date).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Matched With:</span>
                    <div className="mt-1 text-gray-800 truncate">
                      {selectedAlert.matchedWith}
                    </div>
                  </div>
                </div>
              </div>

              {/* Document Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded p-4">
                  <h3 className="font-medium mb-2">Submitted Document</h3>
                  <div className="mb-3 text-xs text-gray-500 flex items-center space-x-4">
                    <span>👤 {selectedAlert.studentName}</span>
                    <span>📄 {selectedAlert.projectTitle}</span>
                    {selectedAlert.submittedDocument && (
                      <span>📊 {selectedAlert.submittedDocument.split(' ').length.toLocaleString()} words</span>
                    )}
                  </div>
                  <div className="max-h-96 overflow-y-auto bg-gray-50 p-4 text-sm leading-relaxed">
                    <div className="whitespace-pre-wrap text-gray-800">
                      {selectedAlert.submittedDocument 
                        ? (selectedAlert.submittedDocument.length > 2000 
                            ? `${selectedAlert.submittedDocument.substring(0, 2000).trim()}...\n\n[Content truncated for display. Full document used for similarity analysis.]`
                            : selectedAlert.submittedDocument
                          )
                        : "Document content not available for preview."
                      }
                    </div>
                  </div>
                </div>
                
                <div className="border rounded p-4">
                  <h3 className="font-medium mb-2">{selectedAlert.matchedProject?.title || selectedAlert.matchedWith}</h3>
                  <div className="max-h-96 overflow-y-auto bg-gray-50 p-3 text-sm">
                    <p className="text-gray-600 italic mb-2">By {selectedAlert.matchedProject?.author || 'Unknown Author'}</p>
                    {selectedAlert.matchedProject?.document_url ? (
                      <div className="text-gray-800">
                        <p className="mb-2">This document is available for detailed review.</p>
                        <a 
                          href={selectedAlert.matchedProject.document_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          <i className="fas fa-external-link-alt mr-1"></i> Open Document
                        </a>
                      </div>
                    ) : (
                      <p className="text-gray-700">Full document content not available for preview.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between items-center pt-4 border-t">
                <div className="flex space-x-2">
                  {selectedAlert.status !== 'reviewed' && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        updateAlertStatus(selectedAlert.id, 'reviewed')
                        setAlertDialogOpen(false)
                      }}
                      className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                    >
                      <i className="fas fa-check mr-2"></i> Mark as Reviewed
                    </Button>
                  )}
                  {selectedAlert.status !== 'flagged' && (
                    <Button
                      variant="destructive"
                      onClick={() => {
                        updateAlertStatus(selectedAlert.id, 'flagged')
                        setAlertDialogOpen(false)
                      }}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      <i className="fas fa-flag mr-2"></i> Flag for Investigation
                    </Button>
                  )}
                </div>
                <Button
                  variant="outline"
                  onClick={() => setAlertDialogOpen(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
