import { useState } from 'react'
import IntroReveal from './components/IntroReveal'
import ToolsShowcase from './components/ToolsShowcase'
import VialCarousel from './components/VialCarousel'
import Footer from './components/Footer'
import ScrollNav from './components/ScrollNav'
import SectionMenu from './components/SectionMenu'
import ProjectDetail from './components/ProjectDetail'

function App() {
  const [activeProject, setActiveProject] = useState(null)

  return (
    <>
      <IntroReveal onSelectProject={setActiveProject} />
      <ToolsShowcase />
      <VialCarousel />
      <Footer />
      <ScrollNav />
      <SectionMenu />
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
