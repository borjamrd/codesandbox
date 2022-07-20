import { transform } from '@babel/standalone'

import monacoEditor from './lib/monaco/monacoEditor'
import { elements, showError, showIframe } from './utils/dom'
import { importsRegex, pureRegex, replace } from './utils/format'
import { debounce } from './utils/helpers'

import type { ErrorMessageType, StateType, TranspiledCodeType } from './types'

let state: StateType = 'editing'
let errorMessage: ErrorMessageType = ''

function transpileCode(code: string): TranspiledCodeType {
  const codeToTranspile = replace(code, importsRegex)
  const options = { presets: ['es2015-loose', 'react'] }
  const { code: transpiledCode } = transform(codeToTranspile, options)

  if (!transpiledCode) {
    throw new Error(`Something went wrong transpiling ${codeToTranspile}.`)
  }

  const hasImports = Boolean(code.match(importsRegex))
  const imports = code.match(importsRegex)?.join('\n') ?? ''

  return {
    iframeCode: hasImports ? `${imports}\n${transpiledCode}` : transpiledCode,
    sourceCode: replace(transpiledCode, pureRegex),
  }
}

function updateIframe(code: string): void {
  const source = /* html */ `
      <html>
      <head>
        <link rel="stylesheet" href="/iframe.css">
      </head>
      <body>
        <div id="app"></div>
        <script type="module">${code}</script>
      </body>
      </html>
    `
  elements.iframe.srcdoc = source
}

function updateSource(transpiledOutput: string): void {
  const sourceHTML = /* html */ `
      <h3>📜 Source</h3>
      <xmp>${transpiledOutput}</xmp>
    `
  elements.source.innerHTML = sourceHTML
}

function logError(error: string): void {
  const errorHtml = /* html */ `
      <h3>💩 Error</h3>
      <xmp>${error}</xmp>
    `
  elements.errors.innerHTML = errorHtml
}

function updateUI(): void {
  if (state === 'editing') {
    showIframe()
    const code = monacoEditor.getValue()
    const { iframeCode, sourceCode } = transpileCode(code)
    updateIframe(iframeCode)
    updateSource(sourceCode)
    return
  }

  if (state === 'error') {
    showError()
    logError(errorMessage)
    return
  }

  throw new Error(`State ${state} should not be possible. 💥`)
}

elements.editor.addEventListener('keyup', debounce(updateUI))

window.addEventListener('error', ({ error }: ErrorEvent) => {
  state = 'error'
  errorMessage = error.message
  updateUI()
  state = 'editing'
})

window.addEventListener('load', () => elements.loading.remove())

updateUI()