import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  const getNonce = () => {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  };

  const getPackageJson = async (lockUri: vscode.Uri): Promise<string | undefined> => {
    try {
      const uri = vscode.Uri.joinPath(lockUri, '../package.json');
      const contents = await vscode.workspace.fs.readFile(uri);
      return new TextDecoder('utf-8').decode(contents);
    } catch (e) {
      return undefined;
    }
  };

  const getHtmlForWebview = (webview: vscode.Webview): string => {
    const nonce = getNonce();

    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(vscode.Uri.file(context.extensionPath), 'dist/webview.js'),
    );

    return `
			<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}';">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>Lockfile Viewer</title>
			</head>
			<body>
				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
  };

  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider('lockfileViewer.viewer', {
      resolveCustomTextEditor(document, webviewPanel) {
        webviewPanel.webview.options = {
          enableScripts: true,
        };
        webviewPanel.webview.html = getHtmlForWebview(webviewPanel.webview);

        const updateWebview = async () =>
          webviewPanel.webview.postMessage({
            type: 'update',
            text: document.getText(),
            packageJson: await getPackageJson(document.uri),
          });

        const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
          if (e.document.uri.toString() === document.uri.toString()) {
            updateWebview();
          }
        });

        webviewPanel.onDidDispose(() => {
          changeDocumentSubscription.dispose();
        });

        updateWebview();
      },
    }),
  );
}
