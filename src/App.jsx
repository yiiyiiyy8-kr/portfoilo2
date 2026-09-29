import { useState } from 'react'
import IntroReveal from './components/IntroReveal'
import ScrollCue from './components/ScrollCue'
import ToolsShowcase from './components/ToolsShowcase'
import AboutMe from './components/AboutMe'
import Footer from './components/Footer'
import ProjectDetail from './components/ProjectDetail'

function App() {
  const [activeProject, setActiveProject] = useState(null)

  return (
    <>
      <IntroReveal onSelectProject={setActiveProject} />
      <ScrollCue />
      <ToolsShowcase />
      <AboutMe />
      <Footer />
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
