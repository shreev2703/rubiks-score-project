"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const eventWeights = {
    '333': 1.0,
    '222': 0.7,
    '444': 1.1,
    '555': 1.2,
    '666': 1.3,
    '777': 1.4,
    '333bf': 1.5,
    '333fm': 1.6,
    '333oh': 1.0,
    'clock': 0.9,
    'minx': 1.1,
    'pyram': 0.75,
    'skewb': 0.75,
    'sq1': 1.1,
    '444bf': 1.7,
    '555bf': 1.8,
    '333mbf': 2.0,
};
async function loadWCIF(filePath) {
    const data = fs.readFileSync(path.resolve(filePath), 'utf8');
    const wcif = JSON.parse(data);
    const improvements = [];
    for (const event of wcif.events) {
        if (event.id === '333fm' || event.id === '333mbf')
            continue;
        for (const round of event.rounds) {
            for (const result of round.results) {
                const person = wcif.persons.find(p => p.registrantId === result.personId);
                if (!person)
                    continue;
                const oldAvg = person.personalBests.find(pb => pb.eventId === event.id && pb.type === 'average');
                if (result.average > 0 && oldAvg && result.average < oldAvg.best) {
                    improvements.push({ personId: result.personId, eventId: event.id, value: result.average, isSingle: false });
                }
                const oldSingle = person.personalBests.find(pb => pb.eventId === event.id && pb.type === 'single');
                const attempts = result.attempts.map((a) => a.result).filter((r) => r > 0);
                const best = Math.min(...attempts);
                if (attempts.length && oldSingle && best < oldSingle.best) {
                    improvements.push({ personId: result.personId, eventId: event.id, value: best, isSingle: true });
                }
            }
        }
    }
    wcif.processedResults = improvements;
    return wcif;
}
async function fetchRankingData(eventId, format) {
    const url = `https://hamza-yh.github.io/wcaranks/api/${format}/${eventId}.json`;
    const res = await (0, node_fetch_1.default)(url);
    if (!res.ok)
        throw new Error(`Failed to fetch data for ${eventId} (${format})`);
    return res.json();
}
function timeToRank(time, data) {
    const times = Object.values(data).map(entry => entry.time).sort((a, b) => a - b);
    const total = times.length;
    const rank = times.findIndex(t => time < t);
    return { rank: (rank === -1 ? total : rank) + 1, total };
}
function percentileToZScore(p) {
    p = Math.max(0.0001, Math.min(0.9999, p));
    const t = Math.sqrt(-2.0 * Math.log(p < 0.5 ? p : 1 - p));
    const z = t - ((2.515517 + 0.802853 * t + 0.010328 * t * t) / (1 + 1.432788 * t + 0.189269 * t * t + 0.001308 * t * t));
    return p < 0.5 ? -z : z;
}
function weightCompetitors(total) {
    return Math.log10(total + 1);
}
async function analyzeImprovements(wcif) {
    const scores = new Map();
    const rankingCache = new Map();
    const bestsMap = new Map();
    for (const person of wcif.persons) {
        const personBests = new Map();
        for (const pb of person.personalBests) {
            if (!personBests.has(pb.eventId))
                personBests.set(pb.eventId, {});
            personBests.get(pb.eventId)[pb.type] = pb;
        }
        bestsMap.set(person.registrantId, personBests);
    }
    async function getRankings(eventId, format) {
        const key = `${eventId}-${format}`;
        if (!rankingCache.has(key)) {
            console.log(`Fetching ranking data for ${eventId} (${format})...`);
            rankingCache.set(key, await fetchRankingData(eventId, format));
        }
        return rankingCache.get(key);
    }
    for (const result of wcif.processedResults || []) {
        const { personId, eventId, isSingle, value: newTime } = result;
        const format = isSingle ? 'single' : 'average';
        const old = bestsMap.get(personId)?.get(eventId)?.[format]?.best;
        if (!old)
            continue;
        const rankings = await getRankings(eventId, format);
        if (!Object.keys(rankings).length)
            continue;
        const { rank: newRank, total } = timeToRank(newTime, rankings);
        const { rank: oldRank } = timeToRank(old, rankings);
        const newP = Math.max(0, 1 - newRank / total);
        const oldP = Math.max(0, 1 - oldRank / total);
        if (newP <= oldP)
            continue;
        const zDiff = percentileToZScore(newP) - percentileToZScore(oldP);
        const score = zDiff * weightCompetitors(total) * (eventWeights[eventId] || 1) * 100;
        const person = wcif.persons.find(p => p.registrantId === personId);
        console.log(`\nImprovement for ${person?.name} in ${eventId} (${format}):\n  ${old / 100}s -> ${newTime / 100}s\n  Percentile: ${(oldP * 100).toFixed(2)}% -> ${(newP * 100).toFixed(2)}%\n  Score: +${score.toFixed(2)}`);
        if (!scores.has(personId)) {
            scores.set(personId, { totalScore: 0, improvements: [] });
        }
        const personScore = scores.get(personId);
        personScore.totalScore += score;
        personScore.improvements.push({ eventId, format, oldTime: old, newTime, score });
    }
    return scores;
}
(async () => {
    try {
        console.log("Loading WCIF data...");
        const wcif = await loadWCIF('wcif.json');
        console.log(`\nAnalyzing improvements for \"${wcif.name}\"...`);
        const scores = await analyzeImprovements(wcif);
        if (!scores.size)
            return console.log("\nNo new improvements found to score.");
        const sorted = [...scores.entries()].sort((a, b) => b[1].totalScore - a[1].totalScore);
        console.log('\n--- FINAL PR RANKING ---');
        for (const [id, { totalScore, improvements }] of sorted) {
            const name = wcif.persons.find(p => p.registrantId === id)?.name || 'Unknown';
            console.log(`\n${name.padEnd(25)} : ${totalScore.toFixed(2)}`);
            for (const { eventId, format, oldTime, newTime, score } of improvements) {
                console.log(`  - ${eventId.padEnd(7)} (${format.padEnd(7)}): ${(oldTime / 100).toFixed(2)} -> ${(newTime / 100).toFixed(2)} (+${score.toFixed(2)})`);
            }
        }
        const output = sorted.map(([id, { totalScore, improvements }]) => {
            const person = wcif.persons.find(p => p.registrantId === id);
            return {
                personId: id,
                name: person?.name || 'Unknown',
                wcaId: person?.wcaId,
                totalScore: parseFloat(totalScore.toFixed(2)),
                improvements: improvements.map(i => ({ ...i, score: parseFloat(i.score.toFixed(2)) }))
            };
        });
        const outPath = path.resolve('output.json');
        fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
        console.log(`\n\nDetailed improvement scores saved to ${outPath}`);
    }
    catch (err) {
        console.error("\nAn error occurred:", err);
    }
})();
