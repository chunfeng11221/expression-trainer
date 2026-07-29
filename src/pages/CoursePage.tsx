import { Link } from 'react-router-dom'
import { ArrowLeft, LayoutList } from 'lucide-react'
import { COURSE_CONCEPTS, COURSE_MODULES } from '../data/courseConcepts'

/** 「表达课」板块页:44 节表达课蒸馏出的核心概念,按模块分组 */
export default function CoursePage() {
  return (
    <div className="page">
      <header className="page-header">
        <Link to="/" className="link-back">
          <ArrowLeft size={16} /> 首页
        </Link>
        <h1>表达课</h1>
      </header>

      <p className="course-intro">把 44 节表达课,蒸馏成你开口前能用上的方法。</p>

      {COURSE_MODULES.map((module) => (
        <section key={module} className="course-module">
          <h2 className="course-module-title">{module}</h2>
          <div className="concept-grid">
            {COURSE_CONCEPTS.filter((c) => c.module === module).map((c) => (
              <div key={c.id} className="concept-card">
                <h3>{c.name}</h3>
                <p>{c.oneLiner}</p>
                <p className="concept-usage">{c.howToUse}</p>
                <p className="concept-source">{c.source}</p>
              </div>
            ))}
          </div>
        </section>
      ))}

      <footer className="course-footer">
        <Link to="/topics" className="btn btn-primary btn-lg">
          <LayoutList size={18} /> 去练一题
        </Link>
      </footer>
    </div>
  )
}
