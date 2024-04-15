require('dotenv').config();

const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { Client, Intents, Collection } = require('discord.js');
const { Player } = require("discord-player");

const fs = require('fs');
const path = require('path');

const client = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_VOICE_STATES
    ]
});

// List of all commands
const commands = [];
client.commands = new Collection();

const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    client.commands.set(command.data.name, command);
    commands.push(command.data.toJSON());
}

// Add the player on the client
client.player = new Player(client, {
    ytdlOptions: {
        quality: "highestaudio",
        highWaterMark: 1 << 25
    }
});

client.once('ready', async () => {
    // Get all ids of the servers
    const guilds = client.guilds.cache;
    const rest = new REST({ version: '9' }).setToken(process.env.TOKEN);

    for (const guild of guilds.values()) {
        try {
            await rest.put(
                Routes.applicationGuildCommands(process.env.CLIENT_ID, guild.id),
                { body: commands }
            );
            console.log(`Successfully updated commands for guild ${guild.id}`);
        } catch (error) {
            console.error(`Failed to register commands for guild ${guild.id}: ${error.message}`);
        }
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute({ client, interaction });
    } catch (error) {
        console.error(error);
        await interaction.reply({ content: "There was an error executing this command" });
    }
});

client.login(process.env.TOKEN);
