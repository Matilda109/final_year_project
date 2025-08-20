"use client"

import { 
  LayoutDashboard, 
  Users, 
  Link2, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  BookOpen,
  FileText
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface SidebarProps {
  activeTab: string
  setActiveTab: (tab: string) => void
  sidebarCollapsed: boolean
  toggleSidebar: () => void
}

export default function Sidebar({ 
  activeTab, 
  setActiveTab, 
  sidebarCollapsed, 
  toggleSidebar 
}: SidebarProps) {
  const menuItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      id: "relationships",
      label: "Student-Supervisor Links",
      icon: <Link2 className="h-5 w-5" />,
    },
    {
      id: "assessments",
      label: "Project Assessments",
      icon: <FileText className="h-5 w-5" />,
    },
    {
      id: "projects",
      label: "Project Repository",
      icon: <BookOpen className="h-5 w-5" />,
    },
    {
      id: "resources",
      label: "Resources",
      icon: <FileText className="h-5 w-5" />,
    },
    {
      id: "users",
      label: "User Management",
      icon: <Users className="h-5 w-5" />,
    },
    {
      id: "settings",
      label: "Settings",
      icon: <Settings className="h-5 w-5" />,
    },
  ]

  return (
    <aside 
      className={cn(
        "fixed left-0 top-0 h-screen border-r transition-all duration-300 z-20 elegant-sidebar",
        sidebarCollapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div 
          className={cn(
            "p-4 border-b border-opacity-20 flex items-center",
            sidebarCollapsed ? "justify-center" : "justify-between"
          )}
          style={{ borderColor: "rgba(255, 255, 255, 0.1)" }}
        >
          {!sidebarCollapsed && <h2 className="font-bold text-lg text-gray-100">Admin Panel</h2>}
          <button 
            onClick={toggleSidebar}
            className="p-1 rounded-md hover:bg-opacity-20 hover:bg-sky-200 text-gray-300 hover:text-gray-100"
          >
            {sidebarCollapsed ? 
              <ChevronRight className="h-5 w-5" /> : 
              <ChevronLeft className="h-5 w-5" />
            }
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4">
          <ul className="space-y-1">
            {menuItems.map((item) => (
              <li key={item.id} className="px-3">
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start text-gray-300 hover:text-gray-100 hover:bg-opacity-20 hover:bg-sky-200",
                    activeTab === item.id ? "bg-opacity-25 bg-sky-200 text-gray-100" : ""
                  )}
                  onClick={() => setActiveTab(item.id)}
                >
                  <div className="flex items-center">
                    {item.icon}
                    {!sidebarCollapsed && <span className="ml-3">{item.label}</span>}
                  </div>
                </Button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Version */}
        <div className="p-4 text-xs text-gray-400 border-t border-opacity-20" style={{ borderColor: "rgba(255, 255, 255, 0.1)" }}>
          {!sidebarCollapsed && <div>v1.0.0</div>}
        </div>
      </div>
    </aside>
  )
} 