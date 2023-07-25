const { SlashCommandBuilder } = require('discord.js');
const generate = require('../../generate.js');

module.exports = {
    data: new SlashCommandBuilder()
      .setName('talk')
      .setDescription('Talk with Miku!'),
    async execute(interaction) {
      
      await interaction.reply('Thinking...');
      
      // const generated = await generate.generateTweet();
      // await interaction.editReply(getRandomEmoji() + generated);

    },
  };
