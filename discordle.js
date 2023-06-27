const { Client, GatewayIntentBits, ChannelType, CHANNEL_TYPES, PermissionsBitField } = require('discord.js');

const fs = require('fs');
const csvWriter = require('csv-writer').createObjectCsvWriter;

let {createRoom} = require('./server.js');

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildMembers,
	],
});

client.once('ready', () => {
  console.log('Bot is ready!');
});

client.on('messageCreate', async (message) => {
    let messagesData = [];
    if (message.content.startsWith('!fetch')) {
        await message.reply('Fetching messages...');

        await message.guild.members.fetch(); // fetch all members
        await message.guild.channels.fetch(); // fetch all channels

        const textChannels = message.guild.channels.cache.filter(
            (channel) => channel.type === ChannelType.GuildText
        );

        for (const [, channel] of textChannels) {
            const botPermissionsIn = message.guild.members.me.permissionsIn(channel);
            if (!botPermissionsIn.has(PermissionsBitField.Flags.ViewChannel)) continue;
            
            const fetchedMessages = await channel.messages.fetch({ limit: 100 });
            fetchedMessages.forEach((msg) => {
                if (!msg.author.bot && msg.content.length > 0) {
                    const author = {
                        globalName: msg.member ? msg.member.user.tag : '',
                        displayName: msg.author.username,
                        nickname: msg.member ? msg.member.nickname : ''
                    };
                    let attachments = msg.attachments.map((attachment) => attachment.url);
                    messagesData.push({
                        guild: message.guild.name,
                        guildID: message.guild.id,
                        channel: channel.name,
                        channelID: channel.id,
                        globalName: author.globalName,
                        displayName: author.displayName,
                        nickname: author.nickname,
                        message: msg.content,
                        attachments: attachments
                    });
                }
            });
        }

        // Prepare CSV file
        const csvWriterInstance = csvWriter({
            path: `parsedMessages/${message.guild.id}.csv`,
            header: [
                { id: 'guild', title: 'Guild' },
                { id: 'guildID', title: 'GuildID' },
                { id: 'channel', title: 'Channel' },
                { id: 'channelID', title: 'ChannelID' },
                { id: 'globalName', title: 'GlobalName' },
                { id: 'displayName', title: 'DisplayName' },
                { id: 'nickname', title: 'Nickname' },
                { id: 'message', title: 'Message' },
                { id: 'attachments', title: 'Attachments' }
            ]
        });

        try {
            await csvWriterInstance.writeRecords(messagesData);
            console.log(`Messages fetched and saved to ${message.guild.id}.csv`);
            const roomID = await createRoom(`${message.guild.id}.csv`);
            message.reply(`${roomID} has been created.`);
          } catch (err) {
            console.error('Error writing to CSV file:', err);
            message.reply('An error occurred while retrieving the messages.');
            }
    }

});
  



let token = fs.readFileSync('token.txt', 'utf8');
client.login(token);