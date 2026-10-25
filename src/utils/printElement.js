// Prints one element of the page (an invoice, a receipt) on its own, at the
// given paper size. It copies the element and the app's styles into a hidden
// frame and prints that, so the sidebar and buttons never reach the printer.
// Anything with the class "no-print" is left out.
export function printElement(element, { page = 'A4', margin = '14mm', title = document.title } = {}) {
  const frame = document.createElement('iframe')
  frame.setAttribute('aria-hidden', 'true')
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden'
  document.body.appendChild(frame)

  const styles = [...document.querySelectorAll('style, link[rel="stylesheet"]')].map((n) => n.outerHTML).join('')
  const doc = frame.contentDocument
  doc.open()
  doc.write(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <base href="${location.href}" />
    <title>${title}</title>
    ${styles}
    <style>
      @page { size: ${page}; margin: ${margin}; }
      html, body { margin: 0; background: #fff; }
      body > * { max-width: none !important; width: auto !important; margin: 0 !important; border: 0 !important; box-shadow: none !important; padding: 0 !important; }
      .no-print { display: none !important; }
    </style>
  </head>
  <body>${element.outerHTML}</body>
</html>`)
  doc.close()

  let printed = false
  const go = () => {
    if (printed) return
    printed = true
    frame.contentWindow.focus()
    frame.contentWindow.print()
    setTimeout(() => frame.remove(), 1000)
  }
  // Wait for styles and fonts to load, but don't hang if one never does.
  frame.contentWindow.addEventListener('load', () => setTimeout(go, 100), { once: true })
  setTimeout(go, 1500)
}
