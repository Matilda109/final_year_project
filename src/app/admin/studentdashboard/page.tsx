"use client"

import React from 'react'
import { useState } from "react"
import Sidebar from "@/app/admin/studentdashboard/components/sidebar"
import Header from "@/app/admin/studentdashboard/components/header"
import DashboardTab from "@/app/admin/studentdashboard/components/tabs/dashboard-tab"
import ProjectsTab from "@/app/admin/studentdashboard/components/tabs/projects-tab"
import SubmitTab from "@/app/admin/studentdashboard/components/tabs/submit-tab"
import PastProjectsTab from "@/app/admin/studentdashboard/components/tabs/past-projects-tab"
import MeetingsTab from "@/app/admin/studentdashboard/components/tabs/meetings-tab"
import FeedbackTab from "@/app/admin/studentdashboard/components/tabs/feedback-tab"
import ResourcesTab from "@/app/admin/studentdashboard/components/tabs/resources-tab"
import SettingsTab from "@/app/admin/studentdashboard/components/tabs/settings-tab"
import SessionGuard from '@/components/SessionGuard'

export default function StudentDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard")
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed)
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardTab />
      case "projects":
        return <ProjectsTab />
      case "submit":
        return <SubmitTab />
      case "past-projects":
        return <PastProjectsTab />
      case "meetings":
        return <MeetingsTab />
      case "feedback":
        return <FeedbackTab />
      case "resources":
        return <ResourcesTab />
      case "settings":
        return <SettingsTab />
      default:
        return <DashboardTab />
    }
  }

  return (
    <SessionGuard>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          sidebarCollapsed={sidebarCollapsed}
          toggleSidebar={toggleSidebar}
        />

        <div 
          style={{ 
            marginLeft: sidebarCollapsed ? "64px" : "256px",
            width: `calc(100% - ${sidebarCollapsed ? "64px" : "256px"})`,
          }} 
          className="flex-1 transition-all duration-300 flex flex-col"
        >
          <Header activeTab={activeTab} setActiveTab={setActiveTab} />
          <main className="p-8 flex-1 overflow-y-auto">{renderTabContent()}</main>
        </div>
      </div>
    </SessionGuard>
  )
}
