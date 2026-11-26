export default function WikiConversationExcerpt({ children }) {
  return (
    <blockquote className="wiki-conversation-excerpt" aria-label="원문 대화 발췌">
      <p className="wiki-text">{children}</p>
    </blockquote>
  )
}
