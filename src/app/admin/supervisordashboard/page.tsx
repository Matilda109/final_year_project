"use client"

import { useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import SessionGuard from "@/components/SessionGuard"
import { Header } from "./components/header"
import { Sidebar } from "./components/sidebar"
import { DashboardContent } from "./components/dashboard-content"

export default function SupervisorDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard")
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  
  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed)
  }

  return (
    <SessionGuard>
      <div className="min-h-screen bg-[#F8F9FC] flex">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          sidebarCollapsed={sidebarCollapsed}
          toggleSidebar={toggleSidebar}
        />

        <div className={`transition-all duration-300 ${sidebarCollapsed ? "ml-20" : "ml-64"} flex-1`}>
          <Header setActiveTab={setActiveTab} activeTab={activeTab} sidebarCollapsed={sidebarCollapsed} />
          <main className="p-6 pt-16">
            <DashboardContent activeTab={activeTab} setActiveTab={setActiveTab} />
          </main>
        </div>
      </div>
    </SessionGuard>
  )
}
