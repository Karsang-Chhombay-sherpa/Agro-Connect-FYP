const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/User");
const Farmer = require("../models/Farmer");
const Admin = require("../models/Admin");
const Otp = require("../models/Otp");
const bcrypt = require("bcryptjs");
const { sendOtp, sendRegistrationOtp } = require("../utils/sendEmail");
const router = express.Router();

// Password validation regex: 8-30 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char (!@#$%^&*), no whitespace
const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,30}$/;

const validatePassword = (password) => {
  if (!password) {
    return "Password is required";
  }
  if (!PASSWORD_REGEX.test(password)) {
    return "Password must be 8-30 characters, contain at least one uppercase, one lowercase, one number, one special character (!@#$%^&*), and no whitespace";
  }
  return null;
};

// USER REGISTRATION (create unverified user in DB)
router.post("/register", async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ message: "All fields are required" });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }
    // Block only if user account already exists (allow same email for farmer account)
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        message:
          "User account already exists with this email. Please login instead.",
      });
    }
    const hashedPwd = await bcrypt.hash(password, 10);
    // Create unverified user
    await User.create({
      email,
      password: hashedPwd,
      firstName,
      lastName,
      verified: false,
    });
    // OTP
    const otp = "" + Math.floor(100000 + Math.random() * 900000);
    await Otp.deleteMany({ email });
    await Otp.create({ email, otp });
    try {
      await sendRegistrationOtp(email, otp);
    } catch (emailError) {
      await User.deleteOne({ email });
      await Otp.deleteMany({ email });
      return res.status(500).json({
        message:
          "Failed to send OTP email. Please check your email configuration.",
      });
    }
    res.json({ message: "OTP sent to email. Please check your inbox." });
  } catch (error) {
    console.error("Registration error:", error);
    res
      .status(500)
      .json({ message: "Server error during registration. Please try again." });
  }
});

// FARMER REGISTRATION (create unverified farmer in separate Farmer collection)
router.post("/farmer-register", async (req, res) => {
  try {
    const { email, password, firstName, lastName, farmName, location, latitude, longitude } =
      req.body;
    if (
      !email ||
      !password ||
      !firstName ||
      !lastName ||
      !farmName ||
      !location
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }
    
    // Validate coordinates if provided
    if (latitude !== undefined && longitude !== undefined) {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      
      if (isNaN(lat) || isNaN(lng)) {
        return res.status(400).json({ message: "Invalid coordinates provided" });
      }
      
      if (lat < -90 || lat > 90) {
        return res.status(400).json({ message: "Latitude must be between -90 and 90" });
      }
      
      if (lng < -180 || lng > 180) {
        return res.status(400).json({ message: "Longitude must be between -180 and 180" });
      }
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }
    // Block only if farmer account already exists (allow same email for user account)
    const existingFarmer = await Farmer.findOne({ email });
    if (existingFarmer) {
      return res.status(400).json({
        message:
          "Farmer account already exists with this email. Please login instead.",
      });
    }
    const hashedPwd = await bcrypt.hash(password, 10);
    
    // Prepare farmer data
    const farmerData = {
      email: email.toLowerCase().trim(),
      password: hashedPwd,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      farmName: farmName.trim(),
      location: location.trim(),
      profilePicture: "", // Initialize as empty string
      description: "", // Initialize as empty string
      verified: false,
    };
    
    // Add geoLocation if coordinates provided
    if (latitude !== undefined && longitude !== undefined) {
      farmerData.geoLocation = {
        type: "Point",
        coordinates: [parseFloat(longitude), parseFloat(latitude)] // [lng, lat]
      };
    }
    
    // Create unverified farmer in Farmer collection with all fields
    const newFarmer = await Farmer.create(farmerData);

    console.log(
      `Farmer registered: ${newFarmer._id} - ${newFarmer.email} - ${newFarmer.farmName}${newFarmer.geoLocation ? ' (with location)' : ''}`
    );
    const otp = "" + Math.floor(100000 + Math.random() * 900000);
    await Otp.deleteMany({ email });
    await Otp.create({ email, otp });
    try {
      await sendRegistrationOtp(email, otp);
    } catch (emailError) {
      await Farmer.deleteOne({ email });
      await Otp.deleteMany({ email });
      return res.status(500).json({
        message:
          "Failed to send OTP email. Please check your email configuration.",
      });
    }
    res.json({ message: "OTP sent to email. Please check your inbox." });
  } catch (error) {
    console.error("Farmer Registration error:", error);
    res.status(500).json({
      message: "Server error during farmer registration. Please try again.",
    });
  }
});

