import * as vscode from 'vscode';
import { getIBMAPI } from '../services/IBMiConnection';

export async function executeQuery(inputParams) {

  const IBMiAPI = getIBMAPI();
  const isConnected = IBMiAPI?.instance?.connection?.connected ?? false;
  if (isConnected) {
    console.log("Code for i connection is active and connected");
    // console.log(IBMiAPI.instance.connection);
    const config = IBMiAPI.instance.connection.getConfig();
    //  console.log(config);
    //const result = await ssh.execCommand("system 'DSPLIBL'");

    try {
      let result = await IBMiAPI.instance.connection.runCommand({
        command: "DSPJOB",
      });
      //     console.log(result.stdout);


      let response = { message: '', data: '' };

      const fileName = inputParams["file-name"];
      const libraryName = inputParams["library-name"];
      const startingReceiverName = inputParams["journal-from"];
      const endingReceiverName = inputParams["journal-to"];
      const fromDateTime = {
        "date": inputParams["start-date"],
        "time": inputParams["start-time"]
      };
      const toDateTime = {
        "date": inputParams["end-date"],
        "time": inputParams["end-time"]
      };

      // let commandString = `DSPFD FILE(${libraryName}/${fileName})`;
      result = await IBMiAPI.instance.connection.runCommand({
        command: `DSPFD FILE(${libraryName}/${fileName}) TYPE(*ATR)`,
      });

      let journalName = '';
      let journalLibraryName = '';
      let foundJournalLine = false;
      if (result.stderr === '') {
        const dspfdOutput = result.stdout;
        const lines = dspfdOutput.split('\n');
        for (const rawLine of lines) {
          
          const line = rawLine.toLowerCase();
          const index = line.indexOf(':');
          if(index === -1) continue;

          const value = line.substring(index + 1).trim().toUpperCase();

          if (line.includes('file is currently journaled')) {
            const isFileJournaled = value;
          }
          else if (line.includes('current or last journal')) {
            journalName = value;
            foundJournalLine = true;
          }
          else if (line.includes('library') && foundJournalLine) {
            journalLibraryName = value;
            foundJournalLine = false;
          }
          else if (line.includes('journal images')) {
            journalLibraryName = value;
            foundJournalLine = false;
          }
          else if (line.includes('journal entries to be omitted')) {
            const omitJournalEntries = value;
          }
          else if (line.includes('last journal start date/time')) {
            const lastJounalDate = value;
          }

        }

        /* let startPos = input.indexOf('File is currently journaled');
        startPos = input.indexOf(':', startPos);
        startPos = input.indexOf('Current or last journal');
        startPos = input.indexOf('Library');
        startPos = input.indexOf('Journal entries to be omitted');
        startPos = input.indexOf('Last journal start date/time'); */
      }

      console.log(result.stdout);

      console.log(result.stderr);

      result = await IBMiAPI.instance.connection.runCommand({
        command: `DSPFFD FILE(${libraryName}/${fileName})`,
      });
      console.log(result.stdout);

      //console.log(JSON.stringify(inputObj));
      const startingTimestamp = convertToTimestamp(fromDateTime);
      const endingTimestamp = convertToTimestamp(toDateTime);
      console.log(startingTimestamp);
      console.log(endingTimestamp);

      //    console.time('build-fdSQL');
      //   let sqlStatement: string = `SELECT JOURNAL_NAME, JOURNAL_IMAGES, OMIT_JOURNAL_ENTRY
      //          FROM QSYS2.JOURNALED_OBJECTS
      //          WHERE OBJECT_LIBRARY = '${libraryName}' AND object_name = '${fileName}'
      //          and OBJECT_TYPE = '*FILE' and FILE_TYPE = 'PHYSICAL'`;
      //    let cleanSQL = sqlStatement.replace(/\s+/g, " ").trim(); // match every sequence of one or more whitespace characters
      //    console.timeEnd('build-fdSQL');

      //    let result1 = await IBMiAPI.instance.connection.runSQL(cleanSQL);
      //  console.log(result1);

      //   if (result1.length === 0) {
      //     return { message: 'incorrect input values', data: null };
      //   }
      //     const journalName = result1[0].JOURNAL_NAME;

      //sqlStatement = `CALL QSYS2.QCMDEXC('DLYJOB 10')`;
      // result1 = await IBMiAPI.instance.connection.runSQL(sqlStatement);
      console.time('syscol-sql');

      let sqlStatement = `
              SELECT COLUMN_NAME, TABLE_NAME, DATA_TYPE, LENGTH, NUMERIC_SCALE,
          IS_NULLABLE, COLUMN_HEADING, STORAGE, NUMERIC_PRECISION,
          COLUMN_DEFAULT, NUMERIC_PRECISION_RADIX, DATETIME_PRECISION,
          COLUMN_TEXT, SYSTEM_COLUMN_NAME, SYSTEM_TABLE_NAME, CCSID FROM QSYS2.syscolumns  
              WHERE system_table_name = '${fileName}' and SYSTEM_table_schema = '${libraryName}' 
              ORDER BY ORDINAL_POSITION
          `;
      let cleanSQL = sqlStatement.replace(/\s+/g, " ").trim(); // match every sequence of one or more whitespace characters
      let result1 = await IBMiAPI.instance.connection.runSQL(cleanSQL);
      console.timeEnd('syscol-sql');

      console.log('syscolumns query', result1);
      sqlStatement = `
        with CTE as (select  
              journal_code, journal_entry_type, object, object_type,
          entry_data                         
              FROM TABLE(DISPLAY_JOURNAL('${journalLibraryName}',
            '${journalName}',
            JOURNAL_CODES => 'R',
            OBJECT_LIBRARY => '${libraryName}',
            OBJECT_NAME => '${fileName}',
            OBJECT_MEMBER => '*ALL',
            OBJECT_OBJTYPE => '*FILE',
            STARTING_RECEIVER_NAME => '${startingReceiverName}',
            ENDING_RECEIVER_NAME => '${endingReceiverName}',
            STARTING_TIMESTAMP => '${startingTimestamp}',
            ENDING_TIMESTAMP => '${endingTimestamp}'
          )))     
            select journal_code, journal_entry_type, object, object_type, `;
      //interpret(substring(cte.entry_data,1,25) as char(25))
      //from CTE       `;

      let interpretStatements: string = "";
      const arr = result1;
      let prevFieldEnd = 0;
      let currentElement = 0;
      for (const element of arr) {
        currentElement += 1;
        let startByte = prevFieldEnd + 1;
        let totalBytes = element.STORAGE;
        if (element.DATA_TYPE === "PACKED") {
        }
        let isCCSIDRequired = true;

        switch (element.DATA_TYPE) {
          case "TIMESTMP":
            totalBytes = 26;
            element.DATA_TYPE = 'CHAR';
            break;
          case "DATE":
            totalBytes = 10;
            element.DATA_TYPE = 'CHAR';
            break;
          case "TIME":
            totalBytes = 8;
            element.DATA_TYPE = 'CHAR';
            break;
          case "CLOB":
            totalBytes = 30;
            break;
          case "DBCLOB":
            totalBytes = 38;
            break;
          case "BLOB":
            totalBytes = 32;
            isCCSIDRequired = false;
            break;
        }
        prevFieldEnd += totalBytes;
        if (element.NUMERIC_SCALE !== null) {
          interpretStatements += ` INTERPRET(SUBSTRING(CTE.ENTRY_DATA,${startByte},${totalBytes})
                                     as ${element.DATA_TYPE}(${element.LENGTH},${element.NUMERIC_SCALE}))
                                     AS ${element.COLUMN_NAME}`;
        } else if (isCCSIDRequired) {
          interpretStatements += ` INTERPRET(SUBSTRING(CTE.ENTRY_DATA,${startByte},${totalBytes})
                                     as ${element.DATA_TYPE}(${totalBytes}) CCSID ${element.CCSID}) 
                                      AS ${element.COLUMN_NAME} 
                                     `;
        } else
          interpretStatements += ` INTERPRET(SUBSTRING(CTE.ENTRY_DATA,${startByte},${totalBytes})
                                   as ${element.DATA_TYPE}(${totalBytes})) 
                                   AS ${element.COLUMN_NAME} 
            `;

        if (arr.length !== currentElement) {
          interpretStatements = interpretStatements.trim() + ",";
        } else {
          interpretStatements = interpretStatements.trim() + " ";
        }
      }
      sqlStatement += interpretStatements + `from CTE`;
      console.time('journal-sql');

      cleanSQL = sqlStatement.replace(/\s+/g, " ").trim(); // match every sequence of one or more whitespace characters
      //           console.log(cleanSQL);
      result1 = await IBMiAPI.instance.connection.runSQL(cleanSQL);
      console.timeEnd('journal-sql');

      //   console.log(result1);
      //   console.log(result1[2]);
      //   console.log(result);
      // console.log(result.stdout);
      console.log(typeof result1);
      console.log(Array.isArray(result1));
      console.log(result1);
      response.message = null;
      response.data = result1;
      return response;
    }
    catch (err) {
      console.error("Caught error: " + err.stack);
    }

  }

  function convertToTimestamp(inputObj) {
    console.log(inputObj);
    const { date, time } = inputObj;
    const inputTime = time.padStart(6, "0");
    return `${date} ${inputTime.slice(0, 2)}:${inputTime.slice(2, 4)}:${inputTime.slice(4, 6)}.000000`;
  }


}

