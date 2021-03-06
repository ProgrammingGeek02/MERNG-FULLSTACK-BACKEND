const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { UserInputError } = require('apollo-server');

const { validateLoginInput, validateRegisterInput } = require('../../util/validator');
const { SECRET_KEY } = require('../../config/config');
const User = require('../../models/Users');

function generateToken(user) {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            username: user.username
        },
        SECRET_KEY,
        {
            expiresIn: '1h'
        }
    );
}

module.exports = {

    Mutation: {
        async login(_, { username, password }) {

            const { errors, valid } = validateLoginInput(username, password);

            if (!valid) {
                throw new UserInputError('Errors', { errors });
            }

            const user = await User.findOne({ username });

            if(!user) {
                errors.general = 'User not found';
                throw new UserInputError('User not found', { errors });
            }

            const match = await bcrypt.compare(password, user.password);
            if(!match) {
                errors.general = 'Wrong credentials!';
                throw new UserInputError('Wrong credentials', {errors});
            }

            const token = generateToken(user);

            return {
                ...user._doc,
                id: user._id,
                token
            }

        },

        async register(_, {
            registerInput: { username, email, password, confirmPassword }
        },
        context,
        info
        ) {

            const { valid, errors } = validateRegisterInput(
                username,
                email,
                password,
                confirmPassword
            );
            if (!valid) {
                throw new UserInputError('Errors', {errors});
            }
            //TODO: make sure user doesn't already exist
            const user = await User.findOne({ username });
            if(user){
                throw new UserInputError('username is taken', {
                    errors: {
                        username: 'This username is taken'
                    }
                })
            }
            //TODO: hash password and create an auth token

            const newUser = new User({
                email,
                username,
                password: bcrypt.hashSync(password, bcrypt.genSaltSync(10), null),
                createdAt: new Date().toISOString()
            });

            const res = await newUser.save();

            const token = generateToken(res);

            return {
                ...res._doc,
                id: res._id,
                token
            }

        }

    }

}
