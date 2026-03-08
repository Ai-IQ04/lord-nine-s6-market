require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
    ],
});

// โหลด commands จากโฟลเดอร์ commands/
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');

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

    // ส่ง Discord client ไปให้ API server เพื่อใช้สร้าง thread
    try {
        const { setDiscordClient } = require('../api/server');
        if (setDiscordClient) {
            setDiscordClient(client);
            console.log('🔗 Discord client linked to API server');
        }
    } catch (err) {
        console.log('ℹ️ API server not loaded in bot process (standalone mode)');
    }
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
                        content: '🔒 เธรดนี้ถูกปิดแล้ว ขอบคุณที่ใช้บริการ Marketplace!',
                    });
                    // Archive + Lock thread
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

// Login
const token = process.env.DISCORD_TOKEN;
if (!token) {
    console.error('❌ DISCORD_TOKEN is not set in .env file');
    process.exit(1);
}
client.login(token);
