const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

const PORT = process.env.PORT || 3000;
const API_URL = `http://localhost:${PORT}`;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rate-seller')
        .setDescription('⭐ ให้คะแนนผู้ขาย')
        .addUserOption((opt) =>
            opt.setName('seller').setDescription('ผู้ขายที่ต้องการให้คะแนน').setRequired(true)
        )
        .addIntegerOption((opt) =>
            opt
                .setName('rating')
                .setDescription('คะแนน 1-5 ดาว')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(5)
        )
        .addStringOption((opt) =>
            opt.setName('comment').setDescription('ความคิดเห็น').setRequired(false)
        ),

    async execute(interaction) {
        await interaction.deferReply();

        const seller = interaction.options.getUser('seller');
        const rating = interaction.options.getInteger('rating');
        const comment = interaction.options.getString('comment') || '';

        // ป้องกันรีวิวตัวเอง
        if (seller.id === interaction.user.id) {
            return interaction.editReply({ content: '🚫 คุณไม่สามารถให้คะแนนตัวเองได้' });
        }

        try {
            const res = await axios.post(`${API_URL}/api/reviews`, {
                seller_id: seller.id,
                buyer_id: interaction.user.id,
                buyer_name: interaction.user.displayName || interaction.user.username,
                rating,
                comment,
            });

            const stars = '⭐'.repeat(rating) + '☆'.repeat(5 - rating);

            const embed = new EmbedBuilder()
                .setTitle('⭐ รีวิวสำเร็จ!')
                .setColor(0xfee75c)
                .addFields(
                    { name: '👤 ผู้ขาย', value: seller.displayName || seller.username, inline: true },
                    { name: '🌟 คะแนน', value: stars, inline: true },
                    { name: '💬 ความคิดเห็น', value: comment || '-' }
                )
                .setFooter({
                    text: `รีวิวโดย ${interaction.user.displayName || interaction.user.username}`,
                })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Error rating seller:', error.message);
            return interaction.editReply({ content: '❌ เกิดข้อผิดพลาดในการให้คะแนน' });
        }
    },
};
