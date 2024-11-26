const db = require('../config/db.config');

const getSessionAccessKeyByDomain = async (storeDomain) => {
    try {
        const result = await db.query(
            `SELECT * FROM "Session" WHERE shop = $1`,
            [storeDomain]
        );
        if (result.rows.length === 0) {
            console.error("No session found for domain:", storeDomain);
            return null; // Return null if no session is found
        }
        
        const accessToken = result.rows[0].accessToken; // Access the accessToken
        console.log("Access Token retrieved:", accessToken);
        return accessToken; // Return the accessToken directly
    } catch (error) {
        console.error("Error retrieving shopify store access key by domain:", error.message);
        throw error;
    }
};

module.exports = {
    getSessionAccessKeyByDomain
};