// OTP VERIFICATION: If OTP matches, verify user or farmer
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp)
      return res.status(400).json({ message: "Email and OTP are required" });
    if (otp.length !== 6 || !/^\d{6}$/.test(otp))
      return res.status(400).json({ message: "OTP must be a 6-digit number" });

    // Verify OTP first
    const otpRecord = await Otp.findOne({ email, otp });
    if (!otpRecord) {
      return res.status(400).json({
        message:
          "Invalid or expired OTP. Please check your email or request a new OTP.",
      });
    }

    // Check both User and Farmer collections for unverified accounts
    const user = await User.findOne({ email, verified: false });
    const farmer = await Farmer.findOne({ email, verified: false });

    if (!user && !farmer) {
      // Check if accounts exist but are already verified
      const verifiedUser = await User.findOne({ email, verified: true });
      const verifiedFarmer = await Farmer.findOne({ email, verified: true });
      if (verifiedUser || verifiedFarmer) {
        await Otp.deleteMany({ email });
        return res
          .status(400)
          .json({ message: "Account already verified. Please login instead." });
      }
      return res.status(400).json({
        message:
          "No registration in progress for this email. Please register again.",
      });
    }

    // Verify the unverified account(s) - prioritize farmer if both exist
    let verifiedAccount = null;
    if (farmer) {
      farmer.verified = true;
      farmer.updatedAt = Date.now(); // Update timestamp
      await farmer.save();
      verifiedAccount = farmer;
      console.log(`Farmer verified: ${farmer.email} - ${farmer.farmName}`);
    } else if (user) {
      user.verified = true;
      await user.save();
      verifiedAccount = user;
      console.log(`User verified: ${user.email}`);
    }

    await Otp.deleteMany({ email });

    // Return appropriate response based on account type
    if (verifiedAccount && farmer) {
      // Return all farmer fields (except password) for proper data storage
      const { password: _pwd, ...farmerData } = farmer.toObject();
      farmerData.userType = "farmer";

      res.json({
        message: "Farmer registered successfully",
        user: farmerData, // Include all fields: firstName, lastName, email, farmName, location, profilePicture, description, verified, createdAt, updatedAt
      });
    } else if (verifiedAccount && user) {
      // Return all user fields (except password) for proper data storage
      const { password: _pwd, ...userData } = user.toObject();
      userData.userType = "user";

      res.json({
        message: "User registered successfully",
        user: userData, // Include all user fields
      });
    }
  } catch (error) {
    console.error("OTP verification error:", error);
    res.status(500).json({
      message: "Server error during OTP verification. Please try again.",
    });
  }
});

