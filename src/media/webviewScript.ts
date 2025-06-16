declare function acquireVsCodeApi(): any;



const vscode = acquireVsCodeApi();
const savedState = vscode.getState() || {};
console.log('beginning of script');
//const data = ${json}; // Replace with your injected data
const data = [];
let columnKeys = [];
const tbody = document.getElementById("table-body") as HTMLTableElement;
const form = document.getElementById("query-form") as HTMLFormElement;
const errorBox = document.getElementById("error-message");


let page = 1;
const rowsPerPage = 50;
let currentData = data;


const runButton = document.querySelector("#run-query-btn") as HTMLButtonElement;

try {
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    runButton.disabled = true;
    console.log('runButton disabled state', runButton.disabled);
    const formData = new FormData(form);
    const params = Object.fromEntries((formData as any).entries());
    params["entry-codes"] = formData.getAll("entry-codes");
    vscode.setState(params);
    vscode.postMessage({ command: "queryJournal", params });
  });



  document.getElementById("export-excel").addEventListener("click", () => {
    console.log('inside Excel function');
    const exportData = currentData.map(row => {
      const exportRow = {};
      columnKeys.forEach(key => exportRow[key] = row[key] ?? "");
      return exportRow;
    });
    console.log('exportData', exportData);
    vscode.postMessage({ command: "createExcel", exportData });


  });

  // convert all the input text fields to uppercase values
  const inputElements = document.querySelectorAll<HTMLInputElement>("input[type='text']");
  inputElements.forEach(element => {
    element.addEventListener("input", function () {
      const start = element.selectionStart; //start of the cursor position
      const end = element.selectionEnd;     //end of the cursor position. Since there is no selection, start === end
      element.value = element.value.toUpperCase();
      element.setSelectionRange(start, end); //To prevent "cursor jump" issue — especially noticeable when typing in the middle of the text
    }
    );
  });

  window.addEventListener("message", (event) => {
    try {
      console.log('inside the message event listener');
      runButton.disabled = false;
      console.log('runButton disabled state', runButton.disabled);
      const message = event.data;
      if (message.command === "updateJournalData") {
        currentData = message.data;
        if (message.data.length !== 0) {
          console.log(Object.keys(message.data[0]));
        }
        page = 1;
        console.log('currentData value', currentData);
        paginate(currentData);
        errorBox.style.display = "none";
      }
      if (message.command === "showError") {
        errorBox.textContent = message.error || "Unknown error";
        errorBox.style.display = "block";
      }
    } catch (err) {
      console.log('Caught Error: ', err.stack);
    }
  });

  document.getElementById("prev-page").addEventListener("click", () => {
    if (page > 1) {
      page--;
      paginate(currentData);
    }
  });

  document.getElementById("next-page").addEventListener("click", () => {
    if (page * rowsPerPage < currentData.length) {
      page++;
      paginate(currentData);
    }
  });

  loadFormDefaults();
  paginate(currentData);
}
catch (err) {
  console.log('Caught Error: ', err.stack);
}

function renderTable(pageData) {
  const thead = document.getElementById("table-head");
  thead.textContent = "";
  tbody.textContent = "";
  if (Array.isArray(pageData) && pageData.length > 0) {
    // populate the table header cells and row in turn
    const tr = document.createElement("tr");
    const headerRow = Object.keys(pageData[0]);
    console.log('headerRow value', headerRow);
    headerRow.forEach(row => {
      console.log('row value', row);
      const th = document.createElement("th");
      th.textContent = row;
      tr.appendChild(th);
    });
    thead.appendChild(tr);

    // populate the actual data into cells and rows 
    pageData.forEach(row => {
      const tr = document.createElement("tr");
      columnKeys = headerRow;
      columnKeys.forEach(key => {
        const td = document.createElement("td");
        td.textContent = row[key] ?? "";
        tr.appendChild(td);
      });
      tr.addEventListener("dblclick", () => {
        tr.classList.toggle("sticky-row");
        tr.classList.toggle("highlight");
      });
      tbody.appendChild(tr);
    });
  }

}

function paginate(data) {
  console.log('inside paginate', data);
  const totalPages = Math.max(1, Math.ceil(data.length / rowsPerPage));
  const start = (page - 1) * rowsPerPage;
  const end = page * rowsPerPage;
  renderTable(data.slice(start, end));
  document.getElementById("pagination").textContent = `Page ${page} of ${totalPages}`;
}

function loadFormDefaults() {
  const today = new Date().toISOString().slice(0, 10);
  form["start-date"].value = savedState["start-date"] || today;
  form["end-date"].value = savedState["end-date"] || today;
  form["start-time"].value = savedState["start-time"] || "";
  form["end-time"].value = savedState["end-time"] || "";
  form["file-name"].value = savedState["file-name"] || "";
  form["library-name"].value = savedState["library-name"] || "";
  form["journal-from"].value = savedState["journal-from"] || "*CURCHAIN";
  form["journal-to"].value = savedState["journal-to"] || "*CURCHAIN";
  (savedState["entry-codes"] || []).forEach(value => {
    const option = form["entry-codes"].querySelector(`option[value="${value}"]`);
    if (option) option.selected = true;
  });
}
