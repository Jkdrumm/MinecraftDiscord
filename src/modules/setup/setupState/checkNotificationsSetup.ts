import SetupState from "./setupState";
import {
  BotProperties,
  properties,
  propertiesPath,
} from "../../settings/properties";
import CheckPrimaryServer from "./checkPrimaryServer";
import {
  GuildMember,
  GuildTextBasedChannel,
  MessageReaction,
  PartialGuildMember,
  User,
} from "discord.js";
import CheckServerRunning from "./checkServerRunning";

export default class CheckNotificationsSetup extends SetupState {
  description: string = "Checking Notification Settings";
  notificationsChannel?: GuildTextBasedChannel;
  setupMessage: string = "";

  numberEmojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

  next = async () => {
    this.setupMessage += `Get notified when \`${BotProperties.primaryServer?.name}\` is playing Minecraft\n`;
    this.setupMessage += `Join the server with the IP: \`${BotProperties.domainName}\`\n`;
    this.setupMessage += "React with an emoji to get started.\n";
    this.setupMessage += "```\n";
    this.setupMessage += "❗ = Get notified anytime anybody joins the server\n";
    this.setupMessage +=
      "1️⃣-🔟 = Get notified when there are this many people playing\n";
    this.setupMessage += "```";
    const notificationsChannelKey = properties?.getRaw(
      "channels.notifications"
    );
    if (notificationsChannelKey) {
      if (BotProperties.serverID && BotProperties.primaryServer) {
        this.notificationsChannel =
          BotProperties.primaryServer.channels.cache.get(
            notificationsChannelKey
          ) as GuildTextBasedChannel;
        if (this.notificationsChannel) {
          const notificationsMessageId = properties?.getRaw(
            "channels.notifications.message"
          );
          if (notificationsMessageId) {
            try {
              BotProperties.notificationMessage =
                await this.notificationsChannel.messages.fetch(
                  notificationsMessageId
                );
              this.addReactionListeners();
              if (
                BotProperties.notificationMessage.content !== this.setupMessage
              ) {
                BotProperties.notificationMessage.edit({
                  content: this.setupMessage,
                });
              }
              // Load users to be notified
              BotProperties.notificationMessage?.reactions.cache.forEach(
                async (reaction) => {
                  const users = await reaction.users.fetch();
                  const emoji = reaction.emoji.name;
                  if (emoji !== null)
                    for (const [_, user] of users) {
                      if (
                        BotProperties.primaryServer?.members.cache.get(
                          user.id
                        ) !== undefined
                      )
                        this.addUserToNotify(emoji, user);
                      else {
                        // Remove the notification reactions if they are no longer in the server
                        await this.removeReactionsForUser(user.id);
                      }
                    }
                }
              );
              return new CheckServerRunning();
            } catch {
              this.setupNotificationMessage();
            }
          } else this.setupNotificationMessage();
        } else this.setupNotificationChannel();
      } else return new CheckPrimaryServer();
    } else this.setupNotificationChannel();
  };

  setupNotificationChannel = async () => {
    this.createPromise();
    this.bot.client.addListener("messageReactionAdd", this.handleReaction);
    let content =
      "Let's create a notifications channel. This is where players can opt-in to receive notifications when people are playing.\n";
    content +=
      "React with 🚀 if you agree to letting me handle setting up this channel.\n";
    content += "(I promise I won't break anything)";
    this.reactionMessage = await BotProperties.owner?.send(content);
    this.reactionMessage?.react("🚀");
  };

  setupNotificationMessage = async () => {
    if (this.notificationsChannel) {
      const notificationMessage = await this.notificationsChannel.send(
        this.setupMessage
      );
      this.addReactionListeners();
      BotProperties.notificationMessage = notificationMessage;
      const emojis = ["❗", ...this.numberEmojis];
      emojis.forEach((emoji) => notificationMessage.react(emoji));
      properties?.set("channels.notifications.message", notificationMessage.id);
      await properties?.save(propertiesPath);
    }
    this.responseResolver?.(new CheckServerRunning());
  };

