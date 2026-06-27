function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const markdownUrlPattern = '((?:https?:\\/\\/|\\/|\\.\\.?\\/)[^)\\s]+)'
const imagePattern = new RegExp(`!\\[([^\\]]*)\\]\\(${markdownUrlPattern}\\)`, 'g')
const linkPattern = new RegExp(`\\[([^\\]]+)\\]\\(${markdownUrlPattern}\\)`, 'g')

function inlineMarkdown(value: string) {
  return escapeHtml(value)
    .replace(imagePattern, '<img src="$2" alt="$1" />')
    .replace(linkPattern, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
}

function renderParagraph(lines: string[]) {
  if (lines.length === 0) return ''
  return `<p>${lines.map(inlineMarkdown).join('<br />')}</p>`
}

export function renderMarkdown(markdown = '') {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const html: string[] = []
  let paragraph: string[] = []
  let list: string[] = []
  let code: string[] = []
  let inCode = false

  const flushParagraph = () => {
    const rendered = renderParagraph(paragraph)
    if (rendered) html.push(rendered)
    paragraph = []
  }

  const flushList = () => {
    if (list.length > 0) {
      html.push(`<ul>${list.map((item) => `<li>${inlineMarkdown(item)}</li>`).join('')}</ul>`)
      list = []
    }
  }

  const flushCode = () => {
    if (code.length > 0) {
      html.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`)
      code = []
    }
  }

  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      if (inCode) {
        flushCode()
        inCode = false
      } else {
        flushParagraph()
        flushList()
        inCode = true
      }
      continue
    }

    if (inCode) {
      code.push(line)
      continue
    }

    if (!line.trim()) {
      flushParagraph()
      flushList()
      continue
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(line)
    if (heading) {
      flushParagraph()
      flushList()
      html.push(`<h${heading[1].length}>${inlineMarkdown(heading[2])}</h${heading[1].length}>`)
      continue
    }

    const bullet = /^[-*]\s+(.+)$/.exec(line)
    if (bullet) {
      flushParagraph()
      list.push(bullet[1])
      continue
    }

    flushList()
    paragraph.push(line)
  }

  flushParagraph()
  flushList()
  flushCode()

  return html.join('')
}
