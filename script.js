/* Main entry point is function readRows. 

Before running this, make sure:
 * You're running it from the Lunchbot account
 * There are no duplicates in the spreadsheet
 * There are no bad email addresses in the spreadsheet

TODOs:
 * Validate email addresses for formatting and duplication
 * Stagger lunch departures by 10 minutes to avoid a crush at 12:30
 * Better avoidance of being scheduled with previous partners

*/

var SPREADSHEET_ID = "REPLACE ME"; // Spreadsheet to use

var START_ROW = 2;
var START_COL = 2;
var GROUP_SIZE = 4;
var LARGEST_POSSIBLE_GROUP = GROUP_SIZE + (GROUP_SIZE - 1);
var END_COL = 3 + LARGEST_POSSIBLE_GROUP; // timestamp, email, team, highest possible past lunchpeople
var EVENT_DESCRIPTION = "Lunchbot has spoken: you're going to lunch on Wednesday! See the other people invited to this event and make some plans!";

function pickPerson(people, group) {

  peopleloop:
  for (var i in people) {
    var person = people[i];

    for (var j in group) {
      var member = group[j];
      
      // make sure the candidate isn't on the same team as this person
      if (person.team === member.team) {
        continue peopleloop;
      }

      // make sure the candidate didn't have lunch with this person last week
      for (var k in person.lastLunchPeople) {
        if (member.emailAddress === person.lastLunchPeople[k]) {
          continue peopleloop;
        }
      }
    }
    // Found a person, remove them and return the person
    people.splice(i, 1);
    return person;
  }
  // Case: we didn't find anyone, because the only people left
  // are in the same group, let's use one of them.
  return people.pop();
}

function writeGroup(sheet, group) {
  var emailMap = {};
  for (var i in group) {
    var person = group[i];
    emailMap[person.rowNum] = [];
    for (var j in group) {
      if (person.rowNum !== group[j].rowNum) {
        emailMap[person.rowNum].push(group[j].emailAddress);
      }
    }
  }

  for (var rowNum in emailMap) {
    if (emailMap.hasOwnProperty(rowNum)) {
      // pad out the list of emails so they fit in the range
      while (emailMap[rowNum].length < LARGEST_POSSIBLE_GROUP) {
        emailMap[rowNum].push("");
      }
      // write into the range
      var range = sheet.getRange(rowNum, 4, 1, LARGEST_POSSIBLE_GROUP);
      range.setValues([emailMap[rowNum]]);
    }
  }
}

function readRows() {
  var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheets()[0];
  var rows = sheet.getDataRange();
  var numRows = rows.getNumRows() - 1;
  var dataRange = sheet.getRange(START_ROW, START_COL, numRows, END_COL)
  var data = dataRange.getValues();

  var people = [];
  for (var i in data) {
    var row = data[i];
    people.push({
      emailAddress: row[0],
      team: row[1],
      lastLunchPeople: [row[2], row[3], row[4], row[5]],
      rowNum: parseInt(i, 10) + 2 // 1-based, plus a header, so they start on row 2
    });
  }

  var numGroups = Math.floor(people.length / GROUP_SIZE);
  var groups = [];
  people.sort(function (a, b) {return Math.round(Math.random()) - 0.5;});
  for (var i = 0; i < numGroups; i++) {
    var group = [];
    for (var j = 0; j < GROUP_SIZE; j++) {
      var index = Math.floor(Math.random() * (people.length))
      while (group.length < GROUP_SIZE) {
        group.push(pickPerson(people, group));
      }
    }
    groups.push(group);
  }

  for (var i = 0; i < people.length; i++) {
    // put one straggler in each group counting up 
    var groupIndex = i < groups.length ? i : 0; 
    groups[groupIndex].push(people[i]);
  }
 
  Logger.log(groups);
  var d = new Date();
  var startTime = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 12, 0); // tomorrow at 12:00 PM
  var endTime = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 13, 0); // tomorrow at 1:00 PM

  for (var i in groups) {

    // make a comma-separated list of email addresses
    var emails = [];
    for (var person in groups[i]) {
      emails.push(groups[i][person].emailAddress);
    }
    emails = emails.join(', ');

    // send the calendar invite
    CalendarApp.createEvent("Random Lunch", startTime, endTime, {
      description: EVENT_DESCRIPTION,
      guests: emails,
      sendInvites: true
    });

    // write the group back to the spreadsheet
    writeGroup(sheet, groups[i]);
  }

};
