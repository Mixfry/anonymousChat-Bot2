import { REST, Routes } from 'discord.js';
import chat from './commands/chat.js';
import myrank from './commands/myrank.js';
import ranking from './commands/ranking.js';
import createchannel from './commands/createchannel.js'; 

const commands = [
  chat.data.toJSON(),
  myrank.data.toJSON(),
  ranking.data.toJSON(),
  createchannel.data.toJSON() 
];
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    await rest.put(
      Routes.applicationCommands(process.env.APPLICATION_ID),
      { body: commands },
    );
    console.log('デプロイ成功！');
  } catch (error) {
    console.error('デプロイ中にエラーが発生しました:', error);
  }
})();