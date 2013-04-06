# Random Lunch

This [Google Apps Script](https://developers.google.com/apps-script/) randomly
assigns lunch groups by creating Google Calendar invites for each group. The
groups are chosen by selecting people who are not on the same team, and did not
have lunch together the last time the script ran.

At Knewton, we run this script run once a week. It is an individual's choice
to participate, and most do. All parts of the organization are involved. It is
a fun and successful way to continue innovation and sharing of ideas.

## Lunch Group Selection (aka what does 'random' mean?)

Each participant enters their email and "team" into the spreadsheet. Ideally,
the teams should be specific and refer to the people one most frequently
interacts with. The script keeps track of the group each participant went to
lunch with last time the script was ran. Note: If the script can find no one
not in the same team, and who did not eat together last week, the script will
still make a group.

## Requirements and Setup

1. Create a Google Spreadsheet. The first row will be headers. Put the following
  entries in the first row: *Timestamp*, *Email*, *Team*, *Last Lunch*.
2. Ask participants to fill out the **Email** and **Team** fields
  (perhaps use a form for this).
3. Paste the `script.js` file into a new Google Apps Script document.
4. Replace the `SPREADSHEET_ID` variable in script.js with the id of the
   spreadsheet created in step 1. This id (at the time of this writing) is
   found in the `GET` param `key`,
   e.g. `https://docs.google.com/a/knewton.com/spreadsheet/ccc?key=`**SPREADSHEET_ID**`#gid=0`
5. Run it! Run the function `main()`.
   Note that the calendar invites will be owned by the user who runs the
   script. Pro tip: create a new account to run the script so as to avoid an account
   with lots of calendar invites that say "random lunch".
6. Use a [Time Trigger](https://developers.google.com/apps-script/understanding_triggers#TimeTriggers)
   to run the script on a recurring basis.
