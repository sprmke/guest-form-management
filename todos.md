TODOS:

- Push mock data improvements
- Push guest form improvements

- In dev env, if we enable google calendar & sheets, let's add [TEST] on title to easily determine that it's a test booking
- If no booking id on success page, just redirect to root route
- Create separate email for parking information and pet information
  - pet information - automatic email to azure pmo
  - parking information
    - add a admin fields & button to trigger email sending of parking information
    - we should have dropdown of email so we can easily send the parking information to parking owner & azure
- I noticed that on prod, we have a lot of booked dates, we should filter it to not include past dates from today because all past dates are automatically disabled from the calendar. We should only get future book dates from today. It's better if we implement this filter from the API & DB call for faster performance instead of UI filtering
