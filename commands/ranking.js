import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getTopUsers } from '../db.js';

export const command = {
  data: new SlashCommandBuilder()
    .setName('ranking')
    .setDescription('サーバー内のXPランキングTOP3を表示します。'),
  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({ content: 'このコマンドはサーバーでのみ使用できます。', ephemeral: true });
      return;
    }
    
    const topUsers = getTopUsers(interaction.guild.id, 3);
    
    const embed = new EmbedBuilder()
      .setColor(0xFFD700)
      .setTitle('XPランキング TOP3')
      .setDescription('サーバーを支えてる人たち');

    if (topUsers.length === 0) {
      embed.setDescription('まだランキングデータがありません。');
    } else {
      topUsers.forEach((user, index) => {
        embed.addFields({
          name: `${index + 1}位`,
          value: `> **レベル**: \`${user.level}\`\n> **総XP**: \`${user.xp}\``,
          inline: false
        });
      });
    }
      
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};

export default command;