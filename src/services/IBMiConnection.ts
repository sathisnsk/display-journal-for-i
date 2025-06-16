import * as vscode from 'vscode';

export function getIBMAPI() {
    const IBMiExtension = vscode.extensions.getExtension(
        "halcyontechltd.code-for-ibmi"
      );
      if (IBMiExtension.isActive === true) {
        vscode.window.showInformationMessage(
          "Existing IBM i connection is active"
        );
        console.log(IBMiExtension.exports);
        const IBMiAPI = IBMiExtension.exports;
        return IBMiAPI;

}
}

