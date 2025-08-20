"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { getAllProjects } from "@/lib/projectRepository"
import { toast } from "sonner"

export default function TestSimilarityPage() {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [isChecking, setIsChecking] = useState(false)
  const [results, setResults] = useState<any>(null)

  const handleTestSimilarity = async () => {
    if (!title.trim() || !description.trim()) {
      toast.error("Please enter both title and description")
      return
    }

    setIsChecking(true)
    
    try {
      // Get all projects from the repository
      const projects = await getAllProjects()
      
      if (!projects || projects.length === 0) {
        toast.info("No projects in repository to compare against.")
        return
      }
      
      // Prepare the query text
      const queryText = `${title.trim()}. ${description.trim()}`
      
      // Prepare projects data for the similarity API
      const projectsForAPI = projects.map(project => ({
        id: project.id || '',
        title: project.title,
        author: project.author,
        year: project.year,
        description: project.description,
        tags: project.tags || [],
        document_url: project.document_url || null
      }))
      
      console.log('🔍 Testing Student Dashboard Similarity Check:')
      console.log('📝 Query Text:', queryText)
      console.log('📝 Query Text Length:', queryText.length)
      console.log('📚 Total Projects in Repository:', projects.length)
      
      // Call the similarity API
      const response = await fetch('http://localhost:8000/check-similarity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: queryText,
          projects: projectsForAPI
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }))
        throw new Error(errorData.detail || `API returned ${response.status}: ${response.statusText}`)
      }
      
      const similarityReport = await response.json()
      
      console.log('📊 API Response:', {
        overall_similarity: similarityReport.overall_similarity,
        total_matches: similarityReport.matches?.length || 0,
        methodology: similarityReport.methodology,
        database_size: similarityReport.database_size
      })
      
      // Filter matches with similarity > 30%
      const significantMatches = (similarityReport.matches || [])
        .filter((match: any) => match.similarity_score > 30)
      
      console.log('🎯 Significant Matches:', significantMatches.length)
      
      setResults({
        overall_similarity: similarityReport.overall_similarity,
        matches: significantMatches,
        total_matches: similarityReport.matches?.length || 0
      })
      
      if (significantMatches.length === 0) {
        toast.success("✅ No similar projects found! Your project appears to be unique.")
      } else {
        toast.warning(`⚠️ Found ${significantMatches.length} similar project(s). Check the results below.`)
      }
      
    } catch (error) {
      console.error("Error checking similarity:", error)
      toast.error(`❌ Similarity check failed: ${error}`)
    } finally {
      setIsChecking(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Test Student Dashboard Similarity Check</h1>
      
      <Card className="p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Enter Project Details</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Project Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter your project title..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Project Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter your project description..."
              rows={4}
            />
          </div>
          
          <Button 
            onClick={handleTestSimilarity}
            disabled={isChecking}
            className="w-full"
          >
            {isChecking ? "Checking Similarity..." : "Check Similarity"}
          </Button>
        </div>
      </Card>
      
      {results && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Similarity Results</h2>
          
          <div className="mb-4">
            <p><strong>Overall Similarity:</strong> {results.overall_similarity}%</p>
            <p><strong>Total Matches Found:</strong> {results.total_matches}</p>
            <p><strong>Significant Matches (>30%):</strong> {results.matches.length}</p>
          </div>
          
          {results.matches.length > 0 && (
            <div>
              <h3 className="font-medium mb-2">Similar Projects:</h3>
              <div className="space-y-2">
                {results.matches.map((match: any, index: number) => (
                  <div key={index} className="border rounded p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{match.title}</h4>
                        <p className="text-sm text-gray-600">by {match.author} ({match.year})</p>
                      </div>
                      <div className="text-right">
                        <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-sm">
                          {match.similarity_score.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
