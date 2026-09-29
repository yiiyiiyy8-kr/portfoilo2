import { useState } from 'react'
import IntroReveal from './components/IntroReveal'
import ToolsShowcase from './components/ToolsShowcase'
import ScrollNav from './components/ScrollNav'
import ProjectDetail from './components/ProjectDetail'

function App() {
  const [activeProject, setActiveProject] = useState(null)

  return (
    <>
      <IntroReveal onSelectProject={setActiveProject} />
      <ToolsShowcase />
      <ScrollNav />
      {activeProject && (
        <ProjectDetail
          project={activeProject}
          onClose={() => setActiveProject(null)}
        />
      )}
    </>
  )
}

export default App
