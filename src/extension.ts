import * as vscode from "vscode";
import {loadPage} from './panels/JournalPanel';

export function activate(context: vscode.ExtensionContext) {
  console.log("welcome");

  const disposable = vscode.commands.registerCommand(
    "sathish.test",
    async () => {
      console.log("activated");
      vscode.window.showInformationMessage("Hello World from myFirstExt!");
      loadPage(context);
    }
  );

  context.subscriptions.push(disposable);

}


function deactivate() { }

