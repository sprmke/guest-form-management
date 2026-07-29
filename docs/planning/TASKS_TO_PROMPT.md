Expand Inbox module to both org and property levels

Right now, we only have Inbox module at org level.

We should expand it and we should have menu and pages on property level.

The only differences are:

At org level:

- Web chat - we can display all property web chats and conversations. We have a view property link that redirects us to property dashboard
- Facebook/Instagram - this would be the default meta account. if user connect their meta account at org level, this should be reused and be the default meta account for all properties inbox module. Meaning, when we visit all properties, we will have automatically connected and reused meta account per property. Unless they manually connect to different meta account on specific properties. The initial connected meta account should be used and be the default meta account to all properties & parkings.

At property level:

- Web chat - scoped and only display the chat and conversations under specific property.
- Facebook/Instagram - we can connect different meta account per property.

===

Support both property and parking bookings in /bookings module at org level.

We need to update /bookings module at org level to display info and available actions for both properties & parking.
Right now, only properties are working and visible there.
Adjust all views (table, card, calendar) to display properties & parking info and make sure all filters, and any supported functions for both module will work correctly.
Maybe at org level, we can remove the kanban board because we don't have workflow for parking bookings.

We should also update the stat cards, filters, and any actions available on bookings module at org level.
The end goal is that we should support both properties & parking modules in bookings module at org level.

===

Socials at org and property level

We should refine how we can improve the socials management for org and property level to prevent any redundant fill up.
Provide a best UI/UX so that on property/parking level, we have option to reuse the same value of org level per fields.
Maybe, we will offer a global button that if click, we will make all social fields read only and populate it with org values.
Or maybe it's better if we have individual toggle per field? Or support both? Provide the best UI/UX for our scenario.

===

Refine Notifications module

Let's offer an option to have global bot token which can be used for all modules.
So we will have a first card to input global/reusable bot token and a button to test if token is valid.
Once saved, this will be the default bot token value when a module is enabled, this is still editable and viewable.
But this is better because we can have a one bot token for all notification modules.

Also, on first card, we should have a help button and when we click it, we will provide a very detailed instructions on how to generate telegram bot token.

Then, for each module, when we will also have a help button for chat id, and with same flow, we will provide detailed guide on how to get tg chat id.

Lastly, let's provide card description for each section, for what each module is for.
