const userModel = require('../models/userModel');

// Register or log in a user
const registerUser = async (req, res) => {
    const { userId, email, name, businessName, businessUrl } = req.body;
    console.log(req.body)
  
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

const { Storage } = require('@google-cloud/storage');

// Initialize Google Cloud Storage
const storage = new Storage({ keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS });
const bucketName = 'portal-prints-profile-pictures';

const uploadProfilePicture = async (req, res) => {
  try {
    const userId = req.body.userId; // User ID from the frontend
    const file = req.file; // File from Multer middleware

    if (!userId || !file) {
      return res.status(400).json({ error: 'User ID and file are required.' });
    }

    // Use a consistent file name to overwrite the old one
    const fileName = `profile-pictures/${userId}/profile-picture.jpg`; // Fixed name

    const bucket = storage.bucket(bucketName);
    const blob = bucket.file(fileName);
    const blobStream = blob.createWriteStream({
      resumable: false,
      contentType: file.mimetype,
    });

    blobStream.on('error', (err) => {
      console.error('Upload error:', err);
      res.status(500).json({ error: 'Failed to upload file.' });
    });

    blobStream.on('finish', async () => {
      try {
        const publicUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;
        
        // Update the user's profile image URL in the database
        await userModel.updateProfilePicture(userId, publicUrl);

        res.status(200).json({ message: 'Profile picture uploaded successfully.', url: publicUrl });
      } catch (error) {
        console.error('Error updating profile picture:', error);
        res.status(500).json({ error: 'Failed to update profile picture in the database.' });
      }
    });

    blobStream.end(file.buffer);
  } catch (error) {
    console.error('Error in uploadProfilePicture:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};



module.exports = {
    registerUser,
    getUserProfile,
    uploadProfilePicture,
};
