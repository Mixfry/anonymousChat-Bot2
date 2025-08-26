import { SlashCommandBuilder, ChannelType } from 'discord.js';

export const command = {
  data: new SlashCommandBuilder()
    .setName('createchannel')
    .setDescription('指定したカテゴリに新しいテキストチャンネルを作成します。')
    .addStringOption(option =>
      option.setName('category')
        .setDescription('チャンネルを作成するカテゴリを選択してください。')
        .setRequired(true)
        .setAutocomplete(true) 
    )
    .addStringOption(option =>
      option.setName('name')
        .setDescription('新しいチャンネルの名前を入力してください。')
        .setRequired(true)
    ),
  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({ content: 'このコマンドはサーバーでのみ使用できます。', ephemeral: true });
      return;
    }

    const categoryId = interaction.options.getString('category');
    const channelName = interaction.options.getString('name');
    const allowedCategoryIds = process.env.ALLOWED_CATEGORY_IDS.split(',');

    if (!allowedCategoryIds.includes(categoryId)) {
      await interaction.reply({ content: '指定されたカテゴリにはチャンネルを作成できません。', ephemeral: true });
      return;
    }

    try {
      const category = await interaction.guild.channels.fetch(categoryId);
      if (!category || category.type !== ChannelType.GuildCategory) {
        await interaction.reply({ content: '有効なカテゴリが見つかりませんでした。', ephemeral: true });
        return;
      }

      const newChannel = await interaction.guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: category,
      });

      await interaction.reply({ content: `${category.name}に #${newChannel.name} を作成しました！`, ephemeral: true });
    } catch (error) {
      console.error('チャンネル作成中にエラーが発生しました:', error);
      await interaction.reply({ content: 'チャンネルの作成中にエラーが発生しました。権限を確認してください。', ephemeral: true });
    }
  }
};

export default command;