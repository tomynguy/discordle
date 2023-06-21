const { Client, GatewayIntentBits, ChannelType, CHANNEL_TYPES } = require('discord.js');

const fs = require('fs');
const csvWriter = require('csv-writer').createObjectCsvWriter;

let messagesData = [];

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
    if (message.content.startsWith('!fetch')) {
        await message.reply('Fetching messages...');
        
        await message.guild.channels.fetch();

        const textChannels = message.guild.channels.cache.filter(
            (channel) => channel.type === ChannelType.GuildText
        );

        console.log(textChannels.size);
        for (const [, channel] of textChannels) {
            console.log('balls');
            // const permissions = channel.permissionsFor(client.user);
            // if (!permissions.has('READ_MESSAGE_HISTORY')) continue;

            const fetchedMessages = await channel.messages.fetch({ limit: 100 });
            fetchedMessages.forEach((msg) => {
                if (!msg.author.bot && msg.content.length > 0) {
                    const author = {
                        globalName: msg.author.globalUsername,
                        displayName: msg.author.username,
                        nickname: msg.member ? msg.member.nickname : ''
                    };
        
                    messagesData.push({
                        guild: message.guild.name,
                        channel: channel.name,
                        'author.globalName': author.globalName,
                        'author.displayName': author.displayName,
                        'author.nickname': author.nickname,
                        message: msg.content
                    });
                }
            });
        }

        // Prepare CSV file
        const csvWriterInstance = csvWriter({
            path: `parsedMessages/${message.guild.id}.csv`,
            header: [
                { id: 'guild', title: 'Guild' },
                { id: 'channel', title: 'Channel' },
                { id: 'author.globalName', title: 'Author(Global)' },
                { id: 'author.displayName', title: 'Author(Display)' },
                { id: 'author.nickname', title: 'Author(Nickname)' },
                { id: 'message', title: 'Message' }
            ]
        });

        csvWriterInstance
            .writeRecords(messagesData)
            .then(() => {
                console.log(`Messages fetched and saved to ${message.guild.id}.csv`);
                message.reply(`Messages fetched and saved to ${message.guild.id}.csv`);
            })
            .catch((err) => {
                console.error('Error writing to CSV file:', err);
                message.reply('An error occurred while saving the messages.');
            });
    }
});

let token = fs.readFileSync('token.txt', 'utf8');
client.login(token);