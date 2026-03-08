require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');

// ===== 1. Start API Server =====
const { app, server, setDiscordClient } = require('./api/server');

// ===== 2. Start Discord Bot =====
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// โหลด commands จากโฟลเดอร์ commands/
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'bot', 'commands');

if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter((f) => f.endsWith('.js'));
    for (const file of commandFiles) {
        const command = require(path.join(commandsPath, file));
        if (command.data && command.execute) {
            client.commands.set(command.data.name, command);
            console.log(`✅ Loaded command: /${command.data.name}`);
        }
    }
}

// Event: Bot พร้อมใช้งาน
client.once('ready', () => {
    console.log(`🤖 Bot is online as ${client.user.tag}`);
    // ส่ง Discord client ไปให้ API server (same process!)
    setDiscordClient(client);
    console.log('🔗 Discord client linked to API server');
});

// Event: รับ interaction (slash commands + buttons)
client.on('interactionCreate', async (interaction) => {
    // Handle button interactions (ปุ่มปิดเธรด)
    if (interaction.isButton()) {
        if (interaction.customId === 'close_thread') {
            try {
                const thread = interaction.channel;
                if (thread && thread.isThread()) {
                    await interaction.reply({
                        content: '🔒 เธรดนี้ถูกปิดแล้ว ขอบคุณที่ใช้บริการ Lord Nine S6 Market!',
                    });
                    await thread.setArchived(true);
                } else {
                    await interaction.reply({
                        content: '⚠️ สามารถใช้ปุ่มนี้ได้ในเธรดเท่านั้น',
                        ephemeral: true,
                    });
                }
            } catch (error) {
                console.error('Error closing thread:', error);
                await interaction.reply({
                    content: '❌ เกิดข้อผิดพลาดในการปิดเธรด',
                    ephemeral: true,
                });
            }
        }
        return;
    }

    // Handle slash commands
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        // Defer reply for all slash commands
        await interaction.deferReply({ ephemeral: true });
        await command.execute(interaction);
    } catch (error) {
        console.error(`❌ Error executing /${interaction.commandName}:`, error);
        const reply = {
            content: '❌ เกิดข้อผิดพลาดในการดำเนินการคำสั่ง',
            ephemeral: true,
        };
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(reply);
        } else {
            await interaction.reply(reply);
        }
    }
});

// Login Discord Bot
const token = process.env.DISCORD_TOKEN;
if (token) {
    client.login(token);
} else {
    console.warn('⚠️ DISCORD_TOKEN not set — Bot will not start, API server only');
}
