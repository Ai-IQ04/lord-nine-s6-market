const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

const PORT = process.env.PORT || 3000;
const API_URL = `http://127.0.0.1:${PORT}`;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('delete-item')
        .setDescription('🗑️ ลบสินค้าของคุณ')
        .addStringOption((opt) =>
            opt.setName('id').setDescription('ID ของสินค้าที่ต้องการลบ').setRequired(true)
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        try {
            const itemId = interaction.options.getString('id');

            // ตรวจสอบว่าเป็นเจ้าของสินค้า
            const itemRes = await axios.get(`${API_URL}/api/listings/${itemId}`);
            const item = itemRes.data.data;

            if (item.seller_id !== interaction.user.id) {
                return interaction.editReply({
                    content: '🚫 คุณไม่ใช่เจ้าของสินค้านี้ ไม่สามารถลบได้',
                });
            }

            await axios.delete(`${API_URL}/api/listings/${itemId}`);

            const embed = new EmbedBuilder()
                .setTitle('🗑️ ลบสินค้าสำเร็จ')
                .setColor(0xed4245)
                .addFields(
                    { name: '📦 สินค้า', value: item.item_name, inline: true },
                    { name: '💰 ราคา', value: `฿${item.price.toLocaleString()}`, inline: true }
                )
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        } catch (error) {
            if (error.response && error.response.status === 404) {
                return interaction.editReply({ content: '❌ ไม่พบสินค้าที่มี ID นี้' });
            }
            console.error('Error deleting item:', error.message);
            return interaction.editReply({ content: '❌ เกิดข้อผิดพลาดในการลบสินค้า' });
        }
    },
};
