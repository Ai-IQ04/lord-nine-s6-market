const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

const PORT = process.env.PORT || 3000;
const API_URL = `http://localhost:${PORT}`;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('my-items')
        .setDescription('📋 ดูรายการสินค้าทั้งหมดของคุณ'),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        try {
            const res = await axios.get(`${API_URL}/api/listings`);
            const myItems = res.data.data.filter((l) => l.seller_id === interaction.user.id);

            if (myItems.length === 0) {
                return interaction.editReply({ content: '📭 คุณยังไม่มีสินค้าลงขาย' });
            }

            const embed = new EmbedBuilder()
                .setTitle(`📦 สินค้าของ ${interaction.user.displayName || interaction.user.username}`)
                .setColor(0x5865f2)
                .setDescription(`ทั้งหมด ${myItems.length} รายการ`)
                .setTimestamp();

            myItems.slice(0, 25).forEach((item, i) => {
                embed.addFields({
                    name: `${i + 1}. ${item.item_name}`,
                    value: `💰 ฿${item.price.toLocaleString()} | 📂 ${item.category}\n🆔 \`${item.id}\``,
                });
            });

            return interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Error fetching items:', error.message);
            return interaction.editReply({ content: '❌ ไม่สามารถดึงข้อมูลได้' });
        }
    },
};
