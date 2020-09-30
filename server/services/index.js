require('../config/.env')
const Promise = require('bluebird')
const { hgetall, hmset, keys, exists } = require('./redis');
const randToken = require('rand-token');
const roulettesKey = 'roulettes';
const spinsKey = 'spins';
const betsKey = 'bets';
const usersKey = 'users';
const limitCredit = 10000;
const betsAllowed = {
    numbers: {
        black: [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35],
        red: [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36],
        none: [0]
    },
    colors: ['rojo', 'negro']
}
let createRoulette = (requirements) => {
    let rouletteId = String(randToken.uid(8)) + '-' + String(randToken.uid(4)) + '-' + String(randToken.uid(4)) + '-' + String(randToken.uid(4)) + '-' + String(randToken.suid(4));
    let createdAt = new Date(new Date().toGMTString().replace('GMT', 'UTC-0')).toISOString()
    let user = {
        userId: extractUserId(requirements.headers),
        values: {
            credit: limitCredit,
            createdAt
        }
    }
    let newRoulette = {
        state: false,
        createdBy: user.userId,
        createdAt
    }

    return hmset(`${roulettesKey}:${rouletteId}`, newRoulette)
        .then(() => setUser(user))
        .then(() => requirements.res.status(201).json({ rouletteId }))
        .catch((err) => requirements.res.status(500).json({ error: 'Internal Server Error', description: err }))
}
let extractUserId = (reqHeaders) => {
    let base64Credentials = reqHeaders.authorization.split(' ')[1];
    let credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');

    return credentials.split(':')[0];
}
let setUser = (user) => {

    return hmset(`${usersKey}:${user.userId}`, user.values)
        .catch(err => `Error setUser: ${err}`)
}
let openRouletteBets = (roulette) => {
    let rouletteValue = { state: true }
    let spin = {
        rouletteId: roulette.id,
        res: roulette.res,
        key: `${ String(randToken.suid(2)) }`,
        values: {
            winnerNumber: '',
            winnerColor: '',
            createdAt: new Date(new Date().toGMTString().replace('GMT', 'UTC-0')).toISOString()
        }
    }
    let lastSpin = { lastSpin: spin.key }

    return validateRoulette(`${roulette.id}`)
        .then(() => hgetall(`${roulettesKey}:${roulette.id}`))
        .then((rouletteValues) => {

            if (String(rouletteValues.state) === 'true') return Promise.reject(`This roulette is already opened`)
        })
        .then(() => hmset(`${roulettesKey}:${roulette.id}`, rouletteValue))
        .then(() => setSpin(spin))
        .then(() => hmset(`${roulettesKey}:${roulette.id}`, lastSpin))
        .then(() => roulette.res.status(200).json({ state: rouletteValue.state, message: 'State changed succesfull' }))
        .catch((err) => roulette.res.status(500).json({ error: 'Internal Server Error', description: `Fail openRouletteBets: ${err}` }));
}
let validateRoulette = (id) => {

    return exists(`${roulettesKey}:${id}`)
        .then((res) => {
            if (res === 0) {

                return Promise.reject('Does not exists that rouletteId')
            } else {

                return Promise.resolve(true)
            }
        })
}
let setSpin = (spin) => {

    return hmset(`${spinsKey}:${spin.key}:${roulettesKey}:${spin.rouletteId}`, spin.values)
        .catch((err) => spin.res.status(500).json({ error: 'Internal Server Error', description: `Fail setSpin: ${err}` }));
}
let closeRouletteBets = (rouletteReqs) => {
    let rouletteValue = { state: false }

    return validateRoulette(`${rouletteReqs.rouletteId}`)
        .then(() => hgetall(`${roulettesKey}:${rouletteReqs.rouletteId}`))
        .then((rouletteValues) => {

            if (String(rouletteValues.state) === 'false') return Promise.reject('This roulette is already closed')
        })
        .then(() => hmset(`${roulettesKey}:${rouletteReqs.rouletteId}`, rouletteValue))
        .catch((err) => rouletteReqs.res.status(500).json({ error: 'Internal Server Error', description: `rouletteId doesn't exists: ${err}` }))
        .then(() => runRoulette(rouletteReqs))
        .then((roulette) => distributeRewardsBets(roulette))
        .then(respuesta => rouletteReqs.res.status(201).json(respuesta))
        .catch((err) => rouletteReqs.res.status(500).json({ error: 'Internal Server Error', description: err }))
}
let runRoulette = (roulette) => {

    return new Promise((resolve, reject) => {
        roulette['winnerValues'] = getWinnerValues();
        resolve(roulette)
    });
}
let getWinnerValues = () => {
    let valuesAllowed = betsAllowed.numbers.none.concat(betsAllowed.numbers.red, betsAllowed.numbers.black)
    let winner = { number: valuesAllowed[Math.floor(Math.random() * valuesAllowed.length)] }
    if (betsAllowed.numbers.black.includes(winner.number)) winner['color'] = 'negro';
    if (betsAllowed.numbers.red.includes(winner.number)) winner['color'] = 'rojo';
    if (betsAllowed.numbers.none.includes(winner.number)) winner['color'] = '';

    return winner
}
let distributeRewardsBets = (roulette) => {

    return hgetall(`${roulettesKey}:${roulette.rouletteId}`)
        .then((rouletteValues) => keys(`${betsKey}:*:${rouletteValues.lastSpin}:${roulettesKey}:${roulette.rouletteId}`))
        .then(betsKeys => Promise.all(betsKeys.map(bet => hgetall(bet))))
        .then((bets) => {
            let results = { rewardsPayouteds: 0, winners: 0, losers: 0, bets: [], winnerValues: roulette.winnerValues };
            Promise.each(bets.map((betValues) => {
                let reward = 0;
                if ((!betValues.bet.includes(parseInt(roulette.winnerValues.number))) && (!betValues.bet.includes(roulette.winnerValues.color))) {
                    results.losers = parseInt(results.losers) + 1
                    results.bets.push({ bet: betValues.bet, amount: betValues.amount, reward });
                } else {
                    reward = parseFloat(calculateEarnings(betValues));
                    results.rewardsPayouteds = parseFloat(results.rewardsPayouteds) + parseFloat(reward);
                    results.winners = parseInt(results.winners) + 1;
                    results.bets.push({ bet: betValues.bet, amount: betValues.amount, reward });

                    return { userId: betValues.userId, reward }
                }
            }).filter(promise => promise !== undefined), (promise) => rewardWinner(promise))

            return results
        })
}
let calculateEarnings = (betValues) => {
    let earnings;
    let valuesAllowed = betsAllowed.numbers.none.concat(betsAllowed.numbers.red, betsAllowed.numbers.black)
    if (betValues.bet.length == 1 && String(betValues.bet) === '0') {
        earnings = parseFloat(betValues.amount) / 2
    } else if (betsAllowed.colors.includes(parseInt(betValues.bet))) {
        earnings = (parseInt(betValues.amount) * 2) + parseInt(betValues.amount)
    } else if (valuesAllowed.includes(parseInt(betValues.bet))) {
        earnings = (parseInt(betValues.amount) * 35) + parseInt(betValues.amount)
    }

    return earnings
}
let rewardWinner = (rewardData) => {

    return hgetall(`${usersKey}:${rewardData.userId}`)
        .then((user) => {
            user.credit = parseFloat(user.credit) + parseFloat(rewardData.reward)
            let userValues = { credit: user.credit }
            hmset(`${usersKey}:${rewardData.userId}`, userValues)
        })
}
let createBet = (betReqs) => {
    let bet = {
        rouletteId: betReqs.rouletteId,
        key: `${ String(randToken.suid(2)) }`,
        values: {
            createdAt: new Date(new Date().toGMTString().replace('GMT', 'UTC-0')).toISOString(),
            userId: extractUserId(betReqs.headers),
            amount: betReqs.amount,
            bet: betReqs.bet
        }
    }

    return validateRoulette(`${bet.rouletteId}`)
        .then(() => hgetall(`${roulettesKey}:${bet.rouletteId}`))
        .then((rouletteValues) => {

            if (String(rouletteValues.state) === 'false') return Promise.reject('This roulette is already closed, you can not bet')
        })
        .then((err) => validateBet(bet))
        .then(() => validateCreditUser(bet))
        .then((newCredit) => {
            let user = { userId: bet.values.userId, values: { credit: newCredit } }
            setUser(user)
        })
        .then(() => hgetall(`${roulettesKey}:${bet.rouletteId}`))
        .then((roulette) => {
            let betKey = `${betsKey}:${bet.key}:${spinsKey}:${roulette.lastSpin}:${roulettesKey}:${bet.rouletteId}`
            hmset(`${betKey}`, bet.values)

            return { id: bet.key, values: bet.values }
        })
        .then((bet) => betReqs.res.status(201).json({ bet }))
        .catch((err) => betReqs.res.status(500).json({ error: 'Internal Server Error', description: err }));
}
let validateBet = (betValues) => {

    return new Promise((resolve, reject) => {
        let prohibiteds = [',', '.', ' ', '\n'];
        try {
            if (prohibiteds.some(String(betValues.values.amount).includes.bind(String(betValues.values.amount)))) {
                reject(`The bet has prohibited values, only is allowed INT numbers, not decimals or floats, without comas points spaces or line breaks`)
            } else if (parseFloat(betValues.values.amount) > limitCredit) {
                reject(`The bet limit is: ${limitCredit}`)
            } else {
                let bet = betValues.values.bet.toLowerCase().trim()
                let valuesAllowed = betsAllowed.colors.concat(betsAllowed.numbers.none, betsAllowed.numbers.red, betsAllowed.numbers.black)
                let regExp = new RegExp('^' + String(valuesAllowed.join('|^')).replace(/\|/g, '$|') + '$', 'gi')
                if (!regExp.test(bet)) reject('Number or color does not allowed like bet')
                if (bet.length <= 2) parseInt(bet)
                resolve(true)
            }
        } catch (error) {
            reject(`Error validating bet,${error}`)
        }
    })
}
let validateCreditUser = (bet) => {

    return hgetall(`${usersKey}:${bet.values.userId}`)
        .then((user) => {
            if (parseFloat(bet.values.amount) > user.credit) {

                return Promise.reject(`Error, your credit is not sufficent to bet that amount`)
            } else {

                return user.credit - bet.values.amount;
            }
        })
}
let getRoulettes = (res) => {
    let listRoulettesKeys = [];

    return keys(`${roulettesKey}*`)
        .then(roulettesKeys => {

            return Promise.all(roulettesKeys.map(roulette => {
                listRoulettesKeys.push(roulette)

                return hgetall(roulette)
            }))
        })
        .then((roulettes) => {

            let listRoulettes = roulettes.map((roulette, index) => {

                return { rouletteId: listRoulettesKeys[index], state: roulette.state }
            })

            return res.status(200).json({ roulettes: listRoulettes })
        })
        .catch((err) => res.status(500).json({ error: 'Internal Server Error', description: err }));
}
module.exports = {
    createRoulette,
    getRoulettes,
    openRouletteBets,
    closeRouletteBets,
    createBet,
    extractUserId
};