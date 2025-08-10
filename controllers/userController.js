const { prisma } = require('../utils/prisma');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key'; // Simpan di .env untuk keamanan

const loginUser = async (req, res) => {
    const { username, password } = req.body;
    //  console.log(username, password);
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required.' });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { username }
        });

        if (!user) {
            return res.status(401).json({ error: 'Invalid username or password.' });
        }

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            //  console.warn(`⚠️ Failed login attempt for user: ${username}`);
            return res.status(401).json({ error: 'Invalid username or password.' });
        }

        // Generate JWT
        const token = jwt.sign(
            { id: user.id, username: user.username, email: user.email },
            JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.status(200).json({
            message: 'Login successful',
            token,
            user: { id: user.id, username: user.username, email: user.email, fullName: user.fullName }
        });
    } catch (error) {
        res.status(500).json({ error: 'Login failed', details: error.message });
    }
};

const createUser = async (req, res) => {
    const { username, email, password, fullName } = req.body;
    if (!username || !email || !password) {
        return res.status(400).json({ error: 'Username, email, and password required.' });
    }

    try {
        // Cek apakah username/email sudah dipakai
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { username },
                    { email }
                ]
            }
        });
        if (existingUser) {
            return res.status(409).json({ error: 'Username or email already exists.' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                username,
                email,
                password: hashedPassword,
                fullName
            }
        });

        res.status(201).json({
            message: 'User created successfully',
            user: { id: user.id, username: user.username, email: user.email, fullName: user.fullName }
        });
    } catch (error) {
        res.status(500).json({ error: 'User creation failed', details: error.message });
    }
};

module.exports = { loginUser, createUser };