  reactionOptions = async (emoji: string) => {
    if (emoji === "🚀") {
      if (BotProperties.serverID && BotProperties.applicationId) {
        const primaryServer = this.bot.client.guilds.cache.get(
          BotProperties.serverID
        );
        if (primaryServer) {
          primaryServer.channels.cache;
          const notificationsCategory = await primaryServer.channels.create(
            "Minecraft",
            {
              reason: "Notifications Channel for Minecraft",
              type: "GUILD_CATEGORY",
              permissionOverwrites: [
                {
                  id: primaryServer.roles.everyone,
                  allow: ["VIEW_CHANNEL"],
                  deny: ["SEND_MESSAGES", "ADD_REACTIONS"],
                },
                {
                  id: BotProperties.applicationId,
                  allow: ["ADMINISTRATOR"],
                },
              ],
            }
          );
          this.notificationsChannel = (await primaryServer.channels.create(
            "notifications",
            {
              reason: "Notifications Channel for Minecraft",
              parent: notificationsCategory,
            }
          )) as GuildTextBasedChannel;
          properties?.set(
            "channels.notifications",
            this.notificationsChannel.id
          );
          await properties?.save(propertiesPath);
          this.setupNotificationMessage();
        } else this.responseResolver?.(new CheckPrimaryServer());
      }
    }
  };

  handleNotificationReaction = async (
    reaction_orig: MessageReaction,
    user: User
  ) => {
    if (
      reaction_orig.message.id !== BotProperties.notificationMessage?.id ||
      user.id === BotProperties.applicationId
    )
      return;

    if (reaction_orig.emoji.name) {
      const emoji = reaction_orig.emoji.name;
      this.addUserToNotify(emoji, user);
    }
  };

  handleNotificationReactionRemove = async (
    reaction_orig: MessageReaction,
    user: User
  ) => {
    if (
      reaction_orig.message.id !== BotProperties.notificationMessage?.id ||
      user.id === BotProperties.applicationId ||
      !BotProperties.linkedUsers[user.id]
    )
      return;

    if (reaction_orig.emoji.name) {
      const emoji = reaction_orig.emoji.name;
      const level = this.getNotificationLevel(emoji);
      if (level) {
        const userIndex = BotProperties.notifyUsers[level]?.indexOf(user.id);
        BotProperties.notifyUsers[level].splice(userIndex, 1);
      }
    }
  };

  addUserToNotify = async (emoji: string, user: User) => {
    if (user.id === BotProperties.applicationId) return;
    if (!BotProperties.linkedUsers[user.id]) {
      if (!BotProperties.unlinkedUsers[user.id]) {
        // DM them to link their account
        const token = this.generateAuthToken(8);
        BotProperties.unlinkedUsers[user.id] = token;
        let content =
          "To enable notifications, you first need to link to your Minecraft account.\n";
        content +=
          "This is to prevent you from receiving notifications for when you join a game.\n";
        content +=
          "To link your Discord and Minecraft accounts, say this in the Minecraft chat after joining the server:```";
        content += "!link <Your token here without brackets>\n";
        content += "```";
        content += "Be sure to keep your token hidden from anyone else.\n";
        content += `Your token is: ||${token}||`;
        user.send(content);
      }
      this.removeReactionsForUser(user.id);
    } else {
      const level = this.getNotificationLevel(emoji) ?? "every";
      const usersArray = BotProperties.notifyUsers[level];
      if (usersArray) usersArray.push(user.id);
      else BotProperties.notifyUsers[level] = [user.id];
    }
  };

  getNotificationLevel = (emoji: string) => {
    if (emoji === "❗") return "every";
    const emojiNumber = this.numberEmojis.indexOf(emoji) + 1;
    if (emojiNumber !== 0) return emojiNumber;
  };

  addReactionListeners = () => {
    this.bot.client.addListener(
      "messageReactionAdd",
      this.handleNotificationReaction
    );
    this.bot.client.addListener(
      "messageReactionRemove",
      this.handleNotificationReactionRemove
    );
    this.bot.client.on("guildMemberRemove", this.handleUserLeftServer);
  };

  handleUserLeftServer = (member: GuildMember | PartialGuildMember) => {
    this.removeReactionsForUser(member.id);
  };

  removeReactionsForUser = async (userId: string) => {
    if (BotProperties.notificationMessage) {
      const usersReactions = BotProperties.notificationMessage?.reactions.cache
        .filter((reaction) => reaction.users.cache.has(userId))
        .values();
      for (const reaction of usersReactions) {
        await reaction.users.remove(userId);
      }
    }
  };

  generateAuthToken = (length: number) => {
    let result = "";
    let characters =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  };
}
