"use client"

import type React from "react"
import { Button } from "@/components/ui/button"

interface SidebarProps {
  activeTab: string
  setActiveTab: (tab: string) => void
  sidebarCollapsed: boolean
  toggleSidebar: () => void
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, sidebarCollapsed, toggleSidebar }) => {
  const renderSidebarItem = (id: string, label: string, icon: string) => (
    <button
      key={id}
      onClick={() => setActiveTab(id)}
      className={`flex items-center w-full px-4 py-3 mb-1 text-left transition-colors rounded-lg ${
        activeTab === id
          ? "bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-md"
          : "hover:bg-blue-50 text-gray-700 hover:text-indigo-800"
      }`}
    >
      <i className={`${icon} w-5 text-center mr-3 ${activeTab === id ? "text-white" : "text-indigo-500"}`}></i>
      {!sidebarCollapsed && <span className="font-medium">{label}</span>}
    </button>
  )

  return (
    <div
      className={`${sidebarCollapsed ? "w-16" : "w-64"} bg-gradient-to-b from-white to-blue-50 border-r border-gray-200 fixed h-full shadow-sm transition-all duration-300 hover:shadow-lg`}
    >
      <div className={`p-6 flex ${sidebarCollapsed ? "justify-center" : "justify-between"} items-center`}>
        {!sidebarCollapsed && (
          <h1 className="text-xl font-bold text-indigo-700 flex items-center">
            <i className="fas fa-graduation-cap mr-2"></i>
            FYP Manager
          </h1>
        )}
        {sidebarCollapsed && <i className="fas fa-graduation-cap text-xl text-indigo-700"></i>}
        <button
          onClick={toggleSidebar}
          className="text-indigo-700 hover:bg-indigo-100 p-1 rounded-full transition-colors duration-200"
        >
          <i className={`fas ${sidebarCollapsed ? "fa-chevron-right" : "fa-chevron-left"}`}></i>
        </button>
      </div>

      <div 
        className="px-3 py-2 sidebar-menu max-h-[calc(100vh-160px)] overflow-y-auto"
        style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}
      >
        <style jsx>{`
          div::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        {!sidebarCollapsed && (
          <p className="px-3 text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-2">Main Menu</p>
        )}
        {renderSidebarItem("dashboard", "Dashboard", "fas fa-home")}
        {renderSidebarItem("projects", "My Projects", "fas fa-project-diagram")}
        {renderSidebarItem("submit", "Submit Proposal", "fas fa-file-upload")}
        {renderSidebarItem("past-projects", "Past Projects", "fas fa-history")}

        {!sidebarCollapsed && (
          <p className="px-3 text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-2 mt-6">Communication</p>
        )}
        {sidebarCollapsed && <div className="my-6"></div>}
        {renderSidebarItem("meetings", "Meetings", "fas fa-calendar-alt")}
        {renderSidebarItem("feedback", "Feedback", "fas fa-comment-dots")}

        {!sidebarCollapsed && (
          <p className="px-3 text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-2 mt-6">Support</p>
        )}
        {sidebarCollapsed && <div className="my-6"></div>}
        {renderSidebarItem("resources", "Resources", "fas fa-book")}

        <div className="pb-16"></div>
      </div>
    </div>
  )
}

export default Sidebar
