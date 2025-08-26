import { command as chat } from './commands/chat.js';
import { command as myrank } from './commands/myrank.js';
import { command as ranking } from './commands/ranking.js';
import { command as createchannel } from './commands/createchannel.js'; 

import { Client, Events, GatewayIntentBits, ChannelType } from 'discord.js';

const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ] 
});

const AUTO_DELETE_GUILD_ID = process.env.AUTO_DELETE_GUILD_ID;
if (!AUTO_DELETE_GUILD_ID) {
  console.error('[エラー] AUTO_DELETE_GUILD_ID が未設定です、 [.env] に追加してください。');
  process.exit(1);
} 

const EXEMPT_CHANNELS = (() => {
  if (process.env.EXEMPT_CHANNELS) {
    return process.env.EXEMPT_CHANNELS.split(',').map(s => s.trim()).filter(Boolean);
  } else { return []; }
})();

const ALLOWED_CATEGORY_IDS = (() => {
    if (process.env.ALLOWED_CATEGORY_IDS) {
      return process.env.ALLOWED_CATEGORY_IDS.split(',').map(s => s.trim()).filter(Boolean);
    } else {
      console.error('[エラー] ALLOWED_CATEGORY_IDS が .env に設定されていません。');
      return [];
    }
  })();

client.once(Events.ClientReady, c => {
  console.log(`${c.user.tag}が飛び乗った！`);
});

client.on(Events.InteractionCreate, async interaction => {
  if (interaction.isAutocomplete()) {
    const commandName = interaction.commandName;
    
    if (commandName === 'createchannel') {
      const focusedValue = interaction.options.getFocused();
      const choices = interaction.guild.channels.cache
        .filter(channel => 
          channel.type === ChannelType.GuildCategory &&
          ALLOWED_CATEGORY_IDS.includes(channel.id)
        )
        .map(channel => ({ name: channel.name, value: channel.id }));
        
      const filtered = choices.filter(choice => choice.name.startsWith(focusedValue));
      await interaction.respond(filtered.slice(0, 25));
    }
    return;
  }

  if (!interaction.isChatInputCommand()) return;
  
  try {
    switch (interaction.commandName) {
      case chat.data.name:
        await chat.execute(interaction);
        break;
      case myrank.data.name:
        await myrank.execute(interaction);
        break;
      case ranking.data.name:
        await ranking.execute(interaction);
        break;
      case createchannel.data.name: 
        await createchannel.execute(interaction);
        break;
      default:
        console.error(`${interaction.commandName}というコマンドには対応していません。`);
    }
  } catch (error) {
    console.error(error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: 'コマンド実行時にエラーが発生しました。', ephemeral: true });
    } else {
      await interaction.reply({ content: 'コマンド実行時にエラーが発生しました。', ephemeral: true });
    }
  }
});

// bot以外発言できないようにする自動削除(無理やり(ゴリ押し(多分他に方法ある)))
client.on(Events.MessageCreate, async message => {
  if (message.guildId === AUTO_DELETE_GUILD_ID && 
      !message.author.bot && 
      message.author.id !== message.guild.ownerId &&
      !EXEMPT_CHANNELS.includes(message.channelId)) {
    try {
      await message.delete();
    } catch (error) {
      console.error('メッセージの削除中にエラーが発生しました:', error);
    }
  }
});

client.login(process.env.TOKEN);