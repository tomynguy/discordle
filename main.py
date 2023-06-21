import discord
import os
import random
import asyncio

intents = discord.Intents.default()
intents.messages = True
intents.message_content = True
intents.members = True

client = discord.Client(intents=intents)

@client.event
async def on_ready():
    print(f'We have logged in as {client.user}')

def getMessage(messages):
    random_message = random.choice(messages)
    if random_message.author == None or random_message.author.bot:
        return getMessage(messages)
    
    return random_message

@client.event
async def on_message(message):
    if message.author == client.user:
        return

    if message.content.startswith('!discordle'):
        await message.add_reaction('✅')

        server = message.guild
        print("Game started!")

        # Filter out only text channels
        text_channels = server.text_channels

        messages = []

        for channel in text_channels:
            # Check if the bot has permission to read message history in the channel
            permissions = channel.permissions_for(server.me)
            if not permissions.read_message_history:
                continue
            messages.extend([message async for message in channel.history(limit=100)])

        del messages[messages.index(message)]
        random_message = getMessage(messages)
        message_content = random_message.content
        for i in range(len(random_message.attachments)):
            message_content += "\n" + random_message.attachments[i].url
        author = (random_message.author.global_name, random_message.author.name, server.get_member(random_message.author.id).nick)
        print(f"{author[0]} ({author[1]}) ({author[2]}): {message_content}")

        # Start the game by sending the randomly selected message
        await message.channel.send(f"Guess the user who said this message:\n{message_content}")
        embed = discord.Embed()
        embed.description = "[Message](" + random_message.jump_url + ")"
        
        def check_winner(m):
            return (m.content.lower() == author[0].lower() or 
                    m.content.lower() == author[1].lower() or 
                    m.content.lower() == author[2].lower()) and m.channel == message.channel
        
        try:
            # Wait for user guesses within the time limit
            while True:
                guess_message = await client.wait_for('message', check=lambda m: m.channel == message.channel, timeout=60)
                if check_winner(guess_message):
                    await guess_message.add_reaction('🥶')  # Correct guess reaction
                    await message.channel.send(f"{guess_message.author.mention} is the winner! ", embed=embed)
                    break  # Exit the loop if correct guess
                else:
                    await guess_message.add_reaction('💀')  # Incorrect guess reaction

        except asyncio.TimeoutError:
            # If no one guessed correctly within the time limit, announce the answer
            await message.channel.send(f"The time is up! The correct answer is {random_message.author.name}. ", embed=embed)

# Open token.txt to retrieve discord bot token
script_dir = os.path.dirname(os.path.abspath(__file__))
file = open(os.path.join(script_dir, "token.txt"), 'r')
client.run(file.read())
file.close()