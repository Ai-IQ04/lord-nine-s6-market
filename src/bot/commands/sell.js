const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const axios = require('axios');
const FormData = require('form-data');
const { checkScam } = require('../utils/antiScam');

const API_URL = process.env.API_URL || 'http://localhost:3000';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sell')
        .setDescription('📦 ลงขายสินค้าบน Marketplace')
        .addStringOption((opt) =>
            opt.setName('name').setDescription('ชื่อสินค้า').setRequired(true)
        )
        .addNumberOption((opt) =>
            opt.setName('price').setDescription('ราคา (บาท)').setRequired(true)
        )
        .addStringOption((opt) =>
            opt
                .setName('category')
                .setDescription('หมวดหมู่')
                .setRequired(true)
                .addChoices(
                    { name: '🧙 ตัวละคร', value: 'ตัวละคร' },
                    { name: '⚔️ Item', value: 'Item' },
                    { name: '💎 รับซื้อเพรช', value: 'รับซื้อเพรช' }
                )
        )
        .addStringOption((opt) =>
            opt.setName('description').setDescription('รายละเอียดสินค้า').setRequired(false)
        )
        .addAttachmentOption((opt) =>
            opt.setName('image').setDescription('รูปภาพสินค้า').setRequired(false)
        ),

    async execute(interaction) {
        await interaction.deferReply();

        const name = interaction.options.getString('name');
        const price = interaction.options.getNumber('price');
        const category = interaction.options.getString('category');
        const description = interaction.options.getString('description') || '';
        const imageAttachment = interaction.options.getAttachment('image');

        // ตรวจสอบ Anti-scam
        const scamResult = checkScam(description + ' ' + name);
        if (scamResult.blocked) {
            return interaction.editReply({
                content: `🚫 ตรวจพบเนื้อหาต้องสงสัย: ${scamResult.reason}`,
            });
        }

        try {
            let image_url = '';

            // อัปโหลดรูปภาพถ้ามี
            if (imageAttachment) {
                const imageResponse = await axios.get(imageAttachment.url, {
                    responseType: 'arraybuffer',
                });

                const form = new FormData();
                form.append('image', Buffer.from(imageResponse.data), {
                    filename: imageAttachment.name,
                    contentType: imageAttachment.contentType,
                });
                form.append('item_name', name);
                form.append('price', String(price));
                form.append('category', category);
                form.append('description', description);
                form.append('seller_name', interaction.user.displayName || interaction.user.username);
                form.append('seller_id', interaction.user.id);

                const res = await axios.post(`${API_URL}/api/listings`, form, {
                    headers: form.getHeaders(),
                });

                image_url = res.data.data.image_url;

                // สร้าง Embed
                const embed = new EmbedBuilder()
                    .setTitle(`✅ ลงขายสำเร็จ!`)
                    .setColor(0x00d166)
                    .addFields(
                        { name: '📦 สินค้า', value: name, inline: true },
                        { name: '💰 ราคา', value: `฿${price.toLocaleString()}`, inline: true },
                        { name: '📂 หมวดหมู่', value: category, inline: true },
                        { name: '📝 รายละเอียด', value: description || '-' }
                    )
                    .setImage(imageAttachment.url)
                    .setFooter({ text: `โดย ${interaction.user.displayName || interaction.user.username}` })
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });
            } else {
                // ไม่มีรูปภาพ
                const res = await axios.post(`${API_URL}/api/listings`, {
                    item_name: name,
                    price,
                    category,
                    description,
                    seller_name: interaction.user.displayName || interaction.user.username,
                    seller_id: interaction.user.id,
                });

                const embed = new EmbedBuilder()
                    .setTitle(`✅ ลงขายสำเร็จ!`)
                    .setColor(0x00d166)
                    .addFields(
                        { name: '📦 สินค้า', value: name, inline: true },
                        { name: '💰 ราคา', value: `฿${price.toLocaleString()}`, inline: true },
                        { name: '📂 หมวดหมู่', value: category, inline: true },
                        { name: '📝 รายละเอียด', value: description || '-' }
                    )
                    .setFooter({ text: `โดย ${interaction.user.displayName || interaction.user.username}` })
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });
            }
        } catch (error) {
            console.error('Error creating listing:', error.message);
            return interaction.editReply({
                content: '❌ เกิดข้อผิดพลาดในการลงขายสินค้า กรุณาลองใหม่อีกครั้ง',
            });
        }
    },
};
