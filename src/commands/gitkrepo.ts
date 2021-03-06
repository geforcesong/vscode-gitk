import * as vscode from 'vscode'

import { gitkRepoViewProvider } from '../gitkRepoViewProvider'

export function registryGitkrepo(context: vscode.ExtensionContext): vscode.Disposable {
  let provider: gitkRepoViewProvider = new gitkRepoViewProvider()
  let panel: vscode.WebviewPanel

  let config = vscode.workspace.getConfiguration('gitk')

  vscode.workspace.onDidChangeConfiguration(
    async () => {
      config = vscode.workspace.getConfiguration('gitk')
      provider.setConfig(config)
      const html = await provider.getInitHtml()
      panel.webview.html = html
    },
    this,
    context.subscriptions
  )

  const gitkrepo = vscode.commands.registerCommand('extension.gitkrepo', async () => {
    if (!panel) {
      panel = vscode.window.createWebviewPanel('gitk', 'Gitk Repo', vscode.ViewColumn.One, {
        enableScripts: true
      })

      // Reset when the current panel is closed
      panel.onDidDispose(
        () => {
          panel = undefined
        },
        null,
        context.subscriptions
      )

      // Handle messages from the webview
      panel.webview.onDidReceiveMessage(
        async message => {
          if (message.command === 'read-detail') {
            const detail = await provider.getDetail(message.payload.hash)
            panel.webview.postMessage({ command: 'see-detail', payload: detail })
          }
          if (message.command === 'hash-copied') {
            vscode.window.setStatusBarMessage(`hash [${message.payload.hash}] was copied`, 3000)
          }
          if (['go-prev', 'go-next'].includes(message.command)) {
            provider.setPageNum(message.payload.pageNum)
            const html = await provider.getInitHtml()
            panel.webview.html = html
          }
        },
        undefined,
        context.subscriptions
      )
    } else if (!panel.visible) {
      panel.reveal()
    }

    try {
      provider.setConfig(config)
      provider.setPageNum(1)
      const html = await provider.getInitHtml()
      panel.webview.html = html
    } catch (error) {
      vscode.window.showErrorMessage(error)
    }
  })

  return gitkrepo
}
