import discord
import os

intents = discord.Intents.default()
intents.message_content = True

client = discord.Client(intents=intents)

@client.event
async def on_ready():
    print(f'We have logged in as {client.user}')

@client.event
async def on_message(message):
    if message.author == client.user:
        return

    if message.content.startswith('$hello'):
        await message.channel.send('Hello!')

# Open token.txt to retrieve discord bot token
script_dir = os.path.dirname(os.path.abspath(__file__))
file = open(os.path.join(script_dir, "token.txt"), 'r')
client.run(file.read())
file.close()