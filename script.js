/* Main entry point is function main().

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
var FORM_DESCRIPTION = "Every week, Random Lunch Bot can group you with three other random Knerds for lunch on Wednesday. " +
  "Submit the form linked below to let me know if you want to participate this week! (Sorry we can't embed the form in this email; this is a limitation of Google Apps Script.)\n\n" +
  "If you don't want to participate, you can just delete this email; if you don't want to receive these emails anymore, you can filter emails sent to teamnyc+randomlunch@knewton.com.\n\n";

// Probably incomplete!!
var TEAMS = [
  "Management",
  "HR",
  "Recruiting",
  "Product Development",
  "Tech - Client Services",
  "Tech - Platform",
  "Tech - Adaptive Learning",
  "Tech - Systems/IT/QA",
  "Tech - Flaming Horse"
];

var FORM_EMAIL = "teamnyc+randomlunch@knewton.com";

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


var DB = ScriptDb.getMyDb();

/**
 * Returns the Date of the next Wednesday.
 */
function getNextWednesday(d) {
  d = new Date(d);
  var day = d.getDay();

  if (day <= 3) {
    var diff = 3 - day;
  } else {
    // get Wednesday after this week
    var diff = 3 + (7 - day);
  }

  return new Date(d.setDate(d.getDate() + diff));
}

function getFormTitle(date) {
  return "Random Lunch $month/$day/$year".replace("$month", date.getMonth() + 1) // returns 0-indexed
                                         .replace("$day", date.getDate())
                                         .replace("$year", date.getFullYear());
}

/**
 *  Creates a form and returns it, with the description and title set.
 *  Implicitly uses the date of the Monday of the current week!
 */
function createForm() {
  var title = getFormTitle(getNextWednesday(new Date()));
  var form = FormApp.create(title)
                    .setTitle(title)
                    //.setRequireLogin(true) // we can only do these with an account in the knewton.com domain :(
                    //.setCollectEmail(true)
                    .setDescription(FORM_DESCRIPTION)
                    .setAllowResponseEdits(true)
                    .setShowLinkToRespondAgain(true);

  var email = form.addTextItem().setTitle("What's your Knewton email?")
                                .setHelpText("(We can't collect this automatically without sending this from a @knewton.com address.)")
                                .setRequired(true);
/* Skip this for now
  var team = form.addMultipleChoiceItem()
                 .setTitle("What team are you on?")
                 .setChoiceValues(TEAMS)
                 .setRequired(true);
*/
  return form;
}

/**
 *  Generates a participation survey for the next Wednesday, and sends it out to the whole company.
 */
function sendAndStoreForm() {
  form = createForm();
  MailApp.sendEmail(FORM_EMAIL, form.getTitle(), FORM_DESCRIPTION + form.getPublishedUrl());
  DB.save({title: form.getTitle(), formId: form.getId()});
}

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

function getFormByTitle(title) {
  var result = DB.query({title: title});
  if (result.hasNext()) {
    return result.next().formId;
  }
  Logger.log("No form with title: " + title);
  return null;
}

function readRows() {
  var title = getFormTitle(new Date());
  var spreadsheetId = DB.query(query)
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

function main() { readRows(); }
