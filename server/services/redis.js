require('../config/.env')
const redis = require("redis");
const { promisify } = require('util')
const optionsRedisCon = {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    db: process.env.REDIS_DB,
    connect_timeout: 5000
}
const client = redis.createClient(optionsRedisCon)
module.exports = {
    hgetall: promisify(client.hgetall).bind(client),
    hmset: promisify(client.hmset).bind(client),
    keys: promisify(client.keys).bind(client),
    exists: promisify(client.exists).bind(client),
}