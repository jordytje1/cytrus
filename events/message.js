module.exports = async (client, message) => {
  // It's good practice to ignore other bots. This also makes your bot ignore itself
  // and not get into a spam loop (we call that 'botception').
  if (message.author.bot) return;
  let settings;

  // Grab the settings for this server from Enmap.
  // If there is no guild, get default conf (DMs)
  if (message.guild) {
    settings = message.settings = client.getSettings(message.guild.id);
  } else {
    settings = client.config.defaultSettings
  }

  // Checks if the bot was mentioned, with no message after it, returns the prefix.
  const prefixMention = new RegExp(`^<@!?${client.user.id}>( |)$`);
  if (message.content.match(prefixMention)) {
    return message.reply(`My prefix on this guild is \`${settings.prefix}\``);
  }

  // Also good practice to ignore any message that does not start with our prefix,
  // which is set in the configuration file.
  if (message.content.indexOf(settings.prefix) !== 0) return;

  // Here we separate our 'command' name, and our 'arguments' for the command.
  // e.g. if we have the message '+say Is this the real life?' , we'll get the following:
  // command = say
  // args = ['Is', 'this', 'the', 'real', 'life?']
  const args = message.content.slice(settings.prefix.length).trim().split(/ +/g);
  const command = args.shift().toLowerCase();

  // If the member on a guild is invisible or not cached, fetch them.
  if (message.guild && !message.member) await message.guild.fetchMember(message.author);

  // Get the user or member's permission level from the elevation
  const level = client.permlevel(message);

  // Check whether the command, or alias, exist in the collections defined
  // in app.js.
  const cmd = client.commands.get(command) || client.aliases.get(command);
  // using this const varName = thing OR otherthign; is a pretty efficient
  // and clean way to grab one of 2 values!
  if (!cmd) return message.channel.send(command+' is not a command! Use ' + settings.prefix + 'help for help.');

  // Some commands may not be useable in DMs. This check prevents those commands from running
  // and return a friendly error message.
  if (cmd && !message.guild && cmd.conf.guildOnly)
    return message.channel.send('This command is unavailable via private message. Please run this command in a guild.');

  if (level < client.levelCache[cmd.conf.permLevel]) {
    if (settings.noPermissionNotice === 'true') {
      return message.channel.send(`You do not have permission to use this command.
Your permission level is ${level} (${client.config.permLevels.find(l => l.level === level).name})
This command requires level ${client.levelCache[cmd.conf.permLevel]} (${cmd.conf.permLevel})`);
    } else {
      return;
    }
  }

  // To simplify message arguments, the author's level is now put on level (not member so it is supported in DMs)
  // The 'level' command module argument will be deprecated in the future.
  message.author.permLevel = level;
  
  message.flags = [];
  while (args[0] && args[0][0] === '-') {
    message.flags.push(args.shift().slice(1));
  }

  try {
    cmd.run(client, message, args, level);
  } catch (err) {
    message.channel.send('Their was an error!\n' + err).catch();
  }
};