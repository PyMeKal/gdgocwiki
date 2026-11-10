export default function ButtonLink({ href, primary = false, children }) {
  return <a className={primary ? 'button primary' : 'button'} href={href}>{children}</a>
}
