import { DashboardOverview } from "./pages/dashboard-overview"
import { ProjectReview } from "./pages/project-review"
import { DuplicationCheck } from "./pages/duplication-check"
import { StudentManagement } from "./pages/student-management"
import { ProjectRepository } from "./pages/project-repository"
import { Settings } from "./pages/settings"
import { Feedback } from "./pages/feedback"
import { Meetings } from "./pages/meetings"
import { Scoring } from "./pages/scoring"

interface DashboardContentProps {
  activeTab: string
  setActiveTab: (tab: string) => void
}

export function DashboardContent({ activeTab, setActiveTab }: DashboardContentProps) {
  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardOverview setActiveTab={setActiveTab} />
      case "review":
        return <ProjectReview />
      case "duplication":
        return <DuplicationCheck />
      case "students":
        return <StudentManagement />
      case "repository":
        return <ProjectRepository />
      case "settings":
        return <Settings />
      case "feedback":
        return <Feedback />
      case "meetings":
        return <Meetings />
      case "scoring":
        return <Scoring />
      default:
        return <div>Select a section from the sidebar</div>
    }
  }

  return <>{renderContent()}</>
}
