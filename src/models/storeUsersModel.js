const db = require('../config/db.config');

const addUserToStore = async (storeId, userId, role) => {
    try {
        const result = await db.query(
        `INSERT INTO store_users (store_id, user_id, role)
            VALUES ($1, $2, $3)
            RETURNING *`,
        [storeId, userId, role]
        );
        return result.rows[0];
    } catch (error) {
        console.error("Error adding user to store:", error.message);
        throw error;
    }
};
  
const getStoreUser = async (storeDomain, userId) => {
    try {
        const result = await db.query(
        `SELECT su.* 
            FROM store_users su
            JOIN stores s ON su.store_id = s.store_id
            WHERE s.store_domain = $1 AND su.user_id = $2`,
        [storeDomain, userId]
        );
        return result.rows[0]; // Return the relationship if found, or undefined if not
    } catch (error) {
        console.error("Error retrieving store-user relationship:", error.message);
        throw error;
    }
};
  
module.exports = {
    addUserToStore,
    getStoreUser
};