// Forgot Password - Send OTP
router.post("/forgot-password", async (req, res) => {
  try {
    const { email, accountType } = req.body;

    if (!email || !accountType) {
      return res
        .status(400)
        .json({ message: "Email and account type are required." });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    // Check if account exists
    let account = null;
    if (accountType === "user") {
      account = await User.findOne({ email });
    } else if (accountType === "farmer") {
      account = await Farmer.findOne({ email });
    } else {
      return res
        .status(400)
        .json({ message: "Invalid account type. Must be 'user' or 'farmer'." });
    }

    if (!account) {
      return res
        .status(404)
        .json({ message: "No account found with this email." });
    }

    if (!account.verified) {
      return res.status(400).json({
        message: "Account not verified. Please verify your account first.",
      });
    }

    // Generate 6-digit OTP
    const otp = "" + Math.floor(100000 + Math.random() * 900000);

    // Delete any existing OTPs for this email
    await Otp.deleteMany({ email });

    // Create new OTP
    await Otp.create({ email, otp });

    // Send OTP email
    try {
      await sendOtp(email, otp);
      console.log(`Password reset OTP sent successfully to ${email}`);
    } catch (emailError) {
      console.error("Failed to send email:", emailError);
      await Otp.deleteMany({ email });
      // Provide more detailed error message
      const errorMessage = emailError.message || "Failed to send OTP email";
      return res.status(500).json({
        message: `Failed to send OTP email: ${errorMessage}. Please check your email configuration in the backend.`,
      });
    }

    res.json({
      success: true,
      message: "OTP sent to your email. Please check your inbox.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({
      message: "Server error during password reset request. Please try again.",
    });
  }
});

// Reset Password - Verify OTP and Update Password
router.post("/reset-password", async (req, res) => {
  try {
    const { email, otp, newPassword, accountType } = req.body;

    if (!email || !otp || !newPassword || !accountType) {
      return res.status(400).json({ message: "All fields are required." });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    // Validate OTP format
    if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({ message: "OTP must be a 6-digit number" });
    }

    // Validate password
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }

    // Verify OTP
    const otpRecord = await Otp.findOne({ email, otp });
    if (!otpRecord) {
      return res.status(400).json({
        message:
          "Invalid or expired OTP. Please check your email or request a new OTP.",
      });
    }

    // Find account
    let account = null;
    if (accountType === "user") {
      account = await User.findOne({ email });
    } else if (accountType === "farmer") {
      account = await Farmer.findOne({ email });
    } else {
      return res.status(400).json({ message: "Invalid account type." });
    }

    if (!account) {
      return res.status(404).json({ message: "Account not found." });
    }

    // Check if new password is the same as old password
    const isSamePassword = await bcrypt.compare(newPassword, account.password);
    if (isSamePassword) {
      return res.status(400).json({
        message: "New password must be different from your current password.",
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    account.password = hashedPassword;
    await account.save();

    // Clean up OTP
    await Otp.deleteMany({ email });

    res.json({
      success: true,
      message:
        "Password reset successfully. You can now login with your new password.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({
      message: "Server error during password reset. Please try again.",
    });
  }
});

router.post("/login", async (req, res) => {
  const { email, password, accountType } = req.body;

  // Validate accountType
  if (accountType && accountType !== "user" && accountType !== "farmer" && accountType !== "admin") {
    return res
      .status(400)
      .json({ message: "Invalid account type." });
  }

  let account = null;
  let foundAccountType = null;

  if (accountType === "admin") {
    account = await Admin.findOne({ email });
    foundAccountType = "admin";
    if (!account) {
      return res.status(400).json({ message: "No admin account found with this email." });
    }
    const validPwd = await bcrypt.compare(password, account.password);
    if (!validPwd) {
      return res.status(400).json({ message: "Incorrect password." });
    }
    const { password: _pwd, ...accountData } = account.toObject();
    accountData.userType = "admin";
    return res.json({ success: true, user: accountData });
  }

  if (accountType === "user") {
    account = await User.findOne({ email });
    foundAccountType = "user";
  } else if (accountType === "farmer") {
    account = await Farmer.findOne({ email });
    foundAccountType = "farmer";
  } else {
    // If no accountType specified, check both (backward compatibility)
    const user = await User.findOne({ email });
    const farmer = await Farmer.findOne({ email });

    if (!user && !farmer) {
      return res
        .status(400)
        .json({ message: "No account found with this email." });
    }

    if (farmer) {
      account = farmer;
      foundAccountType = "farmer";
    } else {
      account = user;
      foundAccountType = "user";
    }
  }

  if (!account) {
    return res.status(400).json({
      message: `No ${accountType || "account"} found with this email.`,
    });
  }

  if (!account.verified) {
    return res.status(400).json({
      message:
        "Account not verified. Please check your email for the OTP and complete registration.",
    });
  }

  const validPwd = await bcrypt.compare(password, account.password);
  if (!validPwd) {
    return res.status(400).json({ message: "Incorrect password." });
  }

  // Return all account data except password, ensuring all fields are included
  const { password: _pwd, ...accountData } = account.toObject();
  accountData.userType = foundAccountType;

  // Log successful login with account details (without password)
  console.log(`Login successful: ${accountData.email} (${foundAccountType})`);
  if (foundAccountType === "farmer") {
    console.log(
      `Farmer details: ${accountData.farmName} - ${accountData.location}`
    );
    console.log(
      `Profile picture: ${
        accountData.profilePicture ? "has image" : "no image"
      }`
    );
    console.log(
      `Description: ${
        accountData.description ? "has description" : "no description"
      }`
    );
  }

  res.json({ success: true, user: accountData });
});

// Update Farmer Profile
router.put("/farmer-profile/:farmerId", async (req, res) => {
  try {
    const { farmerId } = req.params;
    const {
      firstName,
      lastName,
      farmName,
      location,
      description,
      profilePicture,
      phoneNumber,
      registrationNumber,
      yearsOfExperience,
      organicCertification,
      certificationFileName,
      orderNotifications,
      isActive,
    } = req.body;

    // Validate farmerId format
    if (!farmerId || !mongoose.Types.ObjectId.isValid(farmerId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid farmer ID format." });
    }

    const farmer = await Farmer.findById(farmerId);
    if (!farmer) {
      return res
        .status(404)
        .json({ success: false, message: "Farmer not found." });
    }

    // Store original values for logging
    const originalValues = {
      firstName: farmer.firstName,
      lastName: farmer.lastName,
      farmName: farmer.farmName,
      location: farmer.location,
      description: farmer.description,
      profilePicture: farmer.profilePicture ? "has image" : "no image",
    };

    // Validate and update required fields - ensure no empty strings
    if (firstName !== undefined && firstName !== null) {
      const trimmedFirstName = firstName.trim();
      if (trimmedFirstName.length === 0) {
        return res
          .status(400)
          .json({ success: false, message: "First name cannot be empty." });
      }
      farmer.firstName = trimmedFirstName;
    }

    if (lastName !== undefined && lastName !== null) {
      const trimmedLastName = lastName.trim();
      if (trimmedLastName.length === 0) {
        return res
          .status(400)
          .json({ success: false, message: "Last name cannot be empty." });
      }
      farmer.lastName = trimmedLastName;
    }

    if (farmName !== undefined && farmName !== null) {
      const trimmedFarmName = farmName.trim();
      if (trimmedFarmName.length === 0) {
        return res
          .status(400)
          .json({ success: false, message: "Farm name cannot be empty." });
      }
      farmer.farmName = trimmedFarmName;
    }

    if (location !== undefined && location !== null) {
      const trimmedLocation = location.trim();
      if (trimmedLocation.length === 0) {
        return res
          .status(400)
          .json({ success: false, message: "Location cannot be empty." });
      }
      farmer.location = trimmedLocation;
    }
    if (description !== undefined) {
      // Allow empty string for description
      farmer.description = description ? description.trim() : "";
    }
    if (profilePicture !== undefined) {
      // Save profile picture (base64 string) - can be empty string to remove image
      farmer.profilePicture = profilePicture || "";
      if (profilePicture) {
        console.log(
          `Profile picture data length: ${profilePicture.length} characters`
        );
      }
    }
    if (phoneNumber !== undefined) {
      farmer.phoneNumber = phoneNumber ? phoneNumber.trim() : "";
    }
    if (registrationNumber !== undefined) {
      farmer.registrationNumber = registrationNumber ? registrationNumber.trim() : "";
    }
    if (yearsOfExperience !== undefined && yearsOfExperience !== null) {
      farmer.yearsOfExperience = parseInt(yearsOfExperience) || null;
    }
    if (organicCertification !== undefined) {
      farmer.organicCertification = organicCertification || "";
      if (organicCertification) {
        console.log(
          `Organic certification data length: ${organicCertification.length} characters`
        );
      }
    }
    if (certificationFileName !== undefined) {
      farmer.certificationFileName = certificationFileName || "";
    }
    if (orderNotifications !== undefined) {
      farmer.orderNotifications = orderNotifications;
    }
    if (isActive !== undefined) {
      farmer.isActive = isActive;
    }

    // Always update the updatedAt timestamp
    farmer.updatedAt = Date.now();

    // Save all changes to database
    await farmer.save();

    // Verify the data was saved by fetching it back
    const savedFarmer = await Farmer.findById(farmerId);
    if (!savedFarmer) {
      console.error("ERROR: Farmer not found after save!");
      return res.status(500).json({
        success: false,
        message: "Error verifying saved data.",
      });
    }

    // Log saved data to confirm persistence
    console.log("Verified saved farmer data:", {
      _id: savedFarmer._id,
      email: savedFarmer.email,
      firstName: savedFarmer.firstName,
      lastName: savedFarmer.lastName,
      farmName: savedFarmer.farmName,
      location: savedFarmer.location,
      description: savedFarmer.description
        ? `has description (${savedFarmer.description.length} chars)`
        : "no description",
      profilePicture: savedFarmer.profilePicture
        ? `has image (${savedFarmer.profilePicture.length} chars)`
        : "no image",
      updatedAt: savedFarmer.updatedAt,
    });

    // Log the update for debugging and tracking
    console.log(`Farmer profile updated: ${farmerId} - ${farmer.email}`);
    console.log("Field changes:", {
      firstName:
        originalValues.firstName !== farmer.firstName
          ? `${originalValues.firstName} -> ${farmer.firstName}`
          : "unchanged",
      lastName:
        originalValues.lastName !== farmer.lastName
          ? `${originalValues.lastName} -> ${farmer.lastName}`
          : "unchanged",
      farmName:
        originalValues.farmName !== farmer.farmName
          ? `${originalValues.farmName} -> ${farmer.farmName}`
          : "unchanged",
      location:
        originalValues.location !== farmer.location
          ? `${originalValues.location} -> ${farmer.location}`
          : "unchanged",
      description:
        originalValues.description !== (farmer.description || "")
          ? "updated"
          : "unchanged",
      profilePicture:
        originalValues.profilePicture !==
        (farmer.profilePicture ? "has image" : "no image")
          ? "updated"
          : "unchanged",
      updatedAt: "updated",
    });

    // Return all farmer data (except password) to ensure frontend has latest data
    // Use savedFarmer to ensure we return the latest data from database
    const { password: _pwd, ...farmerData } = savedFarmer.toObject();
    farmerData.userType = "farmer";

    // Verify all fields are present in response
    const responseFields = {
      _id: farmerData._id ? "present" : "missing",
      email: farmerData.email ? "present" : "missing",
      firstName: farmerData.firstName ? "present" : "missing",
      lastName: farmerData.lastName ? "present" : "missing",
      farmName: farmerData.farmName ? "present" : "missing",
      location: farmerData.location ? "present" : "missing",
      description: farmerData.description !== undefined ? "present" : "missing",
      profilePicture:
        farmerData.profilePicture !== undefined ? "present" : "missing",
      verified: farmerData.verified !== undefined ? "present" : "missing",
      createdAt: farmerData.createdAt ? "present" : "missing",
      updatedAt: farmerData.updatedAt ? "present" : "missing",
    };
    console.log("Response fields verification:", responseFields);

    res.json({
      success: true,
      message: "Profile updated successfully.",
      farmer: farmerData, // Includes all fields: firstName, lastName, email, farmName, location, profilePicture, description, verified, createdAt, updatedAt
    });
  } catch (error) {
    console.error("Error updating farmer profile:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating profile.",
      error: error.message,
    });
  }
});

// Get Farmer Profile by ID
router.get("/farmer-profile/:farmerId", async (req, res) => {
  try {
    const { farmerId } = req.params;

    // Validate farmerId format
    if (!farmerId || !mongoose.Types.ObjectId.isValid(farmerId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid farmer ID format." });
    }

    const farmer = await Farmer.findById(farmerId);
    if (!farmer) {
      return res
        .status(404)
        .json({ success: false, message: "Farmer not found." });
    }

    // Return all farmer data (except password)
    const { password: _pwd, ...farmerData } = farmer.toObject();
    farmerData.userType = "farmer";

    console.log(`Farmer profile retrieved: ${farmerId} - ${farmer.email}`);

    res.json({
      success: true,
      farmer: farmerData, // Includes all fields: firstName, lastName, email, farmName, location, profilePicture, description, verified, createdAt, updatedAt
    });
  } catch (error) {
    console.error("Error fetching farmer profile:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching profile.",
      error: error.message,
    });
  }
});

// Change Password
router.post("/change-password", async (req, res) => {
  try {
    const { email, currentPassword, newPassword, accountType } = req.body;

    if (!email || !currentPassword || !newPassword || !accountType) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }

    // Validate account type
    if (accountType !== "user" && accountType !== "farmer") {
      return res.status(400).json({
        success: false,
        message: "Invalid account type"
      });
    }

    // Validate new password
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      return res.status(400).json({
        success: false,
        message: passwordError
      });
    }

    // Find account
    let account = null;
    if (accountType === "user") {
      account = await User.findOne({ email });
    } else {
      account = await Farmer.findOne({ email });
    }

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found"
      });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, account.password);
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect"
      });
    }

    // Check if new password is same as current
    const isSamePassword = await bcrypt.compare(newPassword, account.password);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: "New password must be different from current password"
      });
    }

    // Hash and update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    account.password = hashedPassword;
    await account.save();

    console.log(`Password changed successfully for ${accountType}: ${email}`);

    res.json({
      success: true,
      message: "Password updated successfully"
    });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while changing password"
    });
  }
});

