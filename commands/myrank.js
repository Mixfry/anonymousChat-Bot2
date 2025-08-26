import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getUser, getXpForLevel, getUserRank } from '../db.js';

export const command = {
  data: new SlashCommandBuilder()
    .setName('myrank')
    .setDescription('自分のランク、XP、送信数を表示します。'),
  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({ content: 'このコマンドはサーバーでのみ使用できます。', ephemeral: true });
      return;
    }
    
    const user = getUser(interaction.user.id, interaction.guild.id);
    const xpForNextLevel = getXpForLevel(user.level);
    const rank = getUserRank(interaction.user.id, interaction.guild.id);
    
    const embed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle(`${interaction.user.username}のランク`)
      .addFields(
        { name: 'サーバー内順位', value: `\`${rank}位\``, inline: true },
        { name: 'レベル', value: `\`${user.level}\``, inline: true },
        { name: '総XP', value: `\`${user.xp}\``, inline: true },
        { name: '次のレベルまで', value: `\`${xpForNextLevel - user.xp} XP\``, inline: true },
        { name: 'メッセージ送信数', value: `\`${user.message_count}\``, inline: true },
        { name: '画像送信数', value: `\`${user.image_count}\``, inline: true }
      )
      .setThumbnail(interaction.user.displayAvatarURL());
      
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};

export default command;