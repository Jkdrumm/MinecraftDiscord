# Minecraft Dedicated Server Discord Bot - Better name coming soon

## What does it do?

This is a utility to manage a dedicated Minecraft server and to integrate with discord.

## Why Discord integration?

Plenty of discord communities, even communities not centered around Minecraft, often host their own Minecraft servers as a way to increase community involvement.
Since Discord is already a hub for several of these communities, this tool will make managing a free server easier while increasing involvement.

## What does Discord integration look like?

##### Here are the currently integrated features:

- Server Status (Online, Offline)
- Number of players online
- Viewing server settings
- Changing (some) game settings
- Running (some) server commands
- Ability to opt in for notifications:
  - The bot will not ping you if you are already playing on the server
  - Be notified anytime anyone joins or when a certain number of people are playing - you decide!

##### Here are planned future integrated features:

- Restricing access to commands based on roles
- Update the dedicated server version entirely through Discord
- Allow certain users to upload a world file

## Requirements

- [Node.js](http://nodejs.org/)
- [Discord](https://discord.com/developers/applications) Bot keys

## Running this project

1. Install dependencies

```bashrc
npm install
```

2. Start the project (Not recommended right now since only the production code works completely)

```bashrc
npm run start
```

## Building this project

1. Ensure that pkg is installed globally

```bash rc
npm install -g pkg
```

2. Run the build command

```bashrc
npm run build
```

3. Run "DiscordBot.exe" found in the build folder
