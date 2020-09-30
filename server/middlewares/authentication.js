const jwt = require('jsonwebtoken');
let authenticate = (req, res, next) => {
    if (!req.headers.authorization || req.headers.authorization.indexOf('Basic ') === -1)
        return res.status(401).json({
            error: 'Unauthorized',
            description: 'You are not authorized for this requests. Missing Authorization Header'
        });
    let base64Credentials = req.headers.authorization.split(' ')[1];
    let credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
    let [userId, apiKey] = credentials.split(':');
    jwt.verify(apiKey, process.env.SECRET, (err, decoded) => {
        if (err)
            return res.status(401).json({
                error: 'Unauthorized',
                description: 'Invalid Authentication Credentials'
            })
        next();
    })
}
module.exports = {
    authenticate
};