'use strict';


angular.module('wd.process', [])
.factory('rulesengine', [function() { 
    
    var rules = [
        score1_onSpd,
        score2_onTw,
        score3_onD,
        score4_onShsa,
        score5_onD,
        score6_onTp,
        score7_onShsa,
        score8_onTp,
        score9_onTe,

        witches_onTw,
        darklings_onDig,
        alchemists_onConvert,
        halflings_onSpd,
        halflings_onSh,
        halflings_onCultIncome,
        mermaids_onSh,
        cultists_onSh,
        icemaidens_onPassTe,
        shapeshifters_gainPowerToken,
        shapeshifters_factionAbility,

        bon6_onPassShsa,
        bon7_onPassTp,
        bon9_onPassD,
        bon10_onPassShip,

        onLeech,

        onTw,

        fav10_onTp,
        fav11_onD,
        fav12_onPassTp,

        advanceDig,
        advanceShip,

        endGameCult,
        endGameNetwork,
        endGameResources,
        endGameBonus,
        onConvertToVp
    ];

    return { 
        setupEngine: setupEngine,
        processCommands: processCommands,
        checkGameComplete: checkGameComplete
    };


    /// START PUBLIC
    function setupEngine(parsedLog, log) { 
        // f&i endgame
        // other options?

        var rounds = [],
            players = [],
            options = [],
            fireAndIceBonus = null,
            names = []; // holds player info and pick order until faction selection

        for(var i = 0; i < parsedLog.length; i++) { 
            var parsedAction = parsedLog[i];
            var action = log[i];

            if(parsedAction.setup == undefined ) { 
                continue;
            }

            if(parsedAction.setup.round != undefined) { 
                rounds.push({ 
                    roundNum: parsedAction.setup.round, 
                    scoreTile: parsedAction.setup.tile
                });
            }

            if(parsedAction.setup.player != undefined) { 
                var order = names.length;
                names.push({
                    name: parsedAction.setup.player.name, 
                    startOrder: order
                });
            }

            if(parsedAction.setup.additionalScoring != undefined) { 
                fireAndIceBonus = parsedAction.setup.additionalScoring;
            }

            if(parsedAction.setup.factionSelection) { 
                var name = names.shift();
                players.push(makePlayer(name, action.faction));
            }
        }

        return {
            rounds: rounds,
            players: players, 
            options: [],
            fireAndIceBonus: fireAndIceBonus,
        };
    }


    function processCommands(engineSetup, parsedLog, log) { 
        var players = engineSetup.players,
            rounds = engineSetup.rounds,
            round = null;
            
        var playerLookup = [];
        for(var i = 0; i < players.length; i++) { 
            var p = players[i];
            playerLookup[p.faction] = p;
        }    
        var roundLookup = [];
        for(var i = 0; i < rounds.length; i++) { 
            var r = rounds[i];
            roundLookup[r.roundNum] = r;
        }

        for(var i = 0; i < parsedLog.length; i++) { 
            var parsedAction = parsedLog[i];
            var action = log[i];

            // var p = players[action.faction];
            var p = playerLookup[action.faction];

            // for now, skip non player actions -- we may do this differnetly 
            // in the future
            if(p != undefined) { 
                var result = processCommand(rules, p, round, parsedAction, action);
            }

            if(parsedAction.round != undefined) {
                round = roundLookup[parsedAction.round];
            }
        }

        // sum player's total points
        for(var i = 0; i < players.length; i++) { 
            sumPoints(players[i]);
        }

        return players;
    }

    function checkGameComplete(parsedLog) { 
        for(var i = 0; i < parsedLog.length; i++) { 
            var parsedAction = parsedLog[i];
            if(parsedAction.endGame) { 
                return true;
            }
        }

        return false; // if we don't find an endGame action
    }
    /// END PUBLIC



    /// START PRIVATE
    function makePlayer(player, faction) {
        var shipStart,
            shipLevels;

        if(faction.toUpperCase() == "NOMADS"
            || faction.toUpperCase() == "CHAOSMAGICIANS"
            || faction.toUpperCase() == "GIANTS"
            || faction.toUpperCase() == "SWARMLINGS"
            || faction.toUpperCase() == "ENGINEERS"
            || faction.toUpperCase() == "HALFLINGS"
            || faction.toUpperCase() == "CULTISTS"
            || faction.toUpperCase() == "ALCHEMISTS"
            || faction.toUpperCase() == "DARKLINGS"
            || faction.toUpperCase() == "AUREN"
            || faction.toUpperCase() == "WITCHES"
            || faction.toUpperCase() == "ICEMAIDENS"
            || faction.toUpperCase() == "YETIS"
            || faction.toUpperCase() == "SHAPESHIFTERS"
            || faction.toUpperCase() == "DRAGONLORDS"
            || faction.toUpperCase() == "ACOLYTES") {
            shipStart = 0;
            shipLevels = {
                "1": { points: 2 },
                "2": { points: 3 },
                "3": { points: 4 }
            };
        }
        else if(faction.toUpperCase() == "FAKIRS"
            || faction.toUpperCase() == "DWARVES") { 
            shipStart = 0;
            shipLevels = {};
        }
        else if(faction.toUpperCase() == "MERMAIDS") {
            shipStart = 1;
            shipLevels = {
                "2": { points: 2 },
                "3": { points: 3 },
                "4": { points: 4 },
                "5": { points: 5 }
            };
        }
        else if(faction.toUpperCase() == "RIVERWALKERS") { 
            shipStart = 1;
            shipLevels = {};
        }
        else {
            throw "Faction [" + faction + "] unrecognized";
        }

        return {
            faction: faction,
            name: player.name,
            startOrder: player.startOrder,
            d: 0,
            tp: 0,
            te: 0,
            sh: 0,
            sa: 0,
            fav10: false,
            fav11: false,
            fav12: false,
            passBonus: '',
            shipLevel: shipStart,
            shipLevels: shipLevels,
            detailed: {
                starting: 20
            },
            simple: { 
                starting: 20
            }
        };
    }


    function addTurnToScorecard(player, effects) { 
        for(var i = 0; i < effects.length; i++) { 
            var effect = effects[i];

            // simple
            if(effect.simple.round != undefined) { 
                if(player.simple.round == undefined) { 
                    player.simple.round = 0;
                }
                player.simple.round += effect.simple.round;
            }
            if(effect.simple.faction != undefined) { 
                if(player.simple.faction == undefined) { 
                    player.simple.faction = 0;
                }
                player.simple.faction += effect.simple.faction;
            }
            if(effect.simple.bonus != undefined) { 
                if(player.simple.bonus == undefined) { 
                    player.simple.bonus = 0;
                }
                player.simple.bonus += effect.simple.bonus;
            }
            if(effect.simple.town != undefined) { 
                if(player.simple.town == undefined) { 
                    player.simple.town = 0;
                }
                player.simple.town += effect.simple.town;
            }
            if(effect.simple.advance != undefined) { 
                if(player.simple.advance == undefined) { 
                    player.simple.advance = 0;
                }
                player.simple.advance += effect.simple.advance;
            }
            if(effect.simple.fav != undefined) { 
                if(player.simple.fav == undefined) { 
                    player.simple.fav = 0;
                }
                player.simple.fav += effect.simple.fav;
            }
            if(effect.simple.endGameCult != undefined) { 
                if(player.simple.endGameCult == undefined) { 
                    player.simple.endGameCult = 0;
                }
                player.simple.endGameCult += effect.simple.endGameCult;
            }
            if(effect.simple.endGameNetwork != undefined) { 
                if(player.simple.endGameNetwork == undefined) { 
                    player.simple.endGameNetwork = 0;
                }
                player.simple.endGameNetwork += effect.simple.endGameNetwork;
            }
            if(effect.simple.endGameResources != undefined) { 
                if(player.simple.endGameResources == undefined) { 
                    player.simple.endGameResources = 0;
                }
                player.simple.endGameResources += effect.simple.endGameResources;
            }
            if(effect.simple.endGameBonus != undefined) { 
                if(player.simple.endGameBonus == undefined) { 
                    player.simple.endGameBonus = 0;
                }
                player.simple.endGameBonus += effect.simple.endGameBonus;
            }
            if(effect.simple.leech != undefined) { 
                if(player.simple.leech == undefined) { 
                    player.simple.leech = 0;
                }
                player.simple.leech += effect.simple.leech;
            }
            if(effect.simple.unknown != undefined) { 
                if(player.simple.unknown == undefined) { 
                    player.simple.unknown = 0;
                }
                player.simple.unknown += effect.simple.unknown;
            }


            // detailed
            if(effect.detailed.round != undefined) { 
                var round = effect.detailed.round;

                if(player.detailed[round.scoreTile] == undefined) { 
                    player.detailed[round.scoreTile] = 0;
                }
                player.detailed[round.scoreTile] += round.points;
            }
            if(effect.detailed.faction != undefined) { 
                if(player.detailed.faction == undefined) { 
                    player.detailed.faction = 0;
                }
                player.detailed.faction += effect.detailed.faction;
            }
            if(effect.detailed["faction-ssOnLeech"] != undefined) { 
                if(player.detailed["faction-ssOnLeech"] == undefined) { 
                    player.detailed["faction-ssOnLeech"] = 0;
                }
                player.detailed["faction-ssOnLeech"] += effect.detailed["faction-ssOnLeech"];
            }
            if(effect.detailed["faction-ssAbility"] != undefined) { 
                if(player.detailed["faction-ssAbility"] == undefined) { 
                    player.detailed["faction-ssAbility"] = 0;
                }
                player.detailed["faction-ssAbility"] += effect.detailed["faction-ssAbility"];
            }
            if(effect.detailed.bon6 != undefined) { 
                if(player.detailed.bon6 == undefined) { 
                    player.detailed.bon6 = 0;
                }
                player.detailed.bon6 += effect.detailed.bon6;
            }
            if(effect.detailed.bon7 != undefined) { 
                if(player.detailed.bon7 == undefined) { 
                    player.detailed.bon7 = 0;
                }
                player.detailed.bon7 += effect.detailed.bon7;
            }
            if(effect.detailed.bon9 != undefined) { 
                if(player.detailed.bon9 == undefined) { 
                    player.detailed.bon9 = 0;
                }
                player.detailed.bon9 += effect.detailed.bon9;
            }
            if(effect.detailed.bon10 != undefined) { 
                if(player.detailed.bon10 == undefined) { 
                    player.detailed.bon10 = 0;
                }
                player.detailed.bon10 += effect.detailed.bon10;
            }
            if(effect.detailed.town != undefined) { 
                if(player.detailed.town == undefined) { 
                    player.detailed.town = 0;
                }
                player.detailed.town += effect.detailed.town;
            }
            if(effect.detailed.advanceShip != undefined) { 
                if(player.detailed.advanceShip == undefined) { 
                    player.detailed.advanceShip = 0;
                }
                player.detailed.advanceShip += effect.detailed.advanceShip;
            }
            if(effect.detailed.advanceDig != undefined) { 
                if(player.detailed.advanceDig == undefined) { 
                    player.detailed.advanceDig = 0;
                }
                player.detailed.advanceDig += effect.detailed.advanceDig;
            }
            if(effect.detailed.fav10 != undefined) { 
                if(player.detailed.fav10 == undefined) { 
                    player.detailed.fav10 = 0;
                }
                player.detailed.fav10 += effect.detailed.fav10;
            }
            if(effect.detailed.fav11 != undefined) { 
                if(player.detailed.fav11 == undefined) { 
                    player.detailed.fav11 = 0;
                }
                player.detailed.fav11 += effect.detailed.fav11;
            }
            if(effect.detailed.fav12 != undefined) { 
                if(player.detailed.fav12 == undefined) { 
                    player.detailed.fav12 = 0;
                }
                player.detailed.fav12 += effect.detailed.fav12;
            }
            if(effect.detailed.endGameFire != undefined) { 
                if(player.detailed.endGameFire == undefined) { 
                    player.detailed.endGameFire = 0;
                }
                player.detailed.endGameFire += effect.detailed.endGameFire;
            }
            if(effect.detailed.endGameWater != undefined) { 
                if(player.detailed.endGameWater == undefined) { 
                    player.detailed.endGameWater = 0;
                }
                player.detailed.endGameWater += effect.detailed.endGameWater;
            }
            if(effect.detailed.endGameEarth != undefined) { 
                if(player.detailed.endGameEarth == undefined) { 
                    player.detailed.endGameEarth = 0;
                }
                player.detailed.endGameEarth += effect.detailed.endGameEarth;
            }
            if(effect.detailed.endGameAir != undefined) { 
                if(player.detailed.endGameAir == undefined) { 
                    player.detailed.endGameAir = 0;
                }
                player.detailed.endGameAir += effect.detailed.endGameAir;
            }
            if(effect.detailed.endGameNetwork != undefined) { 
                if(player.detailed.endGameNetwork == undefined) { 
                    player.detailed.endGameNetwork = 0;
                }
                player.detailed.endGameNetwork += effect.detailed.endGameNetwork;
            }
            if(effect.detailed.endGameResources != undefined) { 
                if(player.detailed.endGameResources == undefined) { 
                    player.detailed.endGameResources = 0;
                }
                player.detailed.endGameResources += effect.detailed.endGameResources;
            }
            if(effect.detailed.endGameConnectedDistance != undefined) { 
                if(player.detailed.endGameConnectedDistance == undefined) { 
                    player.detailed.endGameConnectedDistance = 0;
                }
                player.detailed.endGameConnectedDistance += effect.detailed.endGameConnectedDistance;
            }
            if(effect.detailed.endGameConnectedSaShDistance != undefined) { 
                if(player.detailed.endGameConnectedSaShDistance == undefined) { 
                    player.detailed.endGameConnectedSaShDistance = 0;
                }
                player.detailed.endGameConnectedSaShDistance += effect.detailed.endGameConnectedSaShDistance;
            }
            if(effect.detailed.endGameConnectedClusters != undefined) { 
                if(player.detailed.endGameConnectedClusters == undefined) { 
                    player.detailed.endGameConnectedClusters = 0;
                }
                player.detailed.endGameConnectedClusters += effect.detailed.endGameConnectedClusters;
            }
            if(effect.detailed.endGameBuildingOnEdge != undefined) { 
                if(player.detailed.endGameBuildingOnEdge == undefined) { 
                    player.detailed.endGameBuildingOnEdge = 0;
                }
                player.detailed.endGameBuildingOnEdge += effect.detailed.endGameBuildingOnEdge;
            }
            if(effect.detailed.leech != undefined) { 
                if(player.detailed.leech == undefined) { 
                    player.detailed.leech = 0;
                }
                player.detailed.leech += effect.detailed.leech;
            }
            if(effect.detailed.unknown != undefined) { 
                if(player.detailed.unknown == undefined) { 
                    player.detailed.unknown = [];
                }
                player.detailed.unknown.push(effect.detailed);
            }
        }
    }


    function processCommand(rules, player, round, parsedAction, action) { 
        var effects = [];

        if(parsedAction.round != undefined) { 
            return { round: parsedAction.round }
        }

        if(parsedAction.d != undefined) { 
            player.d += parsedAction.d;
        }
        if(parsedAction.tp != undefined) { 
            player.tp += parsedAction.tp;
        }
        if(parsedAction.te != undefined) { 
            player.te += parsedAction.te;
        }
        if(parsedAction.sh != undefined) { 
            player.sh += parsedAction.sh;
        }
        if(parsedAction.sa != undefined) { 
            player.sa += parsedAction.sa;
        }
        if(parsedAction.fav != undefined) { 
            for(var i = 0; i < parsedAction.fav.length; i++) { 
                var f = parsedAction.fav[i];
                if(f == 10) { 
                    player.fav10 = true;
                }
                else if(f == 11) { 
                    player.fav11 = true;
                }
                else if(f == 12) { 
                    player.fav12 = true;
                }
            }
        }


        for(var i = 0; i < rules.length; i++) { 
            var rule = rules[i];

            var effect = rule(player, round, parsedAction, action);

            if(effect != null) { 
                effects.push(effect);
            }
        }

        markUnmappedPoints(player, effects, parsedAction, action);

        addTurnToScorecard(player, effects)

        if(parsedAction.pass != undefined) { 
            player.pass = parsedAction.pass;
        }

        return;
    }

    function handleHardPoints(player, parsedAction, action, diff) { 
        if(player.faction.toUpperCase() == "ENGINEERS") { 
            if(diff % 3 == 0 && player.sh == 1 && parsedAction.pass != undefined)
            // if 3,6,9 points unaccounted for and we have a sh and we're passing
            return { 
                simple: { faction: diff },
                detailed: { faciton: diff}
            }
        }
        else if(player.faction.toUpperCase() == "FAKIRS") { 
            if(diff == 4 && (parsedAction.d > 0 || parsedAction.transform != undefined)) { 
                // if 4 points unaccounted for and we built or transformed
                return {
                    simple: { faction: diff }, 
                    detailed: { faction: diff } 
                };
            }
        }
        else if(player.faction.toUpperCase() == "DWARVES") { 
            // if 4 points unaccounted for and we built or transformed
            if(diff == 4 && (parsedAction.d > 0 || parsedAction.transform != undefined)) { 
                return {
                    simple: { faction: diff }, 
                    detailed: { faction: diff } 
                };
            }
        }
    }


    function markUnmappedPoints(player, effects, parsedAction, action) {
        var points = 0;

        for(var i = 0; i < effects.length; i++){ 
            var effect = effects[i];

            if(effect.simple.round != undefined) { 
                points += effect.simple.round;
            }
            if(effect.simple.faction != undefined) { 
                points += effect.simple.faction;
            }
            if(effect.simple.bonus != undefined) { 
                points += effect.simple.bonus;
            }
            if(effect.simple.town != undefined) { 
                points += effect.simple.town;
            }
            if(effect.simple.advance != undefined) { 
                points += effect.simple.advance;
            }
            if(effect.simple.fav != undefined) { 
                points += effect.simple.fav;
            }
            if(effect.simple.endGameCult != undefined) { 
                points += effect.simple.endGameCult;
            }
            if(effect.simple.endGameNetwork != undefined) { 
                points += effect.simple.endGameNetwork;
            }
            if(effect.simple.endGameResources != undefined) {
                points += effect.simple.endGameResources;
            }
            if(effect.simple.endGameBonus != undefined) {
                points += effect.simple.endGameBonus;
            }
            if(effect.simple.vp != undefined) { 
                points += effect.simple.vp;
            }
            if(effect.simple.leech != undefined) { 
                points += effect.simple.leech;
            }
        }

        if(action.VP.delta != points) { 
            var diff = action.VP.delta - points;
            var effect = handleHardPoints(player, parsedAction, action, diff);

            if(effect != null) { 
                effects.push(effect);
                points += effect.simple.faction;
            }
        }

        if(action.VP.delta != points) { 
            var diff = action.VP.delta - points;
            effects.push({
                simple: { unknown: diff }, 
                detailed: { unknown: diff, action: action.commands } 
            });
        }
    }


    function sumPoints(player) { 
        var points = 0;

        points += player.simple.starting || 0;
        points += player.simple.round || 0;
        points += player.simple.faction || 0;
        points += player.simple.bonus || 0;
        points += player.simple.town || 0;
        points += player.simple.advance || 0;
        points += player.simple.fav || 0;
        points += player.simple.endGameNetwork || 0;
        points += player.simple.endGameResources || 0;
        points += player.simple.endGameCult || 0;
        points += player.simple.endGameBonus || 0;
        points += player.simple.leech || 0;
        points += player.simple.unknown || 0;

        player.total = points;
    }
    /// END PRIVATE



    /// START RULES
    //
    // Round scoring 
    //

    //SCORE 1: spd >> 2; 1earth -> 1c
    function score1_onSpd(player, round, parsedAction, action) { 
        if(round == undefined || round.scoreTile.toUpperCase() != "SCORE1") { 
            return null;
        }    

        var points = parsedAction.spd * 2;

        if(points > 0) { 
            return { 
                simple: { round: points },
                detailed: { 
                    round: { 
                        roundNum: round.roundNum, 
                        scoreTile: round.scoreTile, 
                        points: points 
                    }
                }
            }
        }
        
        return null;
    }

    //SCORE2: town >> 5; 4earth -> 1spd
    function score2_onTw(player, round, parsedAction, action) { 
        if(round == undefined || round.scoreTile.toUpperCase() != "SCORE2" 
            || parsedAction.tw == undefined) { 
            return null;
        }

        var points = parsedAction.tw.length * 5;

        if(points > 0) {  
            return { 
                simple: { round: points },
                detailed: { 
                    round: { 
                        roundNum: round.roundNum, 
                        scoreTile: round.scoreTile, 
                        points: points 
                    }
                }
            }
        }
    }

    //SCORE3: d >> 2; 4water -> 1p
    function score3_onD(player, round, parsedAction, action) { 
        if(round == undefined || round.scoreTile.toUpperCase() != "SCORE3") { 
            return null;
        }

        var points = parsedAction.d * 2;

        if(points > 0) {  
            return { 
                simple: { round: points },
                detailed: { 
                    round: { 
                        roundNum: round.roundNum, 
                        scoreTile: round.scoreTile, 
                        points: points 
                    }
                }
            }
        }
    }

    //SCORE4: sh/sa >> 5; 2fire -> 1w
    function score4_onShsa(player, round, parsedAction, action) { 
        if(round == undefined || round.scoreTile.toUpperCase() != "SCORE4") { 
            return null;
        }

        var points = 0;
        if(parsedAction.sh) { 
            points += 5;
        }
        if(parsedAction.sa) {
            points += 5;
        }

        if(points > 0) {  
            return { 
                simple: { round: points },
                detailed: { 
                    round: { 
                        roundNum: round.roundNum, 
                        scoreTile: round.scoreTile, 
                        points: points 
                    }
                }
            }
        }
    }

    // SCORE5: d >> 2; 4fire -> 4pw
    function score5_onD(player, round, parsedAction, action) {
        if(round == undefined || round.scoreTile.toUpperCase() != "SCORE5") { 
            return null;
        } 

        var points = parsedAction.d * 2;

        if(points > 0) { 
            return { 
                simple: { round: points },
                detailed: { 
                    round: { 
                        roundNum: round.roundNum, 
                        scoreTile: round.scoreTile, 
                        points: points 
                    }
                }
            }
        }
        
        return null;
    }

    // SCORE6: tp >> 3; 4water -> 1spd
    function score6_onTp(player, round, parsedAction, action) {
        if(round == undefined || round.scoreTile.toUpperCase() != "SCORE6") { 
            return null;
        } 

        var points = parsedAction.tp * 3;

        if(points > 0) { 
            return { 
                simple: { round: points },
                detailed: { 
                    round: { 
                        roundNum: round.roundNum, 
                        scoreTile: round.scoreTile, 
                        points: points 
                    }
                }
            }
        }
        
        return null;
    }

    // SCORE7: SHSA >> 3; 4water -> 1spd
    function score7_onShsa(player, round, parsedAction, action) {
        if(round == undefined || round.scoreTile.toUpperCase() != "SCORE7") { 
            return null;
        } 

        var points = 0;
        if(parsedAction.sh) { 
            points += 5;
        }
        if(parsedAction.sa) {
            points += 5;
        }

        if(points > 0) { 
            return { 
                simple: { round: points },
                detailed: { 
                    round: { 
                        roundNum: round.roundNum, 
                        scoreTile: round.scoreTile, 
                        points: points 
                    }
                }
            }
        }
        
        return null;
    }

    // SCORE8: tp >> 3; 4air -> 1spd
    function score8_onTp(player, round, parsedAction, action) {
        if(round == undefined || round.scoreTile.toUpperCase() != "SCORE8") { 
            return null;
        } 

        var points = parsedAction.tp * 3;

        if(points > 0) { 
            return { 
                simple: { round: points },
                detailed: { 
                    round: { 
                        roundNum: round.roundNum, 
                        scoreTile: round.scoreTile, 
                        points: points 
                    }
                }
            }
        }
        
        return null;
    }

    // SCORE9: te >> 4; 1cult_p -> 2c
    function score9_onTe(player, round, parsedAction, action) {
        if(round == undefined || round.scoreTile.toUpperCase() != "SCORE9") { 
            return null;
        } 

        var points = parsedAction.te * 4;

        if(points > 0) { 
            return { 
                simple: { round: points },
                detailed: { 
                    round: { 
                        roundNum: round.roundNum, 
                        scoreTile: round.scoreTile, 
                        points: points 
                    }
                }
            }
        }
        
        return null;
    }



    //
    // Faction Bonuses
    //

    function witches_onTw(player, round, parsedAction, action) { 
        if(player.faction.toUpperCase() != "WITCHES" || parsedAction.tw == undefined) { 
            return null;
        }

        var points = parsedAction.tw.length * 5;
        if(points > 0) { 
            return { 
                simple: { faction: points },
                detailed: { faction: points }
            }
        }
        
        return null;
    }

    function alchemists_onConvert(player, round, parsedAction, action) { 
        if(player.faction.toUpperCase() != "ALCHEMISTS" || parsedAction.vp == undefined) { 
            return null;
        }

        var points = parsedAction.vp;
        if(points != 0) { 
            return { 
                simple: { faction: points },
                detailed: { faction: points }
            }
        }

        return null;
    }

    function cultists_onSh(player, round, parsedAction, action) { 
        if(player.faction.toUpperCase() != "CULTISTS" || parsedAction.sh == undefined) { 
            return null;
        }

        var points = parsedAction.sh * 7;
        if(points != 0) { 
            return { 
                simple: { faction: points },
                detailed: { faction: points }
            }
        }
    }

    function halflings_onSpd(player, round, parsedAction, action) { 
        if(player.faction.toUpperCase() != "HALFLINGS" || parsedAction.spd == undefined) { 
            return null;
        }

        var points = parsedAction.spd * 1;
        if(points != 0) { 
            return { 
                simple: { faction: points },
                detailed: { faction: points }
            }
        } 
    }

    function halflings_onSh(player, round, parsedAction, action) { 
        if(player.faction.toUpperCase() != "HALFLINGS" || parsedAction.sh == undefined) { 
            return null;
        }

        // handle this manually... not the best but w/e
        var fakeParsedAction = { spd: 3 }, 
            fakeAction = {},
            returnValue = { simple: {}, detailed: {} };

        var onAbility = halflings_onSpd(player, round, fakeParsedAction, fakeAction);
        if(onAbility != null) { 
            returnValue.simple.faction = onAbility.simple.faction;
            returnValue.detailed.faction = onAbility.detailed.faction;
        }

        var onRound = score1_onSpd(player, round, fakeParsedAction, fakeAction);
        if(onRound != null) { 
            returnValue.simple.round = onRound.simple.round;
            returnValue.detailed.round = onRound.detailed.round;
        }

        return returnValue;
    }

    // right now, the only way for anyone (and specifically halfings) to gain points
    // from cult income is to gain a spd (which is worth a vp for halflings)
    function halflings_onCultIncome(player, round, parsedAction, action) { 
        if(player.faction.toUpperCase() != "HALFLINGS" || parsedAction.income != "cult") { 
            return null;
        }

        var points = action.VP.delta;
        if(points != 0) { 
            return { 
                simple: { faction: points },
                detailed: { faction: points }
            }
        } 
    }

    function mermaids_onSh(player, round, parsedAction, action) { 
        if(player.faction.toUpperCase() != "MERMAIDS" || parsedAction.sh == undefined) { 
            return null;
        }

        var fakeParsedAction = { advanceShip: 1 },
            fakeAction = {};

        return advanceShip(player, round, fakeParsedAction, fakeAction);
    }

    function darklings_onDig(player, round, parsedAction, action) { 
        if(player.faction.toUpperCase() != "DARKLINGS" || parsedAction.dig == undefined) { 
            return null;
        }

        var points = parsedAction.dig * 2;
        if(points != 0) { 
            return { 
                simple: { faction: points },
                detailed: { faction: points }
            }
        } 
    }

    function icemaidens_onPassTe(player, round, parsedAction, action) { 
        if(player.faction.toUpperCase() != "ICEMAIDENS" 
            || parsedAction.pass == undefined
            || player.sh == 0) { 
            return null;
        }

        var points = player.te * 3;
        if(points != 0) { 
            return { 
                simple: { faction: points },
                detailed: { faction: points }
            }
        }
    }

    function shapeshifters_gainPowerToken(player, round, parsedAction, action) { 
        if(player.faction.toUpperCase() != "SHAPESHIFTERS" 
            || parsedAction.gainPowerToken == undefined
            || parsedAction.gainPowerToken == false) { 
            return null;
        }

        // do some logic around which version of shape shifters we're playing
        var points = -1;
        if(points != 0) { 
            return { 
                simple: { faction: points },
                detailed: { "faction-ssOnLeech": points }
            }
        }
    }

    function shapeshifters_factionAbility(player, round, parsedAction, action) { 
        if(player.faction.toUpperCase() != "SHAPESHIFTERS"
            || parsedAction.action == undefined) { 
            return null;
        }

        // do some logic aorund which version of shape shifters we're playing with
        var points = 0; 
        if(points != 0) { 
            return { 
                simple: { faction: points },
                detailed: { "faction-ssAbility": points }
            }
        }
    }



    // 
    // Pass Bonuses
    //

    // bon6: sh/sa * 4
    function bon6_onPassShsa(player, round, parsedAction, action) { 
        if(parsedAction.pass == undefined
            || player.pass == undefined
            || player.pass.toUpperCase() != "BON6") { 
            return null;
        }

        var points = (player.sh + player.sa) * 4;
        if(points > 0) { 
            return { 
                simple: { bonus: points },
                detailed: { bon6: points }
            }
        }
    }

    // bon7: tp*2
    function bon7_onPassTp(player, round, parsedAction, action) { 
        if(parsedAction.pass == undefined 
            || player.pass == undefined 
            || player.pass.toUpperCase() != "BON7") {
            return null;
        }

        var points = player.tp * 2;
        if(points > 0) {
            return { 
                simple: { bonus: points },
                detailed: { bon7: points }
            }
        }

        return null;
    }

    // bon9: d*1
    function bon9_onPassD(player, round, parsedAction, action) { 
        if(parsedAction.pass == undefined 
            || player.pass == undefined 
            || player.pass.toUpperCase() != "BON9") {
            return null;
        }

        var points = player.d * 1;
        if(points > 0) {
            return { 
                simple: { bonus: points },
                detailed: { bon9: points }
            }
        }

        return null;
    }

    // bon10: ship*3
    function bon10_onPassShip(player, round, parsedAction, action) { 
        if(parsedAction.pass == undefined 
            || player.pass == undefined 
            || player.pass.toUpperCase() != "BON10") {
            return null;
        }

        var points = player.shipLevel * 3;
        if(points > 0) {
            return { 
                simple: { bonus: points },
                detailed: { bon10: points }
            }
        }

        return null;
    }



    //
    // Leech
    //
    function onLeech(player, round, parsedAction, action) { 
        if(parsedAction.leech == undefined || !parsedAction.leech.accept) { 
            return null;
        }

        if(action.PW.delta <= 1) { 
            return null;
        }

        var points = -(action.PW.delta - 1);
        if(points != 0) { 
            return { 
                simple: { leech: points },
                detailed: { leech: points }
            }
        }
    }



    //
    // Town
    //
    function onTw(player, round, parsedAction, action) {
        if(parsedAction.tw == undefined) { 
            return null;
        }

        var points = 0;
        for(var i = 0; i < parsedAction.tw.length; i++) {
            var tw = parsedAction.tw[i];

            if(tw == 1) { 
                points += 5;
            }
            else if(tw == 2) { 
                points += 7;
            }
            else if(tw == 3) { 
                points += 9;
            }
            else if(tw == 4) { 
                points += 6;
            }
            else if(tw == 5) { 
                points += 8;
            }
            else if(tw == 6) { 
                points += 2;
            }
            else if(tw == 7) { 
                points += 4;
            }
            else if(tw == 8) { 
                points += 11;
            }
        }

        return { 
            simple: { town: points },
            detailed: { town: points }
        }
    }



    //
    // Favs
    //

    // fav10: tp >> 3
    function fav10_onTp(player, round, parsedAction, action) { 
        if(!player.fav10) { 
            return null;
        } 

        var points = parsedAction.tp * 3;

        if(points > 0) { 
            return { 
                simple: { fav: points },
                detailed: { fav10: points }
            }
        }
        
        return null;
    }

    // fav11: d >> 2
    function fav11_onD(player, round, parsedAction, action) { 
        if(!player.fav11) { 
            return null;
        } 

        var points = parsedAction.d * 2;

        if(points > 0) { 
            return { 
                simple: { fav: points },
                detailed: { fav11: points }
            }
        }
        
        return null;
    }

    // fav12: pass: 1tp >> 2, 2/3tp >> 3, 4 tp >> 4
    function fav12_onPassTp(player, round, parsedAction, action) { 
        if(parsedAction.pass == undefined 
            || !player.fav12) {
            return null;
        }

        var points = 0;
        if(player.tp == 1) { 
            points = 2;
        }
        if(player.tp == 2 || player.tp == 3) { 
            points = 3;
        }
        if(player.tp == 4) { 
            points = 4;
        }

        if(points > 0) {
            return { 
                simple: { fav: points },
                detailed: { fav12: points }
            }
        }

        return null;
    }




    //
    // advances
    //
    function advanceDig(player, round, parsedAction, action) {
        if(parsedAction.advanceDig == undefined) {
            return null;
        }

        var points = 6 * parsedAction.advanceDig;
        if(points > 0) {
            return { 
                simple: { advance: points },
                detailed: { advanceDig: points }
            }
        }

        return null;
    }

    function advanceShip(player, round, parsedAction, action) { 
        if(parsedAction.advanceShip == undefined) {
            return null;
        }

        var next = player.shipLevel + 1;
        var nextLevel = player.shipLevels[next];

        if(nextLevel != undefined) {
            player.shipLevel = next;
            return { 
                simple: { advance: nextLevel.points },
                detailed: { advanceShip: nextLevel.points }
            }
        }

        return null;
    }


    //
    // Endgame points
    //
    function endGameCult(player, round, parsedAction, action) { 
        if(parsedAction.endGame == undefined ) {
            return null;
        }

        var points = parsedAction.endGame.points;
        if(points > 0) {
            if(parsedAction.endGame.source.toUpperCase() == "FIRE") {
                return { 
                    simple: { endGameCult: points },
                    detailed: { endGameFire: points }
                }
            }
            if(parsedAction.endGame.source.toUpperCase() == "WATER") {
                return { 
                    simple: { endGameCult: points },
                    detailed: { endGameWater: points }
                }
            }
            if(parsedAction.endGame.source.toUpperCase() == "EARTH") {
                return { 
                    simple: { endGameCult: points },
                    detailed: { endGameEarth: points }
                }
            }
            if(parsedAction.endGame.source.toUpperCase() == "AIR") {
                return { 
                    simple: { endGameCult: points },
                    detailed: { endGameAir: points }
                }
            }
        }
        return null;
    }

    function endGameNetwork(player, round, parsedAction, action) {
        if(parsedAction.endGame == undefined 
            || parsedAction.endGame.source.toUpperCase() != "NETWORK") {
            return null;
        }

        var points = parsedAction.endGame.points;
        if(points > 0) {
            return { 
                simple: { endGameNetwork: points },
                detailed: { endGameNetwork: points }
            }
        }

        return null;
    }

    function endGameResources(player, round, parsedAction, action) { 
        if(parsedAction.endGame == undefined 
            || parsedAction.endGame.source.toUpperCase() != "RESOURCES") {
            return null;
        }

        var points = action.VP.delta;
        if(points > 0) { 
            return { 
                simple: { endGameResources: points },
                detailed: { endGameResources: points }
            }
        }
    }

    function endGameBonus(player, round, parsedAction, action) { 
        if(parsedAction.endGame == undefined) { 
            return null;
        }

        var points = parsedAction.endGame.points;
        if(points > 0) {
            var obj = { simple: { endGameBonus: points } };

            if(parsedAction.endGame.source.toUpperCase() == "CONNECTED-DISTANCE") { 
                obj.detailed = { endGameConnectedDistance: points };
            } else if(parsedAction.endGame.source.toUpperCase() == "CONNECTED-SA-SH-DISTANCE") { 
                obj.detailed = { endGameConnectedSaShDistance: points };
            } else if(parsedAction.endGame.source.toUpperCase() == "CONNECTED-CLUSTERS") { 
                obj.detailed = { endGameConnectedClusters: points };
            } else if(parsedAction.endGame.source.toUpperCase() == "BUILDING-ON-EDGE") { 
                obj.detailed = { endGameBuildingOnEdge: points };
            } else {
                return null;
            }
            return obj;
        }
    }

    function onConvertToVp(player, round, parsedAction, action) { 
        // I assume this is only being used endGame by people who manually convert
        // into points

        // if you're alchemists, use their faction specific rule
        if(player.faction.toUpperCase() == "ALCHEMISTS" || parsedAction.vp == undefined) { 
            return null;
        }

        var points = parsedAction.vp;
        if(points != 0) { 
            return { 
                simple: { endGameResources: points },
                detailed: {endGameResources: points }
            }
        }

        return null;
    }
    /// END RULES
}]);







