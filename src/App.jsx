import { useState } from 'react'
import IntroReveal from './components/IntroReveal'
import ScrollNav from './components/ScrollNav'
import ProjectDetail from './components/ProjectDetail'

function App() {
  const [activeProject, setActiveProject] = useState(null)

  return (
    <>
      <IntroReveal onSelectProject={setActiveProject} />
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
