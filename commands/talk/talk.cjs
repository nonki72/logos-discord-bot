const { SlashCommandBuilder } = require('discord.js');
const generate = require('../../generate.cjs');
module.exports = {
	data: new SlashCommandBuilder()
		.setName('talk')
		.setDescription('Replies with some text.'),
	async execute(interaction) {
          // Send a message into the channel where command was triggered from
	  await interaction.reply(generate.generateTweet());
	},
};
