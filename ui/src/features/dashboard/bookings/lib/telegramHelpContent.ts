export type TelegramHelpStep = {
  title: string;
  body: string;
};

export type TelegramHelpSection = {
  heading?: string;
  steps: TelegramHelpStep[];
  note?: string;
};

export const TELEGRAM_BOT_TOKEN_HELP: TelegramHelpSection[] = [
  {
    heading: 'Create a bot with BotFather',
    steps: [
      {
        title: 'Open Telegram',
        body: 'On your phone or desktop, open Telegram and search for @BotFather (official bot with a blue verified badge).',
      },
      {
        title: 'Start a chat',
        body: 'Tap Start or send /start. BotFather replies with a list of commands.',
      },
      {
        title: 'Create the bot',
        body: 'Send /newbot. BotFather asks for a display name (e.g. "Kame Homes Alerts") — this is shown in contact lists.',
      },
      {
        title: 'Choose a username',
        body: 'Pick a unique username ending in "bot" (e.g. kamehomes_alerts_bot). BotFather confirms when it is available.',
      },
      {
        title: 'Copy the token',
        body: 'BotFather sends a message containing your bot token. It looks like 123456789:AAH… Copy the full string — you will paste it here.',
      },
    ],
    note: 'Keep the token private. Anyone with it can control your bot. You can revoke and regenerate it anytime from BotFather with /revoke.',
  },
  {
    heading: 'Optional: set a profile photo',
    steps: [
      {
        title: 'Send /setuserpic to BotFather',
        body: 'Select your bot, then upload a square image so your team recognizes it in Telegram.',
      },
    ],
  },
];

export const TELEGRAM_CHAT_ID_HELP: TelegramHelpSection[] = [
  {
    heading: 'Group or channel (recommended for teams)',
    steps: [
      {
        title: 'Create or open a group',
        body: 'Create a new Telegram group for your ops team, or use an existing one where alerts should land.',
      },
      {
        title: 'Add your bot',
        body: 'Open the group → Add members → search for your bot username → add it. The bot must be a member to receive messages.',
      },
      {
        title: 'Send a test message',
        body: 'Post any message in the group (e.g. "test") so Telegram registers activity.',
      },
      {
        title: 'Get the chat ID',
        body: 'Open api.telegram.org/bot<YOUR_TOKEN>/getUpdates in a browser (replace <YOUR_TOKEN> with your bot token). Find "chat":{"id":-100…} in the JSON — that number (including the minus sign) is your Chat ID.',
      },
    ],
    note: 'Supergroups and channels usually start with -100. Paste the full value including the leading minus.',
  },
  {
    heading: 'Private chat (DM to yourself)',
    steps: [
      {
        title: 'Message your bot',
        body: 'Open a direct chat with your bot and send /start or any message.',
      },
      {
        title: 'Read getUpdates',
        body: 'Same as above: open getUpdates in your browser and copy "chat":{"id":123456789} — personal chats use a positive number without -100.',
      },
    ],
  },
];
