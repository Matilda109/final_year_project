"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getAllProjects, RepositoryProject } from "@/lib/projectRepository"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

export function ProjectRepository() {
  const [searchQuery, setSearchQuery] = useState("")
  const [yearFilter, setYearFilter] = useState("All")
  const [departmentFilter, setDepartmentFilter] = useState("All")
  const [supervisorFilter, setSupervisorFilter] = useState("All")
  const [projects, setProjects] = useState<RepositoryProject[]>([])
  const [loading, setLoading] = useState(true)
  const [filteredProjects, setFilteredProjects] = useState<RepositoryProject[]>([])
  const [uniqueDepartments, setUniqueDepartments] = useState<string[]>([])
  const [uniqueSupervisors, setUniqueSupervisors] = useState<string[]>([])

  // Default image to use when no image is provided
  const defaultImage = "/sch.jpg";

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const projectsData = await getAllProjects();
      setProjects(projectsData);
      
      // Extract unique departments for filter dropdown
      const departments = Array.from(new Set(projectsData.map(p => p.department)));
      setUniqueDepartments(departments);
      
      // Extract unique supervisors for filter dropdown
      const supervisors = Array.from(new Set(projectsData.map(p => p.supervisor)));
      setUniqueSupervisors(supervisors);
      
      // Apply initial filtering
      applyFilters(projectsData);
    } catch (error) {
      console.error("Error fetching projects:", error);
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (projectsList: RepositoryProject[] = projects) => {
    let filtered = [...projectsList];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(project => 
        project.title.toLowerCase().includes(query) ||
        project.author.toLowerCase().includes(query) ||
        project.description.toLowerCase().includes(query) ||
        (project.tags && project.tags.some(tag => tag.toLowerCase().includes(query)))
      );
    }
    
    // Apply year filter
    if (yearFilter !== "All") {
      filtered = filtered.filter(project => project.year.toString() === yearFilter);
    }
    
    // Apply department filter
    if (departmentFilter !== "All") {
      filtered = filtered.filter(project => project.department === departmentFilter);
    }
    
    // Apply supervisor filter
    if (supervisorFilter !== "All") {
      filtered = filtered.filter(project => project.supervisor === supervisorFilter);
    }
    
    setFilteredProjects(filtered);
  };

  useEffect(() => {
    applyFilters();
  }, [searchQuery, yearFilter, departmentFilter, supervisorFilter, projects]);

  const handleDownload = (documentUrl: string | undefined, title: string) => {
    if (!documentUrl) {
      toast.error("No document available for download");
      return;
    }
    
    // Create an anchor element and trigger download
    const link = document.createElement('a');
    link.href = documentUrl;
    link.download = `${title.replace(/\s+/g, '_')}_document`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 -mt-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="relative flex-grow">
              <Input
                placeholder="Search by title, keyword, or author name"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white text-gray-700"
              />
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-gray-300 rounded-md text-sm cursor-pointer"
              >
                <option value="All">All Years</option>
                <option value="2024">2024</option>
                <option value="2023">2023</option>
                <option value="2022">2022</option>
                <option value="2021">2021</option>
                <option value="2020">2020</option>
              </select>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-gray-300 rounded-md text-sm cursor-pointer"
              >
                <option value="All">All Departments</option>
                {uniqueDepartments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
              <select
                value={supervisorFilter}
                onChange={(e) => setSupervisorFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-gray-300 rounded-md text-sm cursor-pointer"
              >
                <option value="All">All Supervisors</option>
                {uniqueSupervisors.map(supervisor => (
                  <option key={supervisor} value={supervisor}>{supervisor}</option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-20 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
              <p className="mt-2 text-gray-500">Loading projects...</p>
            </div>
          ) : filteredProjects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((project) => (
                <Card key={project.id} className="overflow-hidden border-0 shadow-md hover:shadow-lg transition-shadow">
                  <div className="h-40 overflow-hidden">
                    <img
                      src={project.image_url || defaultImage}
                      alt={project.title}
                      className="w-full h-full object-cover object-center"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.onerror = null;
                        target.src = defaultImage;
                      }}
                    />
                  </div>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{project.title}</CardTitle>
                      <Badge>{project.year}</Badge>
                    </div>
                    <CardDescription>By {project.author}</CardDescription>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <p className="text-sm text-gray-700 line-clamp-3">{project.description}</p>
                    <div className="flex flex-wrap gap-1 mt-3">
                      {project.tags && project.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                  <div className="border-t pt-3 px-6 pb-6 flex justify-between">
                    <div className="text-xs text-gray-500">Supervisor: {project.supervisor}</div>
                    <div className="flex space-x-2">
                      <button className="text-sm px-2 py-1 bg-white text-gray-700 hover:text-blue-600 hover:bg-blue-50 border border-gray-300 rounded-md transition-colors">
                        <i className="fas fa-eye"></i>
                      </button>
                      <button 
                        className="text-sm px-2 py-1 bg-white text-gray-700 hover:text-blue-600 hover:bg-blue-50 border border-gray-300 rounded-md transition-colors"
                        onClick={() => handleDownload(project.document_url, project.title)}
                        disabled={!project.document_url}
                        title={project.document_url ? "Download document" : "No document available"}
                      >
                        <i className="fas fa-download"></i>
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-5xl text-gray-300 mb-4">
                <i className="fas fa-search"></i>
              </div>
              <h3 className="text-lg font-medium text-gray-600">No projects found</h3>
              <p className="text-gray-500 mt-1">Try adjusting your search filters</p>
            </div>
          )}
        </CardContent>
        <div className="px-6 py-4 border-t flex justify-between">
          <div className="text-sm text-gray-500">
            Showing {filteredProjects.length} of {projects.length} projects
          </div>
          <div className="flex space-x-1">
            <button disabled className="px-3 py-1 bg-white text-gray-400 border border-gray-300 rounded-md">
              <i className="fas fa-chevron-left"></i>
            </button>
            <button className="px-3 py-1 bg-blue-50 text-blue-600 border border-blue-200 rounded-md">1</button>
            <button className="px-3 py-1 bg-white text-gray-700 hover:text-blue-600 hover:bg-blue-50 border border-gray-300 rounded-md">
              2
            </button>
            <button className="px-3 py-1 bg-white text-gray-700 hover:text-blue-600 hover:bg-blue-50 border border-gray-300 rounded-md">
              3
            </button>
            <button className="px-3 py-1 bg-white text-gray-700 hover:text-blue-600 hover:bg-blue-50 border border-gray-300 rounded-md">
              4
            </button>
            <button className="px-3 py-1 bg-white text-gray-700 hover:text-blue-600 hover:bg-blue-50 border border-gray-300 rounded-md">
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>
        </div>
      </Card>
    </div>
  )
}
