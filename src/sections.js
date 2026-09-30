// The page's sections, in order: the name shown in the corner menu and where each one starts.
export const SECTIONS = [
  { key: 'intro', label: 'Portfolio' },
  { key: 'projects', label: 'Project' },
  { key: 'tool', label: 'Tools' },
  { key: 'about', label: 'About Me' },
]

export function scrollToSection(key) {
  const vh = window.innerHeight
  let top = 0
  if (key === 'projects') {
    // the bags are fully in after the intro has finished fading out
    const el = document.querySelector('.intro-reveal')
    top = el ? el.offsetTop + vh * 0.35 : 0
  } else if (key === 'tool') {
    top = document.querySelector('.tools')?.offsetTop ?? 0
  } else if (key === 'about') {
    top = document.querySelector('.vc')?.offsetTop ?? 0
  }
  window.scrollTo({ top, behavior: 'smooth' })
}

// a corner heading was pressed: ask the menu (mounted once in App) to open or close
export function toggleSectionMenu(current) {
  window.dispatchEvent(new CustomEvent('section-menu', { detail: { current } }))
}
