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
    ],
});

// เผื่อมี error ที่คาดไม่ถึง
process.on('unhandledRejection', error => {
    console.error('🔥 Unhandled promise rejection:', error);
});

// โหลด commands จากโฟลเดอร์ commands/
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'bot', 'commands');

console.log('📂 Loading commands...');
if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter((f) => f.endsWith('.js'));
    for (const file of commandFiles) {
        try {
            const command = require(path.join(commandsPath, file));
            if (command.data && command.execute) {
                client.commands.set(command.data.name, command);
                console.log(`✅ Loaded command: /${command.data.name}`);
            }
        } catch (error) {
            console.error(`❌ Failed to load command ${file}:`, error.message);
        }
    }
} else {
    console.error('❌ Commands directory not found:', commandsPath);
}

// Event: Bot พร้อมใช้งาน
client.once('ready', () => {
    console.log(`🤖 Bot is online as ${client.user.tag}`);
    console.log(`📡 Serving ${client.guilds.cache.size} guilds`);
    // ส่ง Discord client ไปให้ API server (same process!)
    setDiscordClient(client);
    console.log('🔗 Discord client linked to API server');
});

// Event: รับ interaction (slash commands + buttons)
client.on('interactionCreate', async (interaction) => {
    console.log(`📩 Incoming interaction: ${interaction.type} (ID: ${interaction.id})`);

    // Handle button interactions (ปุ่มปิดเธรด)
    if (interaction.isButton()) {
        console.log(`🔘 Button clicked: ${interaction.customId}`);
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
                console.error('❌ Error closing thread:', error);
                if (!interaction.replied) {
                    await interaction.reply({
                        content: '❌ เกิดข้อผิดพลาดในการปิดเธรด',
                        ephemeral: true,
                    }).catch(() => { });
                }
            }
        }
        return;
    }

    // Handle slash commands
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) {
        console.warn(`⚠️ Command not found: ${interaction.commandName}`);
        await interaction.reply({ content: '⚠️ ไม่พบคำสั่งนี้ในระบบ', ephemeral: true }).catch(() => { });
        return;
    }

    try {
        console.log(`📡 Executing command: /${interaction.commandName} by ${interaction.user.tag}`);
        await command.execute(interaction);
        console.log(`✅ Finished executing: /${interaction.commandName}`);
    } catch (error) {
        console.error(`❌ Error executing /${interaction.commandName}:`, error);

        // ส่งข้อความแจ้งเตือนข้อผิดพลาด (ถ้ายังไม่มีการตอบกลับ/defer)
        const errorMessage = {
            content: '❌ เกิดข้อผิดพลาดในการดำเนินการคำสั่ง กรุณาลองใหม่ภายหลัง',
            ephemeral: true,
        };

        try {
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply(errorMessage);
            } else {
                await interaction.reply(errorMessage);
            }
        } catch (err) {
            console.error('Failed to send error reply:', err.message);
        }
    }
});

const PORT = process.env.PORT || 3000;
const API_URL = `http://127.0.0.1:${PORT}`; // บอทคุยกับ API ภายในเครื่องเสมอ (fastest)

// Login Discord Bot
const token = process.env.DISCORD_TOKEN;
if (token) {
    console.log('🚀 Logging in to Discord...');
    client.login(token).catch(err => {
        console.error('❌ Discord login failed:', err.message);
    });
} else {
    console.warn('⚠️ DISCORD_TOKEN not set — Bot will not start, API server only');
}
