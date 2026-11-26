import { Link } from 'react-router'

export default function Breadcrumb({ children }) {
  return <p className="breadcrumb"><Link to="/">홈</Link> / {children}</p>
}
