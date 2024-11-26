const db = require('../config/db.config');

// Create a new user in the database if they don’t already exist
const createUser = async (userId, email, name, businessName = '', businessUrl = '') => {
    const result = await db.query(
        `INSERT INTO users (user_id, email, name, business_name, business_url)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id) DO NOTHING
         RETURNING *`,
        [userId, email, name, businessName, businessUrl]
    );
    return result.rows[0];
};

// Retrieve a user by their user_id (Firebase UID)
const getUserById = async (userId) => {
    const result = await db.query(
        'SELECT * FROM users WHERE user_id = $1',
        [userId]
    );
    return result.rows[0];
};

const updateProfilePicture = async (userId, profileImageUrl) => {
    console.log("profileimageURL:", profileImageUrl)
    console.log("userID:", userId)
    const result = await db.query(
        `UPDATE users
         SET profile_image_url = $1
         WHERE user_id = $2
         RETURNING *`,
        [profileImageUrl, userId]
    );
    return result.rows[0];
};

module.exports = {
    createUser,
    getUserById,
    updateProfilePicture
};