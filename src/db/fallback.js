const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');

// สร้าง data directory ถ้ายังไม่มี
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const FILES = {
  listings: path.join(DATA_DIR, 'listings.json'),
  sellers: path.join(DATA_DIR, 'sellers.json'),
  reviews: path.join(DATA_DIR, 'reviews.json'),
};

function readData(type) {
  const file = FILES[type];
  if (!file) throw new Error(`Unknown data type: ${type}`);
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, '[]', 'utf-8');
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return [];
  }
}

function writeData(type, data) {
  const file = FILES[type];
  if (!file) throw new Error(`Unknown data type: ${type}`);
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}

// ==================== LISTINGS ====================

function getAllListings() {
  return readData('listings');
}

function getListingById(id) {
  const listings = readData('listings');
  return listings.find((l) => l.id === id) || null;
}

function getListingsBySeller(sellerId) {
  const listings = readData('listings');
  return listings.filter((l) => l.seller_id === sellerId);
}

function addListing(listing) {
  const listings = readData('listings');
  listings.push(listing);
  writeData('listings', listings);
  // อัปเดต seller stats
  upsertSeller(listing.seller_id, listing.seller_name);
  return listing;
}

function updateListing(id, updates) {
  const listings = readData('listings');
  const idx = listings.findIndex((l) => l.id === id);
  if (idx === -1) return null;
  listings[idx] = { ...listings[idx], ...updates };
  writeData('listings', listings);
  return listings[idx];
}

function deleteListing(id) {
  const listings = readData('listings');
  const idx = listings.findIndex((l) => l.id === id);
  if (idx === -1) return false;
  listings.splice(idx, 1);
  writeData('listings', listings);
  return true;
}

// ==================== SELLERS ====================

function getAllSellers() {
  return readData('sellers');
}

function getSellerById(sellerId) {
  const sellers = readData('sellers');
  return sellers.find((s) => s.seller_id === sellerId) || null;
}

function upsertSeller(sellerId, sellerName) {
  const sellers = readData('sellers');
  const idx = sellers.findIndex((s) => s.seller_id === sellerId);
  const listings = getListingsBySeller(sellerId);

  if (idx === -1) {
    sellers.push({
      seller_id: sellerId,
      seller_name: sellerName,
      rating: 0,
      total_ratings: 0,
      total_listings: listings.length,
    });
  } else {
    sellers[idx].seller_name = sellerName;
    sellers[idx].total_listings = listings.length;
  }
  writeData('sellers', sellers);
}

function updateSellerRating(sellerId) {
  const reviews = getReviewsBySeller(sellerId);
  if (reviews.length === 0) return;
  const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

  const sellers = readData('sellers');
  const idx = sellers.findIndex((s) => s.seller_id === sellerId);
  if (idx !== -1) {
    sellers[idx].rating = Math.round(avg * 10) / 10;
    sellers[idx].total_ratings = reviews.length;
    writeData('sellers', sellers);
  }
}

// ==================== REVIEWS ====================

function getReviewsBySeller(sellerId) {
  const reviews = readData('reviews');
  return reviews.filter((r) => r.seller_id === sellerId);
}

function addReview(review) {
  const reviews = readData('reviews');
  reviews.push(review);
  writeData('reviews', reviews);
  // อัปเดตคะแนนเฉลี่ยของผู้ขาย
  updateSellerRating(review.seller_id);
  return review;
}

module.exports = {
  getAllListings,
  getListingById,
  getListingsBySeller,
  addListing,
  updateListing,
  deleteListing,
  getAllSellers,
  getSellerById,
  upsertSeller,
  updateSellerRating,
  getReviewsBySeller,
  addReview,
};
