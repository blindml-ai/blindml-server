const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class AuthModel {
    constructor() {
        this.SECRET_KEY = "BLINDML";
        this.saltRounds = 10;
    }

    passwordVerify = async (user, email, password) => {
        try {
            const match = await bcrypt.compare(password, user.token); // Here, make sure to compare against `user.password` if that's the correct property.
            if (match) {
                const token = jwt.sign({ email: email }, this.SECRET_KEY, { expiresIn: '1h' });
                return { email: email, token: token, nickname: user.nickname };
            } else {
                // If password does not match
                throw new Error('Incorrect password');
            }
        } catch (err) {
            throw err;
        }
    };

    getHashedPassword = async (password) => {
        const hashedPassword = await bcrypt.hash(password, this.saltRounds);
        return hashedPassword;
    };

    tokenVerify = async (token) => {
        return new Promise((resolve, reject) => {
            jwt.verify(token, this.SECRET_KEY, (err, decodedUser) => {
                if (err) reject(err);
                else resolve(decodedUser);
            });
        });
    };


    generateAPIkey = async () => {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }
}

module.exports = AuthModel;
