const { Client, GatewayIntentBits, ChannelType, CHANNEL_TYPES, PermissionsBitField } = require('discord.js');

const fs = require('fs');
const csvWriter = require('csv-writer').createObjectCsvWriter;

let {createRoom, PORT, IP} = require('./server.js');

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
            
            let length = 100;
            let messagePointer = null;

            while(length == 100) {
                length = 0;
                if(messagePointer == null) {
                    fetchedMessages = await channel.messages.fetch({ limit: 100});
                }
                else {
                    fetchedMessages = await channel.messages.fetch({ limit: 100, before: messagePointer.id });
                }

                fetchedMessages.forEach((msg) => {
                    let attachments = "";
                    msg.attachments.map((attachment) => attachments += attachment.url);
                    if (!msg.author.bot && (msg.content.length + attachments.length) > 0) {
                        const author = {
                            globalName: msg.author.username.toLowerCase(),
                            displayName: msg.member.displayName.toLowerCase(),
                            avatar: msg.author.avatarURL()
                        };
                        messagesData.push({
                            channel: channel.name,
                            channelID: channel.id,
                            globalName: author.globalName,
                            displayName: author.displayName,
                            avatar: author.avatar,
                            message: msg.content + attachments
                        });
                    }
                    messagePointer = msg;
                    length++;
                });
            }

        }

        // Prepare CSV file
        const csvWriterInstance = csvWriter({
            path: `parsedMessages/${message.guild.id}.csv`,
            header: [
                { id: 'channel', title: 'Channel' },
                { id: 'channelID', title: 'ChannelID' },
                { id: 'globalName', title: 'GlobalName' },
                { id: 'displayName', title: 'DisplayName' },
                { id: 'avatar', title: 'Avatar' },
                { id: 'message', title: 'Message' }
            ]
        });

        try {
            await csvWriterInstance.writeRecords(messagesData);
            console.log(`Messages fetched and saved to ${message.guild.id}.csv`);
            createRoom(`${message.guild.id}.csv`).then((roomID) => message.reply(`Link: http://${IP}:${PORT}/?room=${roomID}`));
          } catch (err) {
            console.error('Error writing to CSV file:', err);
            message.reply('An error occurred while retrieving the messages.');
            }
    }

    if (message.content.startsWith('!create')) {
        const filePath = `parsedMessages/${message.guild.id}.csv`;
      
        fs.promises.access(filePath, fs.constants.F_OK)
          .then(() => createRoom(`${message.guild.id}.csv`))
          .then((roomID) => message.reply(`Link: http://${IP}:${PORT}/?room=${roomID}`))
          .catch(() => message.reply('You need to use !fetch first.'));
      }
});

let token = fs.readFileSync('token.txt', 'utf8');
client.login(token);