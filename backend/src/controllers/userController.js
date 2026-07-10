const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

// Get Current User Profile from Database
exports.getProfile = async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { company: true }
        });

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        // Strip sensitive data
        delete user.password;

        res.json({ success: true, data: user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Failed to fetch profile data." });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const { name, email, phoneNumber, avatarUrl, locationStr } = req.body;
        const userId = req.user.id;

        if (!name || !email) {
            return res.status(400).json({ success: false, message: 'Name and email fields are required.' });
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                name,
                email,
                phoneNumber,
                avatarUrl,
                locationStr
            },
            // Include company context so the frontend store updates cleanly
            include: { company: true }
        });

        // Delete password from payload before shipping
        delete updatedUser.password;

        res.json({ success: true, message: 'Profile variables synchronized successfully', data: updatedUser });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to synchronize workspace profile adjustments' });
    }
};

// Change User Password
exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: 'Current and new passwords are required.' });
        }

        // 1. Fetch the user with their current hashed password
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        // 2. Verify the current password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Incorrect current password.' });
        }

        // 3. Hash the new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // 4. Update the password in the database
        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword }
        });

        // 5. Create a security Audit Log
        await prisma.auditLog.create({
            data: {
                action: 'UPDATE',
                entity: 'USER_SECURITY',
                entityId: userId,
                details: 'User successfully changed their password.',
                userId: userId
            }
        });

        res.json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to change password' });
    }
};