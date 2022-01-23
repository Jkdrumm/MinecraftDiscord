import { Message, MessageReaction, User } from "discord.js";
import Bot from "../../discord/bot";
import Log from "../../log/log";
import { BotProperties } from "../../settings/properties";

export default abstract class SetupState {
  responsePromise?: Promise<SetupState | undefined>;
  responseResolver?: (
    value: SetupState | PromiseLike<SetupState | undefined> | undefined
  ) => void;
  responseRejector?: (reason?: any) => void;
  bot: Bot;

  abstract description: string;
  abstract next: () => Promise<SetupState | undefined>;
  reactionMessage?: Message;

  constructor(bot: Bot = Bot.getBot()) {
    this.bot = bot;
  }

  createPromise = () => {
    if (this.responsePromise === undefined)
      this.responsePromise = new Promise<SetupState | undefined>(
        (resolve, reject) => {
          this.responseResolver = resolve;
          this.responseRejector = reject;
        }
      );
  };

  handleReaction = async (reaction_orig: MessageReaction, user: User) => {
    // fetch the message if it's not cached
    const message: Message = reaction_orig.message.partial
      ? await reaction_orig.message.fetch()
      : reaction_orig.message;
    if (
      user.id === BotProperties.owner?.id &&
      message.id === this.reactionMessage?.id
    ) {
      if (reaction_orig.emoji.name)
        this.reactionOptions(reaction_orig.emoji.name);
      else
        Log.getLog().logError(
          `Unknown Emoji Identifier: ${reaction_orig.emoji.identifier}`
        );
    }
  };

  reactionOptions = async (emoji: string) => {
    console.error(`Unhandled reaction: ${emoji}`);
    this.responseRejector?.(emoji);
  };

  handleMessage = async (message: Message) => {
    if (message.author.id === BotProperties.owner?.id)
      this.messageOptions(message.content);
  };

  messageOptions = async (message: string) => {
    console.error(`Unhandled message: ${message}`);
    this.responseRejector?.(message);
  };

  cleanupListeners = () => {
    this.bot.client.removeAllListeners("messageReactionAdd");
    this.bot.client.removeAllListeners("guildCreate");
    this.bot.client.removeAllListeners("messageCreate");
  };
}
