import * as vscode from "vscode";
import * as XLSX from "xlsx";
import * as fs from 'fs';
import * as path from 'path';
import { executeQuery } from "../queries/executeQuery";

export async function loadPage(context) {

    
    const panel = vscode.window.createWebviewPanel(
      'myWebview',                 // Identifies the type of the webview
      'Journal Viewer',           // Title of the panel
      vscode.ViewColumn.One,      // Editor column to show the new webview
      {
        enableScripts: true,     // Enable JS in the webview
        retainContextWhenHidden: true
      }
    );

    const scriptUri = panel.webview.asWebviewUri(
      vscode.Uri.joinPath(context.extensionUri, 'out', 'media', 'webviewScript.js')
    );
  
    console.log('script uri ', scriptUri);
  
    const html = getWebviewContent(context); 
    panel.webview.html = html;


    panel.webview.onDidReceiveMessage(async message =>  {
      if (message.command === 'queryJournal') {
        console.log(message.params);
      const result = await executeQuery(message.params);
       if (result.message !== null) {
          vscode.window.showErrorMessage(result.message);
       } 
       console.log('inside Journal Panel' + JSON.stringify(result.data));
       try {
        panel.webview.postMessage({command:'updateJournalData', data:result.data});
     }
       catch(err) {
        console.log('Error generating webview content: ', err);
       }
      }
      

      if (message.command === 'createExcel') {
        const uri = await vscode.window.showSaveDialog(
       {
         defaultUri: vscode.Uri.file("journal-data.xlsx"),
          filters: { Excel: ['xlsx'] }
        });

        const worksheet = XLSX.utils.json_to_sheet(message.exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "JournalData");
        const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
        fs.writeFileSync(uri.fsPath, buffer);
      }
    });
  
  
    function getWebviewContent(context) {
       // console.log('inside getWebviewContent' + data);
      //const json = JSON.stringify(data);
      const filePath = context.asAbsolutePath(path.join('src', 'html', 'HTMLView.html')); // extension-root/src/html/HTMLview.html
      console.log('file path ', filePath);
      let html = fs.readFileSync(filePath, 'utf8'); // returns the entire html file HTMLview.html as a string
      console.log('type of scriptUri ', typeof scriptUri);
     // vscode.Uri.toString() is a custom implementation, not the generic Object.prototype.toString.
     // That's why it returns a useful string URI, not "[object Object]".
      html = html.replace('${scriptUri}', scriptUri.toString()); // replaces the ${scriptUri} in the HTML string with the path of /out/media/webviewScript.js 
      return html;
 
    }
  } 