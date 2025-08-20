"use client"

import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

interface SidebarProps {
  activeTab: string
  setActiveTab: (tab: string) => void
  sidebarCollapsed: boolean
  toggleSidebar: () => void
}

export function Sidebar({ activeTab, setActiveTab, sidebarCollapsed, toggleSidebar }: SidebarProps) {
  const menuItems = [
    { id: "dashboard", icon: "fas fa-home", label: "Dashboard", section: "Overview" },
    { id: "review", icon: "fas fa-clipboard-list", label: "Submitted Projects", section: "Project Management" },
    { id: "feedback", icon: "fas fa-comment-dots", label: "Provide Feedback", section: "Project Management" },
    { id: "scoring", icon: "fas fa-star", label: "Project Assessment", section: "Project Management" },
    { id: "duplication", icon: "fas fa-shield-alt", label: "AI Duplication Check", section: "Project Management" },
    { id: "students", icon: "fas fa-users", label: "Student Management", section: "Students" },
    { id: "repository", icon: "fas fa-folder", label: "Repository", section: "Resources" },
    { id: "meetings", icon: "fas fa-calendar-alt", label: "Meetings", section: "Resources" },
  ]

  const sections = ["Overview", "Project Management", "Students", "Resources"]

  return (
    <div
      className={`bg-gradient-to-b from-[#2D3250] to-[#424769] text-white transition-all duration-300 ${sidebarCollapsed ? "w-20" : "w-64"} fixed h-screen z-20 backdrop-blur-sm`}
    >
      <div className="p-4 flex items-center justify-between border-b border-blue-900">
        {!sidebarCollapsed && (
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-full bg-blue-400 flex items-center justify-center">
              <i className="fas fa-graduation-cap text-white"></i>
            </div>
            <div>
              <h1 className="font-bold">FYP Manager</h1>
              <p className="text-xs text-blue-200">Supervisor Portal</p>
            </div>
          </div>
        )}
        {sidebarCollapsed && (
          <div className="h-10 w-10 rounded-full bg-blue-400 flex items-center justify-center mx-auto">
            <i className="fas fa-graduation-cap text-white"></i>
          </div>
        )}
        <button onClick={toggleSidebar} className="text-white hover:text-blue-200 cursor-pointer">
          <i className={`fas ${sidebarCollapsed ? "fa-chevron-right" : "fa-chevron-left"}`}></i>
        </button>
      </div>

      <div className="flex flex-col h-[calc(100vh-6rem)]">
        <ScrollArea className="flex-1 py-4">
          <ul className="space-y-2">
            {sections.map((section, sectionIndex) => (
              <div key={section}>
                {!sidebarCollapsed && (
                  <li className="px-4 py-1">
                    <p className="text-xs uppercase text-blue-300 font-semibold tracking-wider">{section}</p>
                  </li>
                )}
                {menuItems
                  .filter((item) => item.section === section)
                  .map((item) => (
                    <li key={item.id}>
                      <button
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full flex items-center space-x-3 px-4 py-3 hover:bg-blue-800 transition-colors ${activeTab === item.id ? "bg-blue-800" : ""} cursor-pointer`}
                      >
                        <i className={`${item.icon} w-6 text-center`}></i>
                        {!sidebarCollapsed && <span>{item.label}</span>}
                      </button>
                    </li>
                  ))}
                {sectionIndex < sections.length - 1 && !sidebarCollapsed && (
                  <li className="my-3 px-4">
                    <Separator className="bg-blue-900/40" />
                  </li>
                )}
              </div>
            ))}
          </ul>
        </ScrollArea>
      </div>
    </div>
  )
}
