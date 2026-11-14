import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="page narrow">
      <div className="card">
        <h1>Page not found</h1>
        <p>This street is not on our map. <Link to="/">Back to the live map</Link></p>
      </div>
    </div>
  )
}
