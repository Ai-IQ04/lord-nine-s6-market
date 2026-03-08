require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/fallback');
const { initSocket, emitEvent } = require('./socket');
const { upload } = require('./upload');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', '..', 'public')));
app.use('/uploads', express.static(path.join(__dirname, '..', '..', 'uploads')));

// Initialize Socket.io
initSocket(server);

// ==================== LISTINGS API ====================

// GET /api/listings — ดึงรายการสินค้าทั้งหมด (รองรับ sort, category, search, featured)
app.get('/api/listings', (req, res) => {
    try {
        let listings = db.getAllListings();

        // Filter by featured
        if (req.query.featured === 'true') {
            listings = listings.filter((l) => l.featured === true);
        }

        // Filter by category
        if (req.query.category) {
            listings = listings.filter(
                (l) => l.category && l.category.toLowerCase() === req.query.category.toLowerCase()
            );
        }

        // Search by name or description
        if (req.query.search) {
            const q = req.query.search.toLowerCase();
            listings = listings.filter(
                (l) =>
                    (l.item_name && l.item_name.toLowerCase().includes(q)) ||
                    (l.description && l.description.toLowerCase().includes(q))
            );
        }

        // Sort
        const sort = req.query.sort;
        if (sort === 'price_asc') {
            listings.sort((a, b) => a.price - b.price);
        } else if (sort === 'price_desc') {
            listings.sort((a, b) => b.price - a.price);
        } else {
            // default: newest first
            listings.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        }

        res.json({ success: true, data: listings });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/listings/featured
app.get('/api/listings/featured', (req, res) => {
    try {
        const listings = db.getAllListings().filter((l) => l.featured === true);
        listings.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        res.json({ success: true, data: listings });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/listings/:id
app.get('/api/listings/:id', (req, res) => {
    try {
        const listing = db.getListingById(req.params.id);
        if (!listing) return res.status(404).json({ success: false, error: 'Listing not found' });
        res.json({ success: true, data: listing });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/listings — สร้างรายการสินค้าใหม่
app.post('/api/listings', upload.single('image'), (req, res) => {
    try {
        const { item_name, price, category, description, seller_name, seller_id, featured } = req.body;

        if (!item_name || !price) {
            return res.status(400).json({ success: false, error: 'item_name and price are required' });
        }

        let image_url = req.body.image_url || '';
        if (req.file) {
            image_url = `/uploads/${req.file.filename}`;
        }

        const listing = {
            id: req.body.id || uuidv4(),
            item_name,
            price: parseFloat(price),
            category: category || 'อื่นๆ',
            description: description || '',
            image_url,
            seller_name: seller_name || 'Unknown',
            seller_id: seller_id || 'unknown',
            featured: featured === 'true' || featured === true,
            timestamp: new Date().toISOString(),
        };

        db.addListing(listing);
        emitEvent('new_listing', listing);
        res.status(201).json({ success: true, data: listing });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// PUT /api/listings/:id — อัปเดตรายการสินค้า
app.put('/api/listings/:id', (req, res) => {
    try {
        const updated = db.updateListing(req.params.id, req.body);
        if (!updated) return res.status(404).json({ success: false, error: 'Listing not found' });
        emitEvent('update_listing', updated);
        res.json({ success: true, data: updated });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// DELETE /api/listings/:id — ลบรายการสินค้า
app.delete('/api/listings/:id', (req, res) => {
    try {
        const deleted = db.deleteListing(req.params.id);
        if (!deleted) return res.status(404).json({ success: false, error: 'Listing not found' });
        emitEvent('delete_listing', { id: req.params.id });
        res.json({ success: true, message: 'Listing deleted' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==================== SELLERS API ====================

app.get('/api/sellers/:id', (req, res) => {
    try {
        const seller = db.getSellerById(req.params.id);
        if (!seller) return res.status(404).json({ success: false, error: 'Seller not found' });
        const listings = db.getListingsBySeller(req.params.id);
        const reviews = db.getReviewsBySeller(req.params.id);
        res.json({ success: true, data: { ...seller, listings, reviews } });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==================== REVIEWS API ====================

app.post('/api/reviews', (req, res) => {
    try {
        const { seller_id, buyer_id, buyer_name, rating, comment } = req.body;
        if (!seller_id || !rating) {
            return res.status(400).json({ success: false, error: 'seller_id and rating are required' });
        }

        const review = {
            review_id: uuidv4(),
            seller_id,
            buyer_id: buyer_id || 'anonymous',
            buyer_name: buyer_name || 'Anonymous',
            rating: Math.min(5, Math.max(1, parseInt(rating))),
            comment: comment || '',
            timestamp: new Date().toISOString(),
        };

        db.addReview(review);
        emitEvent('new_review', review);
        res.status(201).json({ success: true, data: review });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/reviews/:sellerId', (req, res) => {
    try {
        const reviews = db.getReviewsBySeller(req.params.sellerId);
        res.json({ success: true, data: reviews });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==================== BUY API (Discord Thread) ====================

// Discord Bot client สำหรับสร้าง thread
let discordClient = null;

function setDiscordClient(client) {
    discordClient = client;
}

app.post('/api/buy/:id', async (req, res) => {
    try {
        const listing = db.getListingById(req.params.id);
        if (!listing) {
            return res.status(404).json({ success: false, error: 'ไม่พบสินค้านี้' });
        }

        // ถ้ามี Discord Bot client ให้สร้าง thread จริง
        if (discordClient && process.env.DISCORD_GUILD_ID) {
            const guild = discordClient.guilds.cache.get(process.env.DISCORD_GUILD_ID);
            if (!guild) {
                return res.status(500).json({ success: false, error: 'ไม่พบ Discord Server' });
            }

            // หาช่องสำหรับสร้าง thread (ใช้ช่องแรกที่เป็น text channel หรือช่องที่ตั้งค่าไว้)
            const channelId = process.env.DISCORD_MARKETPLACE_CHANNEL || guild.systemChannelId;
            const channel = guild.channels.cache.get(channelId);

            if (!channel) {
                return res.status(500).json({ success: false, error: 'ไม่พบช่องแชท Discord' });
            }

            // สร้าง thread
            const thread = await channel.threads.create({
                name: `🛒 ${listing.item_name} — ติดต่อผู้ขาย ${listing.seller_name}`,
                autoArchiveDuration: 1440, // archive หลัง 24 ชม.
                reason: `ผู้ซื้อสนใจสินค้า: ${listing.item_name}`,
            });

            // ส่งข้อความเริ่มต้นใน thread
            const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

            const embed = new EmbedBuilder()
                .setTitle(`🛒 สนใจซื้อ: ${listing.item_name}`)
                .setColor(0x6366f1)
                .addFields(
                    { name: '📦 สินค้า', value: listing.item_name, inline: true },
                    { name: '💰 ราคา', value: `฿${Number(listing.price).toLocaleString()}`, inline: true },
                    { name: '📂 หมวดหมู่', value: listing.category, inline: true },
                    { name: '📝 รายละเอียด', value: listing.description || '-' },
                    { name: '👤 ผู้ขาย', value: `<@${listing.seller_id}>`, inline: true }
                )
                .setTimestamp();

            if (listing.image_url) {
                const fullImageUrl = listing.image_url.startsWith('http')
                    ? listing.image_url
                    : `${process.env.API_URL || 'http://localhost:3000'}${listing.image_url}`;
                embed.setThumbnail(fullImageUrl);
            }

            // ปุ่มปิด thread
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('close_thread')
                    .setLabel('🔒 ปิดเธรด (จบการสนทนา)')
                    .setStyle(ButtonStyle.Danger)
            );

            await thread.send({
                content: `<@${listing.seller_id}> มีผู้สนใจสินค้าของคุณ! กรุณาตอบกลับในเธรดนี้`,
                embeds: [embed],
                components: [row],
            });

            const threadUrl = `https://discord.com/channels/${guild.id}/${thread.id}`;
            return res.json({ success: true, data: { thread_id: thread.id, thread_url: threadUrl } });
        } else {
            // ไม่มี Discord Bot → สร้าง URL invite ตรงไปที่ server แทน
            const guildId = process.env.DISCORD_GUILD_ID || 'GUILD_ID';
            const fallbackUrl = `https://discord.com/channels/${guildId}`;
            return res.json({
                success: true,
                data: {
                    thread_id: null,
                    thread_url: fallbackUrl,
                    message: 'Discord Bot ไม่ได้เชื่อมต่อ — กรุณาติดต่อผู้ขายใน Discord โดยตรง'
                }
            });
        }
    } catch (err) {
        console.error('Buy API error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==================== START SERVER ====================

server.listen(PORT, () => {
    console.log(`🚀 Marketplace API running at http://localhost:${PORT}`);
    console.log(`📂 Frontend at http://localhost:${PORT}`);
});

module.exports = { app, server, setDiscordClient };
