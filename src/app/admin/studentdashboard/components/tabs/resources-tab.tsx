"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getAllResources, Resource } from "@/lib/resources"
import { Loader2, FileText, FilePenLine, FileImage, FileSpreadsheet, File } from "lucide-react"

const ResourcesTab: React.FC = () => {
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchResources = async () => {
      try {
        const data = await getAllResources()
        setResources(data)
      } catch (error) {
        console.error("Failed to load resources:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchResources()
  }, [])

  const getIconForResourceType = (type: string) => {
    switch (type) {
      case 'pdf':
        return <FileText className="h-5 w-5 text-red-600" />;
      case 'word':
        return <FilePenLine className="h-5 w-5 text-blue-600" />;
      case 'powerpoint':
        return <FileImage className="h-5 w-5 text-orange-600" />;
      case 'excel':
        return <FileSpreadsheet className="h-5 w-5 text-green-600" />;
      case 'other':
      default:
        return <File className="h-5 w-5 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-8">
      <Tabs defaultValue="documentation">
        <TabsList className="mb-6">
          <TabsTrigger value="documentation">Documentation</TabsTrigger>
        </TabsList>

        <TabsContent value="documentation">
          <Card>
            <CardHeader>
              <CardTitle>Project Documentation</CardTitle>
              <CardDescription>Official documentation and templates for your final year project</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : resources.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No resources available at the moment.
                </div>
              ) : (
                <div className="space-y-4">
                  {resources.map((resource) => (
                    <div key={resource.id} className="flex items-center p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer whitespace-nowrap">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                        {getIconForResourceType(resource.type)}
                      </div>
                      <div className="flex-grow">
                        <h4 className="font-medium">{resource.title}</h4>
                        <p className="text-sm text-gray-500">{resource.description}</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="!rounded-button whitespace-nowrap"
                        onClick={() => resource.url ? window.open(resource.url, '_blank') : null}
                      >
                        <i className="fas fa-download"></i>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default ResourcesTab
