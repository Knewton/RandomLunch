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

/*
 * Config variables
 */

// Spreadsheet to use
var SPREADSHEET_ID = "REPLACE ME";

// Number of people in a lunch group
var GROUP_SIZE = 4;

// Title of the calendar event
var EVENT_TITLE = "Random Lunch";

// Text displayed in the calendar event
var EVENT_DESCRIPTION = "Lunchbot has spoken: you're going to lunch on Wednesday! See the other people invited to this event and make some plans!";

// Times for the calendar event to start and end.
// All are positive integers. Hours are for a 24 hour clock.
var EVENT_START_TIME_HOURS = 12;
var EVENT_START_TIME_MINUTES = 0;
var EVENT_END_TIME_HOURS = 13;
var EVENT_END_TIME_MINUTES = 0;

// Number of days from now to create the calendar event
// Positive integer.
// eg if 1, and the script is ran now, the calendar invite will be for tomorrow.
var EVENT_START_DAYS_IN_ADVANCE = 1;

// Variables you only want to change if you're modifying the script

var START_ROW = 2;
var START_COL = 2;
var LARGEST_POSSIBLE_GROUP = GROUP_SIZE + (GROUP_SIZE - 1);
var END_COL = 3 + LARGEST_POSSIBLE_GROUP; // timestamp, email, team, highest possible past lunchpeople

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
  var startTime = new Date(d.getFullYear(), d.getMonth(),
                           d.getDate() + EVENT_START_DAYS_IN_ADVANCE,
                           EVENT_START_TIME_HOURS,
                           EVENT_START_TIME_MINUTES);
  var endTime = new Date(d.getFullYear(), d.getMonth(),
                         d.getDate() + EVENT_START_DAYS_IN_ADVANCE,
                         EVENT_END_TIME_HOURS,
                         EVENT_END_TIME_MINUTES);

  for (var i in groups) {

    // make a comma-separated list of email addresses
    var emails = [];
    for (var person in groups[i]) {
      emails.push(groups[i][person].emailAddress);
    }
    emails = emails.join(', ');

    // send the calendar invite
    CalendarApp.createEvent(EVENT_TITLE, startTime, endTime, {
      description: EVENT_DESCRIPTION,
      guests: emails,
      sendInvites: true
    });

    // write the group back to the spreadsheet
    writeGroup(sheet, groups[i]);
  }

};
