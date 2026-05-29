import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import FarmerHeader from '../Header/FarmerHeader';
import styles from './FarmerProfile.module.css';

export default function FarmerProfile() {
  const [farmer, setFarmer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  const navigate = useNavigate();

  // Form state
  const [fullName, setFullName] = useState('');
  const [farmName, setFarmName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [farmDescription, setFarmDescription] = useState('');
  const [location, setLocation] = useState(null);
  const [profilePicture, setProfilePicture] = useState('');
  const [profilePicturePreview, setProfilePicturePreview] = useState('');

  // Security form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [newPasswordErrors, setNewPasswordErrors] = useState([]);
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Farm Details state
  const [farmAddress, setFarmAddress] = useState('');
  const [farmRegistrationNumber, setFarmRegistrationNumber] = useState('');
  const [yearsOfExperience, setYearsOfExperience] = useState('');
  const [organicCertification, setOrganicCertification] = useState(null);
  const [certificationFileName, setCertificationFileName] = useState('');

  // Notification preferences state
  const [orderNotifications, setOrderNotifications] = useState(true);

  // Danger Zone state
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      navigate('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    if (parsedUser.userType !== 'farmer') {
      navigate('/marketplace');
      return;
    }

    fetchFarmerData(parsedUser._id);
  }, [navigate]);

  const fetchFarmerData = async (farmerId) => {
    try {
      const response = await axios.get(`/api/auth/farmer-profile/${farmerId}`);
      if (response.data.success) {
        const farmerData = response.data.farmer;
        setFarmer(farmerData);
        
        // Populate form fields
        setFullName(`${farmerData.firstName} ${farmerData.lastName}`);
        setFarmName(farmerData.farmName || '');
        setEmail(farmerData.email || '');
        setPhoneNumber(farmerData.phoneNumber || '');
        setFarmDescription(farmerData.description || '');
        setProfilePicture(farmerData.profilePicture || '');
        setProfilePicturePreview(farmerData.profilePicture || '');
        
        // Populate farm details
        setFarmAddress(farmerData.location || '');
        setFarmRegistrationNumber(farmerData.registrationNumber || '');
        setYearsOfExperience(farmerData.yearsOfExperience || '');
        setCertificationFileName(farmerData.certificationFileName || '');
        
        // Populate notification preferences
        setOrderNotifications(farmerData.orderNotifications !== false); // Default to true
        
        if (farmerData.geoLocation && farmerData.geoLocation.coordinates) {
          setLocation({
            latitude: farmerData.geoLocation.coordinates[1],
            longitude: farmerData.geoLocation.coordinates[0]
          });
        }
      }
    } catch (error) {
      console.error('Error fetching farmer data:', error);
      toast.error('Failed to load farmer data');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveChanges = async () => {
    try {
      const [firstName, ...lastNameParts] = fullName.split(' ');
      const lastName = lastNameParts.join(' ');

      const updateData = {
        firstName,
        lastName,
        farmName,
        phoneNumber,
        description: farmDescription
      };

      // Only include profile picture if it was changed
      if (profilePicture && profilePicture !== farmer.profilePicture) {
        updateData.profilePicture = profilePicture;
      }

      const response = await axios.put(`/api/auth/farmer-profile/${farmer._id}`, updateData);

      if (response.data.success) {
        toast.success('Profile updated successfully!');
        
        // Update localStorage
        const userData = JSON.parse(localStorage.getItem('user'));
        userData.firstName = firstName;
        userData.lastName = lastName;
        userData.farmName = farmName;
        userData.description = farmDescription;
        if (profilePicture) {
          userData.profilePicture = profilePicture;
        }
        localStorage.setItem('user', JSON.stringify(userData));
        
        // Trigger storage event to update header
        window.dispatchEvent(new Event('storage'));
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error.response?.data?.message || 'Failed to update profile');
    }
  };

  const handleProfilePictureChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Image size must be less than 2MB');
        return;
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Only JPG and PNG images are allowed');
        return;
      }

      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicture(reader.result);
        setProfilePicturePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveProfilePicture = () => {
    setProfilePicture('');
    setProfilePicturePreview('');
  };

  const handleViewOnMap = () => {
    if (location) {
      window.open(`https://map.gallimap.com/?lat=${location.latitude}&lng=${location.longitude}&zoom=15`, '_blank');
    }
  };

  const validatePasswordCriteria = (password) => {
    const errors = [];
    if (password.length < 8 || password.length > 30) {
      errors.push("Password must be 8-30 characters long");
    }
    if (!/[A-Z]/.test(password)) {
      errors.push("Password must contain at least one uppercase letter");
    }
    if (!/[a-z]/.test(password)) {
      errors.push("Password must contain at least one lowercase letter");
    }
    if (!/\d/.test(password)) {
      errors.push("Password must contain at least one number");
    }
    if (!/[!@#$%^&*]/.test(password)) {
      errors.push("Password must contain at least one special character (!@#$%^&*)");
    }
    if (/\s/.test(password)) {
      errors.push("Password must not contain whitespace");
    }
    return errors;
  };

  const handleNewPasswordChange = (password) => {
    setNewPassword(password);
    const errors = validatePasswordCriteria(password);
    setNewPasswordErrors(errors);
    
    // Check confirm password match if it's already filled
    if (confirmPassword) {
      if (password !== confirmPassword) {
        setConfirmPasswordError("Passwords do not match");
      } else {
        setConfirmPasswordError("");
      }
    }
  };

  const handleConfirmPasswordChange = (password) => {
    setConfirmPassword(password);
    if (password !== newPassword) {
      setConfirmPasswordError("Passwords do not match");
    } else {
      setConfirmPasswordError("");
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('All password fields are required');
      return;
    }

    // Validate new password
    const pwdErrors = validatePasswordCriteria(newPassword);
    if (pwdErrors.length > 0) {
      setNewPasswordErrors(pwdErrors);
      return;
    }

    if (newPassword !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
      return;
    }

    try {
      const response = await axios.post('/api/auth/change-password', {
        email: farmer.email,
        currentPassword,
        newPassword,
        accountType: 'farmer'
      });

      if (response.data.success) {
        toast.success('Password updated successfully!');
        // Clear form
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setPasswordError('');
        setNewPasswordErrors([]);
        setConfirmPasswordError('');
      }
    } catch (error) {
      console.error('Error updating password:', error);
      setPasswordError(error.response?.data?.message || 'Failed to update password');
    }
  };

  const handleCertificationUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }

      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Only PDF, JPG, and PNG files are allowed');
        return;
      }

      setCertificationFileName(file.name);

      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        setOrganicCertification(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveFarmDetails = async () => {
    try {
      const updateData = {
        location: farmAddress,
        registrationNumber: farmRegistrationNumber,
        yearsOfExperience: yearsOfExperience ? parseInt(yearsOfExperience) : null,
      };

      if (organicCertification) {
        updateData.organicCertification = organicCertification;
        updateData.certificationFileName = certificationFileName;
      }

      const response = await axios.put(`/api/auth/farmer-profile/${farmer._id}`, updateData);

      if (response.data.success) {
        toast.success('Farm details updated successfully!');
        
        // Update localStorage
        const userData = JSON.parse(localStorage.getItem('user'));
        userData.location = farmAddress;
        userData.registrationNumber = farmRegistrationNumber;
        userData.yearsOfExperience = yearsOfExperience;
        if (certificationFileName) {
          userData.certificationFileName = certificationFileName;
        }
        localStorage.setItem('user', JSON.stringify(userData));
      }
    } catch (error) {
      console.error('Error updating farm details:', error);
      toast.error(error.response?.data?.message || 'Failed to update farm details');
    }
  };

  const handleSaveNotificationPreferences = async () => {
    try {
      const response = await axios.put(`/api/auth/farmer-profile/${farmer._id}`, {
        orderNotifications
      });

      if (response.data.success) {
        toast.success('Notification preferences updated successfully!');
        
        // Update localStorage
        const userData = JSON.parse(localStorage.getItem('user'));
        userData.orderNotifications = orderNotifications;
        localStorage.setItem('user', JSON.stringify(userData));
      }
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      toast.error(error.response?.data?.message || 'Failed to update notification preferences');
    }
  };

  const handleDeactivateAccount = async () => {
    try {
      const response = await axios.put(`/api/auth/farmer-profile/${farmer._id}`, {
        isActive: false
      });

      if (response.data.success) {
        toast.success('Account deactivated successfully');
        setShowDeactivateModal(false);
        
        // Log out user
        setTimeout(() => {
          localStorage.removeItem('user');
          navigate('/');
        }, 2000);
      }
    } catch (error) {
      console.error('Error deactivating account:', error);
      toast.error(error.response?.data?.message || 'Failed to deactivate account');
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      toast.error('Please type DELETE to confirm');
      return;
    }

    try {
      const response = await axios.delete(`/api/auth/farmer-profile/${farmer._id}`);

      if (response.data.success) {
        toast.success('Account deleted successfully');
        setShowDeleteModal(false);
        
        // Log out user
        setTimeout(() => {
          localStorage.removeItem('user');
          navigate('/');
        }, 2000);
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error(error.response?.data?.message || 'Failed to delete account');
    }
  };

  const getInitials = (name) => {
    const parts = name.split(' ');
    return parts.map(part => part.charAt(0).toUpperCase()).join('');
  };

  if (loading) {
    return (
      <>
        <FarmerHeader />
        <div className={styles.loading}>Loading...</div>
      </>
    );
  }

  return (
    <div className={styles.farmerProfile}>
      <FarmerHeader />
      
      <div className={styles.container}>
        <div className={styles.sidebar}>
          <div className={styles.sidebarHeader}>SETTINGS</div>
          
          <button
            className={`${styles.sidebarItem} ${activeTab === 'profile' ? styles.active : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" stroke="currentColor" strokeWidth="2"/>
            </svg>
            Profile Information
          </button>
          
          <button
            className={`${styles.sidebarItem} ${activeTab === 'security' ? styles.active : ''}`}
            onClick={() => setActiveTab('security')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2"/>
            </svg>
            Security
          </button>
          
          <button
            className={`${styles.sidebarItem} ${activeTab === 'farm' ? styles.active : ''}`}
            onClick={() => setActiveTab('farm')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="currentColor" strokeWidth="2"/>
            </svg>
            Farm Details
          </button>
          
          <button
            className={`${styles.sidebarItem} ${activeTab === 'notifications' ? styles.active : ''}`}
            onClick={() => setActiveTab('notifications')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" stroke="currentColor" strokeWidth="2"/>
            </svg>
            Notifications
          </button>
          
          <button
            className={`${styles.sidebarItem} ${activeTab === 'danger' ? styles.active : ''}`}
            onClick={() => setActiveTab('danger')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01" stroke="currentColor" strokeWidth="2"/>
            </svg>
            Danger Zone
          </button>
        </div>

        <div className={styles.content}>
          {activeTab === 'profile' && (
            <>
              <div className={styles.contentHeader}>
                <h2 className={styles.contentTitle}>Profile Information</h2>
                <p className={styles.contentSubtitle}>Update your personal and farm profile details.</p>
              </div>

              <div className={styles.profileCard}>
                <div className={styles.profileAvatarWrapper}>
                  <div className={styles.profileAvatar}>
                    {profilePicturePreview ? (
                      <img src={profilePicturePreview} alt="Profile" className={styles.avatarImage} />
                    ) : (
                      getInitials(fullName)
                    )}
                    <div className={styles.avatarBadge}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                        <path d="M12 2a10 10 0 100 20 10 10 0 000-20z"/>
                      </svg>
                    </div>
                  </div>
                  <input
                    type="file"
                    id="profile-picture-upload"
                    className={styles.fileInput}
                    accept="image/jpeg,image/jpg,image/png"
                    onChange={handleProfilePictureChange}
                  />
                  <div className={styles.avatarActions}>
                    <label htmlFor="profile-picture-upload" className={styles.uploadAvatarBtn}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Upload Photo
                    </label>
                    {profilePicturePreview && (
                      <button className={styles.removeAvatarBtn} onClick={handleRemoveProfilePicture}>
                        Remove
                      </button>
                    )}
                  </div>
                </div>
                <div className={styles.profileInfo}>
                  <div className={styles.profileName}>{fullName}</div>
                  <div className={styles.profileType}>FARMER ACCOUNT</div>
                </div>
              </div>

              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Full Name</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Farm Name</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={farmName}
                    onChange={(e) => setFarmName(e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Email Address</label>
                  <input
                    type="email"
                    className={styles.input}
                    value={email}
                    disabled
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Phone Number</label>
                  <input
                    type="tel"
                    className={styles.input}
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Farm Description</label>
                <textarea
                  className={styles.textarea}
                  value={farmDescription}
                  onChange={(e) => setFarmDescription(e.target.value)}
                  rows={4}
                  placeholder="Fresh organic vegetables grown with love and care. Family-owned farm serving the community for over 15 years."
                />
              </div>

              {location && (
                <div className={styles.formGroup}>
                  <label className={styles.label}>Farm Location</label>
                  <div className={styles.locationCard}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke="white" strokeWidth="2"/>
                      <circle cx="12" cy="10" r="3" stroke="white" strokeWidth="2"/>
                    </svg>
                    <div className={styles.locationInfo}>
                      <div className={styles.locationTitle}>Farm Location</div>
                      <div className={styles.locationCoords}>
                        Your farm is located at {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                      </div>
                    </div>
                    <button className={styles.viewMapBtn} onClick={handleViewOnMap}>
                      View on Map
                    </button>
                  </div>
                </div>
              )}

              <div className={styles.formActions}>
                <button className={styles.saveBtn} onClick={handleSaveChanges}>
                  Save Changes
                </button>
              </div>
            </>
          )}

          {activeTab === 'security' && (
            <>
              <div className={styles.contentHeader}>
                <h2 className={styles.contentTitle}>Change Password</h2>
                <p className={styles.contentSubtitle}>Ensure your account stays secure by updating your password regularly.</p>
              </div>

              <form onSubmit={handleUpdatePassword}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Current Password</label>
                  <div className={styles.passwordInputWrapper}>
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      className={styles.input}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      className={styles.passwordToggle}
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                    >
                      {showCurrentPassword ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                          <path d="M1 12C3.5 7 7.5 4 12 4C16.5 4 20.5 7 23 12C20.5 17 16.5 20 12 20C7.5 20 3.5 17 1 12Z" stroke="#999" strokeWidth="2"/>
                          <circle cx="12" cy="12" r="3" stroke="#999" strokeWidth="2"/>
                        </svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                          <path d="M1 12C3.5 7 7.5 4 12 4C16.5 4 20.5 7 23 12C20.5 17 16.5 20 12 20C7.5 20 3.5 17 1 12Z" stroke="#999" strokeWidth="2"/>
                          <circle cx="12" cy="12" r="3" stroke="#999" strokeWidth="2"/>
                          <line x1="4" y1="20" x2="20" y2="4" stroke="#999" strokeWidth="2"/>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>New Password</label>
                  <div className={styles.passwordInputWrapper}>
                    <input
                      type={showNewPassword ? "text" : "password"}
                      className={styles.input}
                      value={newPassword}
                      onChange={(e) => handleNewPasswordChange(e.target.value)}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      className={styles.passwordToggle}
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                    >
                      {showNewPassword ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                          <path d="M1 12C3.5 7 7.5 4 12 4C16.5 4 20.5 7 23 12C20.5 17 16.5 20 12 20C7.5 20 3.5 17 1 12Z" stroke="#999" strokeWidth="2"/>
                          <circle cx="12" cy="12" r="3" stroke="#999" strokeWidth="2"/>
                        </svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                          <path d="M1 12C3.5 7 7.5 4 12 4C16.5 4 20.5 7 23 12C20.5 17 16.5 20 12 20C7.5 20 3.5 17 1 12Z" stroke="#999" strokeWidth="2"/>
                          <circle cx="12" cy="12" r="3" stroke="#999" strokeWidth="2"/>
                          <line x1="4" y1="20" x2="20" y2="4" stroke="#999" strokeWidth="2"/>
                        </svg>
                      )}
                    </button>
                  </div>
                  {newPasswordErrors.length > 0 && (
                    <div className={styles.validationMessages}>
                      {newPasswordErrors.map((error, index) => (
                        <div key={index} className={styles.errorText}>
                          • {error}
                        </div>
                      ))}
                    </div>
                  )}
                  {newPasswordErrors.length === 0 && newPassword && (
                    <div className={styles.successText}>
                      ✓ Password is valid
                    </div>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Confirm New Password</label>
                  <div className={styles.passwordInputWrapper}>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      className={styles.input}
                      value={confirmPassword}
                      onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      className={styles.passwordToggle}
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                          <path d="M1 12C3.5 7 7.5 4 12 4C16.5 4 20.5 7 23 12C20.5 17 16.5 20 12 20C7.5 20 3.5 17 1 12Z" stroke="#999" strokeWidth="2"/>
                          <circle cx="12" cy="12" r="3" stroke="#999" strokeWidth="2"/>
                        </svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                          <path d="M1 12C3.5 7 7.5 4 12 4C16.5 4 20.5 7 23 12C20.5 17 16.5 20 12 20C7.5 20 3.5 17 1 12Z" stroke="#999" strokeWidth="2"/>
                          <circle cx="12" cy="12" r="3" stroke="#999" strokeWidth="2"/>
                          <line x1="4" y1="20" x2="20" y2="4" stroke="#999" strokeWidth="2"/>
                        </svg>
                      )}
                    </button>
                  </div>
                  {confirmPasswordError && (
                    <div className={styles.errorText}>
                      • {confirmPasswordError}
                    </div>
                  )}
                  {!confirmPasswordError && confirmPassword && newPassword === confirmPassword && (
                    <div className={styles.successText}>
                      ✓ Passwords match
                    </div>
                  )}
                </div>

                {passwordError && (
                  <div className={styles.errorMessage}>{passwordError}</div>
                )}

                <div className={styles.formActions}>
                  <button type="submit" className={styles.saveBtn}>
                    Update Password
                  </button>
                </div>
              </form>
            </>
          )}

          {activeTab === 'farm' && (
            <>
              <div className={styles.contentHeader}>
                <h2 className={styles.contentTitle}>Farm Details</h2>
                <p className={styles.contentSubtitle}>Manage your farm's official information.</p>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Farm Address</label>
                <input
                  type="text"
                  className={styles.input}
                  value={farmAddress}
                  onChange={(e) => setFarmAddress(e.target.value)}
                  placeholder="Bouddha, Kathmandu, Nepal"
                />
              </div>

              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Farm Registration Number</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={farmRegistrationNumber}
                    onChange={(e) => setFarmRegistrationNumber(e.target.value)}
                    placeholder="NP-FARM-2024-00321"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Years of Farming Experience</label>
                  <input
                    type="number"
                    className={styles.input}
                    value={yearsOfExperience}
                    onChange={(e) => setYearsOfExperience(e.target.value)}
                    placeholder="15"
                    min="0"
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Organic Certification</label>
                <div className={styles.uploadArea}>
                  <input
                    type="file"
                    id="certification-upload"
                    className={styles.fileInput}
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleCertificationUpload}
                  />
                  <label htmlFor="certification-upload" className={styles.uploadLabel}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <div className={styles.uploadText}>
                      Drag & drop your certification document or{' '}
                      <span className={styles.browseText}>browse</span>
                    </div>
                    <div className={styles.uploadHint}>
                      PDF, JPG or PNG up to 5MB
                    </div>
                    {certificationFileName && (
                      <div className={styles.fileName}>
                        📄 {certificationFileName}
                      </div>
                    )}
                  </label>
                </div>
              </div>

              <div className={styles.formActions}>
                <button className={styles.saveBtn} onClick={handleSaveFarmDetails}>
                  Save Farm Details
                </button>
              </div>
            </>
          )}

          {activeTab === 'notifications' && (
            <>
              <div className={styles.contentHeader}>
                <h2 className={styles.contentTitle}>Notification Preferences</h2>
                <p className={styles.contentSubtitle}>Choose how you'd like to be notified.</p>
              </div>

              <div className={styles.notificationCard}>
                <div className={styles.notificationInfo}>
                  <div className={styles.notificationTitle}>Order Notifications</div>
                  <div className={styles.notificationDesc}>Get notified when you receive new orders.</div>
                </div>
                <label className={styles.toggleSwitch}>
                  <input
                    type="checkbox"
                    checked={orderNotifications}
                    onChange={(e) => setOrderNotifications(e.target.checked)}
                  />
                  <span className={styles.toggleSlider}></span>
                </label>
              </div>

              <div className={styles.formActions}>
                <button className={styles.saveBtn} onClick={handleSaveNotificationPreferences}>
                  Save Preferences
                </button>
              </div>
            </>
          )}

          {activeTab === 'danger' && (
            <>
              <div className={styles.contentHeader}>
                <h2 className={styles.contentTitle}>Danger Zone</h2>
                <p className={styles.contentSubtitle}>Irreversible actions for your account.</p>
              </div>

              {/* Deactivate Account */}
              <div className={styles.dangerCard}>
                <div className={styles.dangerInfo}>
                  <div className={styles.dangerTitle}>Deactivate Account</div>
                  <div className={styles.dangerDesc}>Temporarily disable your account. You can reactivate anytime.</div>
                </div>
                <button className={styles.deactivateBtn} onClick={() => setShowDeactivateModal(true)}>
                  Deactivate
                </button>
              </div>

              {/* Delete Account */}
              <div className={`${styles.dangerCard} ${styles.dangerCardDelete}`}>
                <div className={styles.dangerWarning}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01" stroke="#dc2626" strokeWidth="2"/>
                  </svg>
                </div>
                <div className={styles.dangerInfo}>
                  <div className={styles.dangerTitle}>Delete Account</div>
                  <div className={styles.dangerDesc}>Permanently delete your account and all data. This cannot be undone.</div>
                </div>
                <button className={styles.deleteBtn} onClick={() => setShowDeleteModal(true)}>
                  Delete Account
                </button>
              </div>

              {/* Deactivate Modal */}
              {showDeactivateModal && (
                <div className={styles.modalOverlay} onClick={() => setShowDeactivateModal(false)}>
                  <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                    <h3 className={styles.modalTitle}>Deactivate Account</h3>
                    <p className={styles.modalText}>
                      Are you sure you want to deactivate your account? You can reactivate it anytime by logging in again.
                    </p>
                    <div className={styles.modalActions}>
                      <button className={styles.modalCancelBtn} onClick={() => setShowDeactivateModal(false)}>
                        Cancel
                      </button>
                      <button className={styles.modalConfirmBtn} onClick={handleDeactivateAccount}>
                        Deactivate
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Delete Modal */}
              {showDeleteModal && (
                <div className={styles.modalOverlay} onClick={() => setShowDeleteModal(false)}>
                  <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                    <h3 className={styles.modalTitle}>Delete Account</h3>
                    <p className={styles.modalText}>
                      This action cannot be undone. All your data, products, and orders will be permanently deleted.
                    </p>
                    <p className={styles.modalWarningText}>
                      Type <strong>DELETE</strong> to confirm:
                    </p>
                    <input
                      type="text"
                      className={styles.input}
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder="Type DELETE"
                    />
                    <div className={styles.modalActions}>
                      <button className={styles.modalCancelBtn} onClick={() => {
                        setShowDeleteModal(false);
                        setDeleteConfirmText('');
                      }}>
                        Cancel
                      </button>
                      <button className={styles.modalDeleteBtn} onClick={handleDeleteAccount}>
                        Delete Account
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
