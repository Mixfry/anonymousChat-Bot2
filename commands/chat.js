import { SlashCommandBuilder, EmbedBuilder, ChannelType } from 'discord.js';
import { getUser, updateUser, getXpForLevel } from '../db.js';

const ANONYMOUS_ONLY_CHANNELS = (() => {
  if (process.env.ANONYMOUS_ONLY_CHANNELS) {
    return process.env.ANONYMOUS_ONLY_CHANNELS.split(',').map(s => s.trim()).filter(Boolean);
  } else {
    console.warn('[警告] ANONYMOUS_ONLY_CHANNELS が .env に設定されていません。');
    return [];
  }
})();

const ADMIN_USER_ID = process.env.ADMIN_USER_ID;

export const command = {
  data: new SlashCommandBuilder()
    .setName('anonymous')
    .setDescription('匿名メッセージを送信します。')
    .addStringOption(option =>
      option.setName('message')
        .setDescription('送る内容を書いてね')
        .setRequired(false))
    .addAttachmentOption(option =>
      option.setName('image')
        .setDescription('送る画像を添付してね')
        .setRequired(false))
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('投稿先のチャンネル（任意）')
        .setRequired(false)
        .addChannelTypes(ChannelType.GuildText)
    ),

  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({ content: 'このコマンドはサーバーでのみ使用できます。', ephemeral: true });
      return;
    }

    const targetChannel = interaction.options.getChannel('channel');

    if (targetChannel && targetChannel.name.endsWith('_')) {
      await interaction.reply({ content: 'そのチャンネルには送信できません', ephemeral: true });
      return;
    }

    const isAnonymousOnlyChannel = ANONYMOUS_ONLY_CHANNELS.includes(interaction.channelId);

    if (isAnonymousOnlyChannel && (!targetChannel || targetChannel.id === interaction.channelId)) {
      await interaction.reply({ content: 'このチャンネルでは、投稿先のチャンネルを**必ず指定**してください。', ephemeral: true });
      return;
    }

    const finalTargetChannel = targetChannel || interaction.channel;
    const message = interaction.options.getString('message') || '';
    const image = interaction.options.getAttachment('image');

    if (!message && !image) {
      await interaction.reply({ content: 'メッセージまたは画像を選択してください。', ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const messageOptions = { content: message };
      if (image) { messageOptions.files = [image.url]; }
      await finalTargetChannel.send(messageOptions);
      
      const user = getUser(interaction.user.id, interaction.guild.id);
      const now = Date.now();
      let xpGained = 1;
      let notificationMessage = '';
      const initialLevel = user.level;

      const lastDaily = new Date(user.last_daily_timestamp);
      const today = new Date(now);
      if (lastDaily.getDate() !== today.getDate() || lastDaily.getMonth() !== today.getMonth() || lastDaily.getFullYear() !== today.getFullYear()) {
        user.daily_count = 0;
      }
      
      if (user.daily_count < 5) {
        xpGained = 100;
        user.daily_count++;
        user.last_daily_timestamp = now;
        const remaining = 5 - user.daily_count;
        notificationMessage += `**デイリーXP獲得！** (+${xpGained} XP)\n> 本日分はあと \`${remaining}\` 回受け取れます。\n`;
      } else {
        if (now - user.last_hourly_timestamp > 1800000) { 
          xpGained = 50;
          user.last_hourly_timestamp = now;
          notificationMessage += `**時間ボーナス！** (+${xpGained} XP)\n> 30分に1度受け取れます。\n`;
        }
      }

      user.xp += xpGained;

      if (message) user.message_count++;
      if (image) user.image_count++;
      
      let xpForNextLevel = getXpForLevel(user.level);
      while (user.xp >= xpForNextLevel) {
        user.level++;
        notificationMessage += `🎉 **レベルアップ！** \`${user.level}\`レベル になりました！\n`;
        xpForNextLevel = getXpForLevel(user.level);
      }
      
      updateUser(user);
      
      await interaction.editReply({ content: `${finalTargetChannel} に匿名メッセージを送信しました！`, ephemeral: true });

      if (notificationMessage) {
        await interaction.followUp({ content: notificationMessage, ephemeral: true });
      }

      if (!ADMIN_USER_ID) {
        console.error('[エラー] ADMIN_USER_IDが.envに設定されていません。');
      } else {
        const adminUser = await interaction.client.users.fetch(ADMIN_USER_ID).catch(() => null);
        
        if (adminUser) {
          // レベルアップを何らかしらに活かすときに使う、db見れなくてもレベルを把握するのに使うため
            if (initialLevel < user.level) {
                const levelUpEmbed = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setTitle('🎉 レベルアップ通知')
                    .setDescription(`${interaction.user.tag}さんがレベルアップしました！`)
                    .addFields(
                        { name: 'ユーザー', value: `> ${interaction.user.tag} (${interaction.user.id})` },
                        { name: 'サーバー', value: `> ${interaction.guild.name}`},
                        { name: '新レベル', value: `> ${user.level} になりました！` }
                    )
                    .setTimestamp();
                await adminUser.send({ embeds: [levelUpEmbed] });
            }

            // トラブル防止用の魚拓
            const logEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('log')
                .setAuthor({ name: `${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
                .addFields(
                  { name: 'サーバー', value: `> ${interaction.guild.name}`, inline: true },
                  { name: 'チャンネル', value: `> ${finalTargetChannel.name}`, inline: true },
                  { name: 'レベル', value: `\`${user.level}\``, inline: true }
                )
                .setTimestamp();
            if (message) logEmbed.addFields({ name: 'メッセージ内容', value: `\`\`\`${message}\`\`\`` });
            if (image) logEmbed.setImage(image.url);
            await adminUser.send({ embeds: [logEmbed] });
        } else {
          console.error(`[エラー] 管理者が見つかりません。ID: ${ADMIN_USER_ID}`);
        }
      }

    } catch (error) {
      console.error('匿名コマンドの実行中にエラーが発生しました:', error);
      if (!interaction.deleted) {
        await interaction.followUp({ content: 'メッセージの送信中にエラーが発生しました。', ephemeral: true });
      }
    }
  }
};

export default command;