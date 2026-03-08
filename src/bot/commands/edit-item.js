const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:3000';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('edit-item')
        .setDescription('✏️ แก้ไขข้อมูลสินค้า')
        .addStringOption((opt) =>
            opt.setName('id').setDescription('ID ของสินค้าที่ต้องการแก้ไข').setRequired(true)
        )
        .addStringOption((opt) =>
            opt.setName('name').setDescription('ชื่อสินค้าใหม่').setRequired(false)
        )
        .addNumberOption((opt) =>
            opt.setName('price').setDescription('ราคาใหม่ (บาท)').setRequired(false)
        )
        .addStringOption((opt) =>
            opt
                .setName('category')
                .setDescription('หมวดหมู่ใหม่')
                .setRequired(false)
                .addChoices(
                    { name: '🧙 ตัวละคร', value: 'ตัวละคร' },
                    { name: '⚔️ Item', value: 'Item' },
                    { name: '💎 รับซื้อเพรช', value: 'รับซื้อเพรช' }
                )
        )
        .addStringOption((opt) =>
            opt.setName('description').setDescription('รายละเอียดใหม่').setRequired(false)
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const itemId = interaction.options.getString('id');
        const name = interaction.options.getString('name');
        const price = interaction.options.getNumber('price');
        const category = interaction.options.getString('category');
        const description = interaction.options.getString('description');

        try {
            // ตรวจสอบว่าเป็นเจ้าของ
            const itemRes = await axios.get(`${API_URL}/api/listings/${itemId}`);
            const item = itemRes.data.data;

            if (item.seller_id !== interaction.user.id) {
                return interaction.editReply({
                    content: '🚫 คุณไม่ใช่เจ้าของสินค้านี้ ไม่สามารถแก้ไขได้',
                });
            }

            const updates = {};
            if (name) updates.item_name = name;
            if (price !== null) updates.price = price;
            if (category) updates.category = category;
            if (description) updates.description = description;

            if (Object.keys(updates).length === 0) {
                return interaction.editReply({
                    content: '⚠️ กรุณาระบุข้อมูลที่ต้องการแก้ไขอย่างน้อย 1 อย่าง',
                });
            }

            const res = await axios.put(`${API_URL}/api/listings/${itemId}`, updates);
            const updated = res.data.data;

            const embed = new EmbedBuilder()
                .setTitle('✏️ แก้ไขสินค้าสำเร็จ')
                .setColor(0xfee75c)
                .addFields(
                    { name: '📦 สินค้า', value: updated.item_name, inline: true },
                    { name: '💰 ราคา', value: `฿${updated.price.toLocaleString()}`, inline: true },
                    { name: '📂 หมวดหมู่', value: updated.category, inline: true },
                    { name: '📝 รายละเอียด', value: updated.description || '-' }
                )
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        } catch (error) {
            if (error.response && error.response.status === 404) {
                return interaction.editReply({ content: '❌ ไม่พบสินค้าที่มี ID นี้' });
            }
            console.error('Error editing item:', error.message);
            return interaction.editReply({ content: '❌ เกิดข้อผิดพลาดในการแก้ไขสินค้า' });
        }
    },
};
