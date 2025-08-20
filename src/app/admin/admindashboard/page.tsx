"use client"

import React, { useState } from 'react'
import Header from './components/header'
import Sidebar from './components/sidebar'
import RelationshipsTab from './components/tabs/relationships-tab'
import UsersTab from './components/tabs/users-tab'
import SettingsTab from './components/tabs/settings-tab'
import DashboardTab from './components/tabs/dashboard-tab'
import ProjectsTab from './components/tabs/projects-tab'
import ResourcesTab from './components/tabs/resources-tab'
import AssessmentsTab from './components/tabs/assessments-tab'
import SessionGuard from '@/components/SessionGuard'
import './admin-styles.css'

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard")
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed)
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardTab />
      case "relationships":
        return <RelationshipsTab />
      case "assessments":
        return <AssessmentsTab />
      case "projects":
        return <ProjectsTab />
      case "resources":
        return <ResourcesTab />
      case "users":
        return <UsersTab />
      case "settings":
        return <SettingsTab />
      default:
        return <DashboardTab />
    }
  }

  return (
    <SessionGuard>
      <div className="flex min-h-screen bg-gray-50 admin-dashboard">
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
          <Header activeTab={activeTab} setActiveTab={setActiveTab} sidebarCollapsed={sidebarCollapsed} />
          <main className="p-8 flex-1 overflow-y-auto">{renderTabContent()}</main>
        </div>
      </div>
    </SessionGuard>
  )
} 