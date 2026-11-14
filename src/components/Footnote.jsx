import { useRef } from 'react'

export default function Footnote({ number, content, referenceId = `footnote-ref-${number}` }) {
  const tooltipRef = useRef(null)
  const tooltipId = referenceId.replace('footnote-ref-', 'footnote-tooltip-')

  function showTooltip(event) {
    const tooltip = tooltipRef.current
    const rect = event.currentTarget.getBoundingClientRect()
    // 화면 가장자리에서는 가로 위치를 보정하고, 아래쪽 주석은 설명을 위에 표시합니다.
    const width = Math.min(320, window.innerWidth - 24)
    tooltip.style.width = `${width}px`
    tooltip.style.left = `${Math.max(12, Math.min(rect.left, window.innerWidth - width - 12))}px`
    const above = rect.bottom > window.innerHeight / 2
    tooltip.style.top = above ? 'auto' : `${rect.bottom}px`
    tooltip.style.bottom = above ? `${window.innerHeight - rect.top}px` : 'auto'
    // 최상위 레이어에 표시해 표의 스크롤 영역에 툴팁이 잘리지 않게 합니다.
    tooltip.showPopover()
  }

  function hideTooltip(event) {
    // 포인터가 툴팁으로 이동하거나 키보드 포커스가 남아 있는 동안은 설명을 유지합니다.
    if (!event.currentTarget.contains(event.relatedTarget) && !event.currentTarget.contains(document.activeElement)) {
      tooltipRef.current.hidePopover()
    }
  }

  return (
    <sup className="footnote-reference" id={referenceId}
      onMouseEnter={showTooltip} onMouseLeave={hideTooltip} onFocus={showTooltip} onBlur={hideTooltip}>
      <a href={`#footnote-${number}`} aria-label={`주석 ${number}`} aria-describedby={tooltipId}
        onClick={() => tooltipRef.current.hidePopover()}>[{number}]</a>
      <span ref={tooltipRef} className="footnote-tooltip" id={tooltipId} role="tooltip" popover="auto">{`[${number}] ${content}`}</span>
    </sup>
  )
}
