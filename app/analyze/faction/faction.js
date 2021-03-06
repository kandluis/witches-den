'use strict';

var _ = require('underscore');

AnalyzeAllCtrl.$inject = ['$scope', '$http', '$location', 'd3', 'format'];
AnalyzeFactionCtrl.$inject = ['$scope', '$http', '$location', '$routeParams', 'd3', 'format'];
module.exports = {
    faction: AnalyzeFactionCtrl,
    all: AnalyzeAllCtrl
};

function AnalyzeAllCtrl($scope, $http, $location, d3, format) {    
    $scope.format = format.buildFormat();
    $scope.faction = { imgUrl: "/img/all.png", name: "all" };

    $http({ method: 'GET', url: '/data/faction/' + $scope.faction.name })
        .then(function(response) { 
            if(response.data)  {
                $scope.factionData = response.data;
                buildAndSaveHeatmap($scope, $scope.factionData.results)
            }
        });

    loadTooltips();

    function buildAndSaveHeatmap($scope, results) {
        var factions = _.map(results, x => x.faction);

        var data = new Array(factions.length);
        for(var i = 0; i < factions.length; i++) { 
            data[i] = new Array(factions.length);
        }

        for(var i = 0; i < data.length; i++) { 
            for(var j = 0; j < data[i].length; j++) {
                if(Math.floor(i / 2) == Math.floor(j / 2)) { // same color
                    data[i][j] = "";
                } else {
                    var denom = results[i][factions[j]].win + results[i][factions[j]].loss;
                    var percent = denom == 0 ? "-" :
                        Math.round(results[i][factions[j]].win / denom * 100);
                    data[i][j] = percent;
                }
            }
        }

        $scope.factions = factions;
        $scope.heatmap = data;
    }

    function loadTooltips() {
        $(".explanation").tooltip({ tooltipClass: "explanation-tooltip" });
    }
}

function AnalyzeFactionCtrl($scope, $http, $location, $routeParams, d3, format) {    
    $scope.format = format.buildFormat()
    $scope.faction = getFactionSettings($routeParams.faction);

    if($scope.faction) { 
        $http({ method: 'GET', url: '/data/faction/' + $scope.faction.name })
            .then(function(response) { 
                if(response.data)  {
                    $scope.factionData = response.data;
                }
            });
    }

    loadTooltips();


    function getFactionSettings(faction) { 
        if(!faction) { 
            return null;
        }

        var imgUrlPrefix = "http://www.terra-mystica-spiel.de/img/";

        if(faction.toUpperCase() == "DWARVES") { 
            return {
                imgUrl: imgUrlPrefix + "volk_7_300.jpg",
                name: "dwarves"
            };
        } else if(faction.toUpperCase() == "ENGINEERS") {
           return {
                imgUrl: imgUrlPrefix + "volk_8_300.jpg",
                name: "engineers"
            };
        } else if(faction.toUpperCase() == "CHAOSMAGICIANS") {
           return {
                imgUrl: imgUrlPrefix + "volk_3_300.jpg",
                name: "chaosmagicians"
            }; 
        } else if(faction.toUpperCase() == "GIANTS") {
           return {
                imgUrl: imgUrlPrefix + "volk_4_300.jpg",
                name: "giants"
            }; 
        } else if(faction.toUpperCase() == "FAKIRS") {
           return {
                imgUrl: imgUrlPrefix + "volk_1_300.jpg",
                name: "fakirs"
            }; 
        } else if(faction.toUpperCase() == "NOMADS") {
           return {
                imgUrl: imgUrlPrefix + "volk_2_300.jpg",
                name: "nomads"
            }; 
        } else if(faction.toUpperCase() == "HALFLINGS") {
           return {
                imgUrl: imgUrlPrefix + "volk_9_300.jpg",
                name: "halflings"
            }; 
        } else if(faction.toUpperCase() == "CULTISTS") {
           return {
                imgUrl: imgUrlPrefix + "volk_10_300.jpg",
                name: "cultists"
            }; 
        } else if(faction.toUpperCase() == "ALCHEMISTS") {
           return {
                imgUrl: imgUrlPrefix + "volk_11_300.jpg",
                name: "alchemists"
            }; 
        } else if(faction.toUpperCase() == "DARKLINGS") {
           return {
                imgUrl: imgUrlPrefix + "volk_12_300.jpg",
                name: "darklings"
            }; 
        } else if(faction.toUpperCase() == "SWARMLINGS") {
           return {
                imgUrl: imgUrlPrefix + "volk_5_300.jpg",
                name: "swarmlings"
            }; 
        } else if(faction.toUpperCase() == "MERMAIDS") {
           return {
                imgUrl: imgUrlPrefix + "volk_6_300.jpg",
                name: "mermaids"
            }; 
        } else if(faction.toUpperCase() == "AUREN") {
           return {
                imgUrl: imgUrlPrefix + "volk_13_300.jpg",
                name: "auren"
            }; 
        } else if(faction.toUpperCase() == "WITCHES") {
           return {
                imgUrl: imgUrlPrefix + "volk_14_300.jpg",
                name: "witches"
            }; 
        } else {
            return null;
        }
    }

    function loadTooltips() {
        $(".explanation").tooltip();
    }
}