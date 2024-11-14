const userModel = require('../models/userModel');

// Register or log in a user
const registerUser = async (req, res) => {
    const { userId, email, name, businessName, businessUrl } = req.body;
  
    try {
      // Check if user already exists
      let user = await userModel.getUserById(userId);
      if (!user) {
        // Create user if not exists
        user = await userModel.createUser(userId, email, name, businessName, businessUrl);
      }
      console.log("success")
      return res.status(200).json(user);
    } catch (error) {
      console.error("Error creating or retrieving user:", error);
      return res.status(500).json({ error: "Internal server error" });
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
        return res.status(200).json(user);
    } catch (error) {
        console.error("Error retrieving user profile:", error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    registerUser,
    getUserProfile
};