// Delete Farmer Account
router.delete("/farmer-profile/:farmerId", async (req, res) => {
  try {
    const { farmerId } = req.params;

    // Validate farmerId format
    if (!farmerId || !mongoose.Types.ObjectId.isValid(farmerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid farmer ID format."
      });
    }

    const farmer = await Farmer.findById(farmerId);
    if (!farmer) {
      return res.status(404).json({
        success: false,
        message: "Farmer not found."
      });
    }

    // Delete the farmer account
    await Farmer.findByIdAndDelete(farmerId);

    console.log(`Farmer account deleted: ${farmerId} - ${farmer.email}`);

    res.json({
      success: true,
      message: "Account deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting farmer account:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting account",
      error: error.message
    });
  }
});

// GET ALL FARMERS (for subscription checkout)
router.get("/farmers", async (req, res) => {
  try {
    // Fetch all farmers with basic info
    const farmers = await Farmer.find(
      {}, // Get all farmers
      {
        farmName: 1,
        location: 1,
        description: 1,
        profilePicture: 1,
        geoLocation: 1,
        email: 1,
        firstName: 1,
        lastName: 1
      }
    ).sort({ farmName: 1 });

    res.json({
      success: true,
      farmers,
      count: farmers.length
    });
  } catch (error) {
    console.error("Error fetching farmers:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching farmers",
      error: error.message
    });
  }
});

module.exports = router;
