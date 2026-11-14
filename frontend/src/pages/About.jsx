const FLOW = [
  { t: 'Citizen reports', d: 'Street, severity 1–5, depth, note' },
  { t: 'Neighbours vote', d: 'I see it too / Not flooded' },
  { t: 'N confirmations', d: 'report-service marks CONFIRMED' },
  { t: 'alert-service', d: 'JDBC rule raises a street alert' },
  { t: 'Map + ticker', d: 'Canvas ward pulses, officials resolve' },
]

const UNITS = [
  ['Unit 1 – HTML & CSS', 'Semantic HTML shell, CSS custom properties, Flexbox and Grid layouts, box model, transitions, transforms, keyframe animations (alert ticker, pulsing cards), HTML5 Canvas ward map with animated sea and alert rings.'],
  ['Unit 2 – JavaScript & React', 'DOM events on the canvas (hover, click hit-testing), fetch with async/await, React components and JSX, React Router routes, controlled forms, useState, useEffect, useContext, useMemo, useRef, useCallback, custom hooks useApi / useInterval / useLocalStorage with useDebugValue.'],
  ['Unit 3 – SQL & JDBC', 'Schema with keys and CHECK constraints, INSERT / UPDATE, joins, GROUP BY + HAVING with sub-queries, UNION, INTERSECT and EXCEPT. alert-service uses DriverManager, Statement, PreparedStatement and ResultSet directly.'],
  ['Unit 4 – Spring Boot', 'Two Spring Boot applications with auto-configuration, three-tier design (controller → service → repository), domain model, business rules for voting and alert levels, JUnit tests.'],
  ['Unit 5 – Data JPA & Microservices', 'report-service maps entities with Spring Data JPA (derived queries, JPQL, @ManyToOne). The two services own separate concerns and talk over REST (RestClient), with a Vite gateway proxy in front.'],
]

export default function About() {
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>How FloodWatch works</h1>
          <p className="muted">One report is a claim. Several neighbours agreeing is evidence.</p>
        </div>
      </div>
      <section className="flow">
        {FLOW.map((f, i) => (
          <div key={f.t} className="flow-step" style={{ '--i': i }}>
            <span className="flow-num">{i + 1}</span>
            <strong>{f.t}</strong>
            <span className="muted small">{f.d}</span>
          </div>
        ))}
      </section>
      <section className="arch card">
        <h2>Architecture</h2>
        <div className="arch-row">
          <div className="arch-box client">React 18 + Vite<br /><small>:5173 · Canvas map, router, hooks</small></div>
        </div>
        <div className="arch-arrow">REST / JSON via Vite proxy</div>
        <div className="arch-row two">
          <div className="arch-box svc">report-service<br /><small>:8081 · Spring Boot + Spring Data JPA</small></div>
          <div className="arch-link">POST /api/alerts/evaluate/&#123;id&#125;</div>
          <div className="arch-box svc alt">alert-service<br /><small>:8082 · Spring Boot + plain JDBC</small></div>
        </div>
        <div className="arch-arrow">JPA / Hibernate &nbsp;·&nbsp; DriverManager</div>
        <div className="arch-row">
          <div className="arch-box db">MySQL 8 · floodwatch<br /><small>wards · streets · app_users · reports · votes · alerts</small></div>
        </div>
      </section>
      <section className="card">
        <h2>Where each syllabus unit is used</h2>
        <table className="table units">
          <tbody>
            {UNITS.map(([u, d]) => <tr key={u}><th>{u}</th><td>{d}</td></tr>)}
          </tbody>
        </table>
      </section>
    </div>
  )
}
