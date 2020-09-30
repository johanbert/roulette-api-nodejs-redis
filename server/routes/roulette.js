const express = require('express');
const app = express();
const { authenticate } = require('../middlewares/authentication');
const { createRoulette, openRouletteBets, createBet, closeRouletteBets, getRoulettes } = require('../services/index');
const endpoints = {
    createRoulette: '/api/roulettes/',
    openRouletteBets: '/api/roulettes/:id',
    createBet: '/api/roulettes/:id/bets',
    closeBets: '/api/roulettes/:id/bets',
    getRoulettes: '/api/roulettes/'
}
app.post(endpoints.createRoulette, authenticate, (req, res) => {
    let requirements = { headers: req.headers, res }
    createRoulette(requirements)
        .then((response) => response)
        .catch((err) => err);
});
app.patch(endpoints.openRouletteBets, authenticate, (req, res) => {
    let roulette = {
        id: req.params.id,
        res
    }
    openRouletteBets(roulette)
        .then((response) => response)
        .catch((err) => err);
});
app.post(endpoints.createBet, authenticate, (req, res) => {
    let betRequirements = {
        bet: req.body.bet,
        amount: req.body.amount,
        rouletteId: req.params.id,
        headers: req.headers,
        res
    }
    createBet(betRequirements)
        .then((response) => response)
        .catch((err) => err);
});
app.patch(endpoints.closeBets, authenticate, (req, res) => {
    let rouletteReqs = {
        rouletteId: req.params.id,
        res
    }
    closeRouletteBets(rouletteReqs)
        .then((response) => response)
        .catch((err) => err);
});
app.get(endpoints.getRoulettes, authenticate, (req, res) => {
    getRoulettes(res)
        .then((response) => response)
        .catch((err) => err);
});
module.exports = app;