import { Link } from 'react-router'

export default function ButtonLink({ to, primary = false, children }) {
  return <Link className={primary ? 'button primary' : 'button'} to={to}>{children}</Link>
}
