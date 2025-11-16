TODOS:

- ✅ In dev env, if we enable google calendar & sheets, let's add [TEST] on title to easily determine that it's a test booking
- Create separate email for parking information and pet information
  - pet information - automatic email to azure pmo
  - parking information
    - add a admin fields & button to trigger email sending of parking information
    - we should have dropdown of email so we can easily send the parking information to parking owner & azure
- ✅ I noticed that on prod, we have a lot of booked dates, we should filter it to not include past dates from today because all past dates are automatically disabled from the calendar. We should only get future book dates from today. It's better if we implement this filter from the API & DB call for faster performance instead of UI filtering
- ✅ Add a "Same as Facebook Name" checkbox beside Primary Guest - Name, and when they check it, we should get and pre-populate the same value of facebook name field to primary guest name and then we should disable the field
- When user try to submit or update the form. We should do a form data difference checking. And only proceed on updating the db, sending email, updating calendar, etc ONLY if we detect that there's a data changed from the form. If there's no difference, just redirect to success page
- Handle and send different email when guest updated the form details. Ex. Please disregard..
- On the success page, let's add a info box that has the "Next steps" text. We should say that "We now send your Guest Advise Form (GAF) to Azure and we just need to wait for the approved form. Please check your email about this after a day or two. If there's still no reply on approved GAF, please reach out to our Facebook page so that we can manually follow up and call Azure for it. Thank you chuchuchu.."
- In dev env ONLY, instead of relying on query parameter on what action should be done on API, can we display a card with multiple checkboxes if we will save the data on the db, generate pdf, send email, update calendar or update google sheet. By the default, all of these are uncheck
- In prod, let's add test query parameter to determine that this is a TEST booking submission
