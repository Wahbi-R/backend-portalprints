const userModel = require('../models/userModel');

// Register or log in a user
const registerUser = async (req, res) => {
    const { userId } = req;
    const { email, name, businessName, businessUrl } = req.body;  // Use data from the request body

    try {
        // Check if user already exists, create if not
        let user = await userModel.getUserById(userId);
        if (!user) {
            user = await userModel.createUser(userId, email, name, businessName, businessUrl);
        }
        res.status(200).json(user);
    } catch (error) {
        console.error("Error creating or retrieving user:", error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Retrieve user profile by user ID (Firebase UID)
const getUserProfile = async (req, res) => {
    const { userId } = req;

    try {
        const user = await userModel.getUserById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.status(200).json(user);
    } catch (error) {
        console.error("Error retrieving user profile:", error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    registerUser,
    getUserProfile
};
