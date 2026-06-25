import React, { useState, useEffect, useMemo, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════════════════
// FIFA World Cup 26 — Live Dashboard (Production Build)
//
// Architecture:
//   Data:    Embedded snapshot + live updates via Claude API web search
//   Theme:   Official WC26 black/gold identity with tri-nation accents  
//   Compute: Group standings, mini-league tiebreakers, third-place race,
//            knockout bracket resolution — all in-browser from match results
//   Share:   Canvas → Blob → navigator.share (Android native) → modal fallback
//   Time:    All dates/times in Luanda WAT (UTC+1)
// ═══════════════════════════════════════════════════════════════════════════

const SOURCE_URL = "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";
const DATA_AS_OF = "2026-06-25";
const COOLDOWN_MS = 20000;
const LS_KEY = "wc26_api_key";

const SNAPSHOT = {"name":"World Cup 2026","matches":[{"round":"Matchday 1","date":"2026-06-11","time":"13:00 UTC-6","team1":"Mexico","team2":"South Africa","score":{"ft":[2,0],"ht":[1,0]},"goals1":[{"name":"Julián Quiñones","minute":"9"},{"name":"Raúl Jiménez","minute":"67"}],"goals2":[],"group":"Group A","ground":"Mexico City"},{"round":"Matchday 1","date":"2026-06-11","time":"20:00 UTC-6","team1":"South Korea","team2":"Czech Republic","score":{"ft":[2,1],"ht":[0,0]},"goals1":[{"name":"Hwang In-Beom","minute":"67"},{"name":"Oh Hyeon-Gyu","minute":"80"}],"goals2":[{"name":"Ladislav Krejcí","minute":"59"}],"group":"Group A","ground":"Guadalajara (Zapopan)"},{"round":"Matchday 8","date":"2026-06-18","time":"12:00 UTC-4","team1":"Czech Republic","team2":"South Africa","score":{"ft":[1,1],"ht":[1,0]},"goals1":[{"name":"Michal Sadílek","minute":"6"}],"goals2":[{"name":"Teboho Mokoena","minute":"83","penalty":true}],"group":"Group A","ground":"Atlanta"},{"round":"Matchday 8","date":"2026-06-18","time":"19:00 UTC-6","team1":"Mexico","team2":"South Korea","score":{"ft":[1,0],"ht":[0,0]},"goals1":[{"name":"Luis Romo","minute":"50"}],"goals2":[],"group":"Group A","ground":"Guadalajara (Zapopan)"},{"round":"Matchday 14","date":"2026-06-24","time":"19:00 UTC-6","team1":"Czech Republic","team2":"Mexico","group":"Group A","ground":"Mexico City"},{"round":"Matchday 14","date":"2026-06-24","time":"19:00 UTC-6","team1":"South Africa","team2":"South Korea","group":"Group A","ground":"Monterrey (Guadalupe)"},{"round":"Matchday 2","date":"2026-06-12","time":"15:00 UTC-4","team1":"Canada","team2":"Bosnia & Herzegovina","score":{"ft":[1,1],"ht":[0,1]},"goals1":[{"name":"Cyle Larin","minute":"78"}],"goals2":[{"name":"Jovo Lukić","minute":"21"}],"group":"Group B","ground":"Toronto"},{"round":"Matchday 3","date":"2026-06-13","time":"12:00 UTC-7","team1":"Qatar","team2":"Switzerland","score":{"ft":[1,1],"ht":[0,1]},"goals1":[{"name":"Miro Muheim","minute":"90+4","owngoal":true}],"goals2":[{"name":"Breel Embolo","minute":"17","penalty":true}],"group":"Group B","ground":"San Francisco Bay Area (Santa Clara)"},{"round":"Matchday 8","date":"2026-06-18","time":"12:00 UTC-7","team1":"Switzerland","team2":"Bosnia & Herzegovina","score":{"ft":[4,1],"ht":[0,0]},"goals1":[{"name":"Johan Manzambi","minute":"74"},{"name":"Johan Manzambi","minute":"90"},{"name":"Rubén Vargas","minute":"84"},{"name":"Granit Xhaka","minute":"90+7","penalty":true}],"goals2":[{"name":"Ermin Mahmic","minute":"90+3"}],"group":"Group B","ground":"Los Angeles (Inglewood)"},{"round":"Matchday 8","date":"2026-06-18","time":"15:00 UTC-7","team1":"Canada","team2":"Qatar","score":{"ft":[6,0],"ht":[3,0]},"goals1":[{"name":"Cyle Larin","minute":"16"},{"name":"Jonathan David","minute":"29"},{"name":"Jonathan David","minute":"45+3"},{"name":"Nathan Saliba","minute":"64"},{"name":"Mohamed Manai","minute":"75","owngoal":true},{"name":"Jonathan David","minute":"90+2"}],"goals2":[],"group":"Group B","ground":"Vancouver"},{"round":"Matchday 14","date":"2026-06-24","time":"12:00 UTC-7","team1":"Switzerland","team2":"Canada","group":"Group B","ground":"Vancouver"},{"round":"Matchday 14","date":"2026-06-24","time":"12:00 UTC-7","team1":"Bosnia & Herzegovina","team2":"Qatar","group":"Group B","ground":"Seattle"},{"round":"Matchday 3","date":"2026-06-13","time":"18:00 UTC-4","team1":"Brazil","team2":"Morocco","score":{"ft":[1,1],"ht":[1,1]},"goals1":[{"name":"Vinícius Júnior","minute":"32"}],"goals2":[{"name":"Ismael Saibari","minute":"21"}],"group":"Group C","ground":"New York/New Jersey (East Rutherford)"},{"round":"Matchday 3","date":"2026-06-13","time":"21:00 UTC-4","team1":"Haiti","team2":"Scotland","score":{"ft":[0,1],"ht":[0,1]},"goals1":[],"goals2":[{"name":"John McGinn","minute":"28"}],"group":"Group C","ground":"Boston (Foxborough)"},{"round":"Matchday 9","date":"2026-06-19","time":"18:00 UTC-4","team1":"Scotland","team2":"Morocco","score":{"ft":[0,1],"ht":[0,1]},"goals1":[],"goals2":[{"name":"Ismael Saibari","minute":"2"}],"group":"Group C","ground":"Boston (Foxborough)"},{"round":"Matchday 9","date":"2026-06-19","time":"20:30 UTC-4","team1":"Brazil","team2":"Haiti","score":{"ft":[3,0],"ht":[3,0]},"goals1":[{"name":"Matheus Cunha","minute":"23"},{"name":"Matheus Cunha","minute":"36"},{"name":"Vinícius Júnior","minute":"45+3"}],"goals2":[],"group":"Group C","ground":"Philadelphia"},{"round":"Matchday 14","date":"2026-06-24","time":"18:00 UTC-4","team1":"Scotland","team2":"Brazil","group":"Group C","ground":"Miami (Miami Gardens)"},{"round":"Matchday 14","date":"2026-06-24","time":"18:00 UTC-4","team1":"Morocco","team2":"Haiti","group":"Group C","ground":"Atlanta"},{"round":"Matchday 2","date":"2026-06-12","time":"18:00 UTC-7","team1":"USA","team2":"Paraguay","score":{"ft":[4,1],"ht":[3,0]},"goals1":[{"name":"Damian Bobadilla","minute":"7","owngoal":true},{"name":"Folarin Balogun","minute":"31"},{"name":"Folarin Balogun","minute":"45+5"},{"name":"Giovanni Reyna","minute":"90+8"}],"goals2":[{"name":"Mauricio","minute":"73"}],"group":"Group D","ground":"Los Angeles (Inglewood)"},{"round":"Matchday 3","date":"2026-06-13","time":"21:00 UTC-7","team1":"Australia","team2":"Turkey","score":{"ft":[2,0],"ht":[1,0]},"goals1":[{"name":"Nestory Irankunda","minute":"27"},{"name":"Connor Metcalfe","minute":"75"}],"goals2":[],"group":"Group D","ground":"Vancouver"},{"round":"Matchday 9","date":"2026-06-19","time":"12:00 UTC-7","team1":"USA","team2":"Australia","score":{"ft":[2,0],"ht":[2,0]},"goals1":[{"name":"Cameron Burgess","minute":"11","owngoal":true},{"name":"Alex Freeman","minute":"43"}],"goals2":[],"group":"Group D","ground":"Seattle"},{"round":"Matchday 9","date":"2026-06-19","time":"20:00 UTC-7","team1":"Turkey","team2":"Paraguay","score":{"ft":[0,1],"ht":[0,1]},"goals1":[],"goals2":[{"name":"Matías Galarza","minute":"2"}],"group":"Group D","ground":"San Francisco Bay Area (Santa Clara)"},{"round":"Matchday 15","date":"2026-06-25","time":"19:00 UTC-7","team1":"Turkey","team2":"USA","group":"Group D","ground":"Los Angeles (Inglewood)"},{"round":"Matchday 15","date":"2026-06-25","time":"19:00 UTC-7","team1":"Paraguay","team2":"Australia","group":"Group D","ground":"San Francisco Bay Area (Santa Clara)"},{"round":"Matchday 4","date":"2026-06-14","time":"12:00 UTC-5","team1":"Germany","team2":"Curaçao","score":{"ft":[7,1],"ht":[3,1]},"goals1":[{"name":"Felix Nmecha","minute":"6"},{"name":"Nico Schlotterbeck","minute":"38"},{"name":"Kai Havertz","minute":"45+5","penalty":true},{"name":"Kai Havertz","minute":"88"},{"name":"Jamal Musiala","minute":"47"},{"name":"Nathaniel Brown","minute":"68"},{"name":"Deniz Undav","minute":"78"}],"goals2":[{"name":"Livano Comenencia","minute":"21"}],"group":"Group E","ground":"Houston"},{"round":"Matchday 4","date":"2026-06-14","time":"19:00 UTC-4","team1":"Ivory Coast","team2":"Ecuador","score":{"ft":[1,0],"ht":[0,0]},"goals1":[{"name":"Amad Diallo","minute":"90"}],"goals2":[],"group":"Group E","ground":"Philadelphia"},{"round":"Matchday 10","date":"2026-06-20","time":"16:00 UTC-4","team1":"Germany","team2":"Ivory Coast","score":{"ft":[2,1],"ht":[0,1]},"goals1":[{"name":"Deniz Undav","minute":"68"},{"name":"Deniz Undav","minute":"90+4"}],"goals2":[{"name":"Franck Kessié","minute":"30"}],"group":"Group E","ground":"Toronto"},{"round":"Matchday 10","date":"2026-06-20","time":"19:00 UTC-5","team1":"Ecuador","team2":"Curaçao","score":{"ft":[0,0],"ht":[0,0]},"group":"Group E","ground":"Kansas City"},{"round":"Matchday 15","date":"2026-06-25","time":"16:00 UTC-4","team1":"Curaçao","team2":"Ivory Coast","group":"Group E","ground":"Philadelphia"},{"round":"Matchday 15","date":"2026-06-25","time":"16:00 UTC-4","team1":"Ecuador","team2":"Germany","group":"Group E","ground":"New York/New Jersey (East Rutherford)"},{"round":"Matchday 4","date":"2026-06-14","time":"15:00 UTC-5","team1":"Netherlands","team2":"Japan","score":{"ft":[2,2],"ht":[0,0]},"goals1":[{"name":"Virgil van Dijk","minute":"51"},{"name":"Crysencio Summerville","minute":"64"}],"goals2":[{"name":"Keito Nakamura","minute":"57"},{"name":"Daichi Kamada","minute":"88"}],"group":"Group F","ground":"Dallas (Arlington)"},{"round":"Matchday 4","date":"2026-06-14","time":"20:00 UTC-6","team1":"Sweden","team2":"Tunisia","score":{"ft":[5,1],"ht":[2,1]},"goals1":[{"name":"Yasin Ayari","minute":"7"},{"name":"Yasin Ayari","minute":"90+6"},{"name":"Alexander Isak","minute":"30"},{"name":"Viktor Gyökeres","minute":"59"},{"name":"Mattias Svanberg","minute":"84"}],"goals2":[{"name":"Omar Rekik","minute":"43"}],"group":"Group F","ground":"Monterrey (Guadalupe)"},{"round":"Matchday 10","date":"2026-06-20","time":"12:00 UTC-5","team1":"Netherlands","team2":"Sweden","score":{"ft":[5,1],"ht":[2,0]},"goals1":[{"name":"Brian Brobbey","minute":"5"},{"name":"Brian Brobbey","minute":"17"},{"name":"Cody Gakpo","minute":"47"},{"name":"Cody Gakpo","minute":"54"},{"name":"Crysencio Summerville","minute":"89"}],"goals2":[{"name":"Anthony Elanga","minute":"59"}],"group":"Group F","ground":"Houston"},{"round":"Matchday 10","date":"2026-06-20","time":"22:00 UTC-6","team1":"Tunisia","team2":"Japan","score":{"ft":[0,4],"ht":[0,2]},"goals1":[],"goals2":[{"name":"Daichi Kamada","minute":"4"},{"name":"Ayase Ueda","minute":"31"},{"name":"Ayase Ueda","minute":"83"},{"name":"Junya Ito","minute":"69"}],"group":"Group F","ground":"Monterrey (Guadalupe)"},{"round":"Matchday 15","date":"2026-06-25","time":"18:00 UTC-5","team1":"Japan","team2":"Sweden","group":"Group F","ground":"Dallas (Arlington)"},{"round":"Matchday 15","date":"2026-06-25","time":"18:00 UTC-5","team1":"Tunisia","team2":"Netherlands","group":"Group F","ground":"Kansas City"},{"round":"Matchday 5","date":"2026-06-15","time":"12:00 UTC-7","team1":"Belgium","team2":"Egypt","score":{"ft":[1,1],"ht":[0,1]},"goals1":[{"name":"Mohamed Hany","minute":"66","owngoal":true}],"goals2":[{"name":"Emam Ashour","minute":"19"}],"group":"Group G","ground":"Seattle"},{"round":"Matchday 5","date":"2026-06-15","time":"18:00 UTC-7","team1":"Iran","team2":"New Zealand","score":{"ft":[2,2],"ht":[1,1]},"goals1":[{"name":"Ramin Rezaeian","minute":"32"},{"name":"Mohammad Mohebbi","minute":"64"}],"goals2":[{"name":"Elijah Just","minute":"7"},{"name":"Elijah Just","minute":"54"}],"group":"Group G","ground":"Los Angeles (Inglewood)"},{"round":"Matchday 11","date":"2026-06-21","time":"12:00 UTC-7","team1":"Belgium","team2":"Iran","score":{"ft":[0,0],"ht":[0,0]},"group":"Group G","ground":"Los Angeles (Inglewood)"},{"round":"Matchday 11","date":"2026-06-21","time":"18:00 UTC-7","team1":"New Zealand","team2":"Egypt","score":{"ft":[1,3],"ht":[1,0]},"goals1":[{"name":"Finn Surman","minute":"15"}],"goals2":[{"name":"Mostafa Zico","minute":"58"},{"name":"Mohamed Salah","minute":"67"},{"name":"Trézéguet","minute":"82"}],"group":"Group G","ground":"Vancouver"},{"round":"Matchday 16","date":"2026-06-26","time":"20:00 UTC-7","team1":"Egypt","team2":"Iran","group":"Group G","ground":"Seattle"},{"round":"Matchday 16","date":"2026-06-26","time":"20:00 UTC-7","team1":"New Zealand","team2":"Belgium","group":"Group G","ground":"Vancouver"},{"round":"Matchday 5","date":"2026-06-15","time":"12:00 UTC-4","team1":"Spain","team2":"Cape Verde","score":{"ft":[0,0],"ht":[0,0]},"group":"Group H","ground":"Atlanta"},{"round":"Matchday 5","date":"2026-06-15","time":"18:00 UTC-4","team1":"Saudi Arabia","team2":"Uruguay","score":{"ft":[1,1],"ht":[1,0]},"goals1":[{"name":"Abdulelah Al-Amri","minute":"41"}],"goals2":[{"name":"Maxi Araújo","minute":"80"}],"group":"Group H","ground":"Miami (Miami Gardens)"},{"round":"Matchday 11","date":"2026-06-21","time":"12:00 UTC-4","team1":"Spain","team2":"Saudi Arabia","score":{"ft":[4,0],"ht":[3,0]},"goals1":[{"name":"Lamine Yamal","minute":"10"},{"name":"Mikel Oyarzabal","minute":"21"},{"name":"Mikel Oyarzabal","minute":"24"},{"name":"Hassan Al-Tambakti","minute":"49","owngoal":true}],"goals2":[],"group":"Group H","ground":"Atlanta"},{"round":"Matchday 11","date":"2026-06-21","time":"18:00 UTC-4","team1":"Uruguay","team2":"Cape Verde","score":{"ft":[2,2],"ht":[2,1]},"goals1":[{"name":"Maxi Araújo","minute":"44"},{"name":"Agustín Cano","minute":"45+6"}],"goals2":[{"name":"Kevin Pina","minute":"21"},{"name":"Hélio Varela","minute":"61"}],"group":"Group H","ground":"Miami (Miami Gardens)"},{"round":"Matchday 16","date":"2026-06-26","time":"19:00 UTC-5","team1":"Cape Verde","team2":"Saudi Arabia","group":"Group H","ground":"Houston"},{"round":"Matchday 16","date":"2026-06-26","time":"18:00 UTC-6","team1":"Uruguay","team2":"Spain","group":"Group H","ground":"Guadalajara (Zapopan)"},{"round":"Matchday 6","date":"2026-06-16","time":"15:00 UTC-4","team1":"France","team2":"Senegal","score":{"ft":[3,1],"ht":[0,0]},"goals1":[{"name":"Kylian Mbappé","minute":"66"},{"name":"Kylian Mbappé","minute":"90+6"},{"name":"Bradley Barcola","minute":"82"}],"goals2":[{"name":"Ibrahim Mbaye","minute":"90+5"}],"group":"Group I","ground":"New York/New Jersey (East Rutherford)"},{"round":"Matchday 6","date":"2026-06-16","time":"18:00 UTC-4","team1":"Iraq","team2":"Norway","score":{"ft":[1,4],"ht":[1,2]},"goals1":[{"name":"Aymen Hussein","minute":"39"}],"goals2":[{"name":"Erling Haaland","minute":"29"},{"name":"Erling Haaland","minute":"43"},{"name":"Leo Østigard","minute":"76"},{"name":"Aymen Hussein","minute":"90+6","owngoal":true}],"group":"Group I","ground":"Boston (Foxborough)"},{"round":"Matchday 12","date":"2026-06-22","time":"17:00 UTC-4","team1":"France","team2":"Iraq","score":{"ft":[3,0],"ht":[1,0]},"goals1":[{"name":"Kylian Mbappé","minute":"14"},{"name":"Kylian Mbappé","minute":"54"},{"name":"Ousmane Dembélé","minute":"66"}],"goals2":[],"group":"Group I","ground":"Philadelphia"},{"round":"Matchday 12","date":"2026-06-22","time":"20:00 UTC-4","team1":"Norway","team2":"Senegal","score":{"ft":[3,2],"ht":[1,0]},"goals1":[{"name":"Marcus Holmgren Pedersen","minute":"43"},{"name":"Erling Haaland","minute":"48"},{"name":"Erling Haaland","minute":"58"}],"goals2":[{"name":"Ismaïla Sarr","minute":"53"},{"name":"Ismaïla Sarr","minute":"90+3"}],"group":"Group I","ground":"New York/New Jersey (East Rutherford)"},{"round":"Matchday 16","date":"2026-06-26","time":"15:00 UTC-4","team1":"Norway","team2":"France","group":"Group I","ground":"Boston (Foxborough)"},{"round":"Matchday 16","date":"2026-06-26","time":"15:00 UTC-4","team1":"Senegal","team2":"Iraq","group":"Group I","ground":"Toronto"},{"round":"Matchday 6","date":"2026-06-16","time":"20:00 UTC-5","team1":"Argentina","team2":"Algeria","score":{"ft":[3,0],"ht":[1,0]},"goals1":[{"name":"Lionel Messi","minute":"17"},{"name":"Lionel Messi","minute":"60"},{"name":"Lionel Messi","minute":"76"}],"goals2":[],"group":"Group J","ground":"Kansas City"},{"round":"Matchday 6","date":"2026-06-16","time":"21:00 UTC-7","team1":"Austria","team2":"Jordan","score":{"ft":[3,1],"ht":[1,0]},"goals1":[{"name":"Romano Schmid","minute":"21"},{"name":"Yazan Al-Arab","minute":"76","owngoal":true},{"name":"Marko Arnautovic","minute":"90+12","penalty":true}],"goals2":[{"name":"Ali Olwan","minute":"50"}],"group":"Group J","ground":"San Francisco Bay Area (Santa Clara)"},{"round":"Matchday 12","date":"2026-06-22","time":"12:00 UTC-5","team1":"Argentina","team2":"Austria","score":{"ft":[2,0],"ht":[1,0]},"goals1":[{"name":"Lionel Messi","minute":"38"},{"name":"Lionel Messi","minute":"90+5"}],"goals2":[],"group":"Group J","ground":"Dallas (Arlington)"},{"round":"Matchday 12","date":"2026-06-22","time":"20:00 UTC-7","team1":"Jordan","team2":"Algeria","score":{"ft":[1,2],"ht":[1,0]},"goals1":[{"name":"Nizar Al-Rashdan","minute":"36"}],"goals2":[{"name":"Nadhir Benbouali","minute":"69"},{"name":"Amine Gouiri","minute":"82"}],"group":"Group J","ground":"San Francisco Bay Area (Santa Clara)"},{"round":"Matchday 17","date":"2026-06-27","time":"21:00 UTC-5","team1":"Algeria","team2":"Austria","group":"Group J","ground":"Kansas City"},{"round":"Matchday 17","date":"2026-06-27","time":"21:00 UTC-5","team1":"Jordan","team2":"Argentina","group":"Group J","ground":"Dallas (Arlington)"},{"round":"Matchday 7","date":"2026-06-17","time":"12:00 UTC-5","team1":"Portugal","team2":"DR Congo","score":{"ft":[1,1],"ht":[1,1]},"goals1":[{"name":"João Neves","minute":"6"}],"goals2":[{"name":"Yoane Wissa","minute":"45+5"}],"group":"Group K","ground":"Houston"},{"round":"Matchday 7","date":"2026-06-17","time":"20:00 UTC-6","team1":"Uzbekistan","team2":"Colombia","score":{"ft":[1,3],"ht":[0,1]},"goals1":[{"name":"Abbosbek Fayzullaev","minute":"60"}],"goals2":[{"name":"Daniel Muñoz","minute":"40"},{"name":"Luis Díaz","minute":"65"},{"name":"Jáminton Campaz","minute":"90+9"}],"group":"Group K","ground":"Mexico City"},{"round":"Matchday 13","date":"2026-06-23","time":"12:00 UTC-5","team1":"Portugal","team2":"Uzbekistan","score":{"ft":[5,0],"ht":[3,0]},"goals1":[{"name":"Cristiano Ronaldo","minute":"6"},{"name":"Cristiano Ronaldo","minute":"39"},{"name":"Nuno Mendes","minute":"17"},{"name":"Abduvohid Nematov","minute":"60","owngoal":true},{"name":"Rafael Leão","minute":"87"}],"goals2":[],"group":"Group K","ground":"Houston"},{"round":"Matchday 13","date":"2026-06-23","time":"20:00 UTC-6","team1":"Colombia","team2":"DR Congo","score":{"ft":[1,0],"ht":[0,0]},"goals1":[{"name":"Daniel Muñoz","minute":"76"}],"goals2":[],"group":"Group K","ground":"Guadalajara (Zapopan)"},{"round":"Matchday 17","date":"2026-06-27","time":"19:30 UTC-4","team1":"Colombia","team2":"Portugal","group":"Group K","ground":"Miami (Miami Gardens)"},{"round":"Matchday 17","date":"2026-06-27","time":"19:30 UTC-4","team1":"DR Congo","team2":"Uzbekistan","group":"Group K","ground":"Atlanta"},{"round":"Matchday 7","date":"2026-06-17","time":"15:00 UTC-5","team1":"England","team2":"Croatia","score":{"ft":[4,2],"ht":[2,2]},"goals1":[{"name":"Harry Kane","minute":"12","penalty":true},{"name":"Harry Kane","minute":"42"},{"name":"Jude Bellingham","minute":"47"},{"name":"Marcus Rashford","minute":"85"}],"goals2":[{"name":"Martin Baturina","minute":"36"},{"name":"Petar Musa","minute":"45+5"}],"group":"Group L","ground":"Dallas (Arlington)"},{"round":"Matchday 7","date":"2026-06-17","time":"19:00 UTC-4","team1":"Ghana","team2":"Panama","score":{"ft":[1,0],"ht":[0,0]},"goals1":[{"name":"Caleb Yirenkyi","minute":"90+5"}],"goals2":[],"group":"Group L","ground":"Toronto"},{"round":"Matchday 13","date":"2026-06-23","time":"16:00 UTC-4","team1":"England","team2":"Ghana","score":{"ft":[0,0],"ht":[0,0]},"group":"Group L","ground":"Boston (Foxborough)"},{"round":"Matchday 13","date":"2026-06-23","time":"19:00 UTC-4","team1":"Panama","team2":"Croatia","score":{"ft":[0,1],"ht":[0,0]},"goals1":[],"goals2":[{"name":"Ante Budimir","minute":"54"}],"group":"Group L","ground":"Toronto"},{"round":"Matchday 17","date":"2026-06-27","time":"17:00 UTC-4","team1":"Panama","team2":"England","group":"Group L","ground":"New York/New Jersey (East Rutherford)"},{"round":"Matchday 17","date":"2026-06-27","time":"17:00 UTC-4","team1":"Croatia","team2":"Ghana","group":"Group L","ground":"Philadelphia"},{"round":"Round of 32","num":73,"date":"2026-06-28","time":"12:00 UTC-7","team1":"2A","team2":"2B","ground":"Los Angeles (Inglewood)"},{"round":"Round of 32","num":74,"date":"2026-06-29","time":"16:30 UTC-4","team1":"Germany","team2":"3A/B/C/D/F","ground":"Boston (Foxborough)"},{"round":"Round of 32","num":75,"date":"2026-06-29","time":"19:00 UTC-6","team1":"1F","team2":"2C","ground":"Monterrey (Guadalupe)"},{"round":"Round of 32","num":76,"date":"2026-06-29","time":"12:00 UTC-5","team1":"1C","team2":"2F","ground":"Houston"},{"round":"Round of 32","num":77,"date":"2026-06-30","time":"17:00 UTC-4","team1":"1I","team2":"3C/D/F/G/H","ground":"New York/New Jersey (East Rutherford)"},{"round":"Round of 32","num":78,"date":"2026-06-30","time":"12:00 UTC-5","team1":"2E","team2":"2I","ground":"Dallas (Arlington)"},{"round":"Round of 32","num":79,"date":"2026-06-30","time":"19:00 UTC-6","team1":"Mexico","team2":"3C/E/F/H/I","ground":"Mexico City"},{"round":"Round of 32","num":80,"date":"2026-07-01","time":"12:00 UTC-4","team1":"1L","team2":"3E/H/I/J/K","ground":"Atlanta"},{"round":"Round of 32","num":81,"date":"2026-07-01","time":"17:00 UTC-7","team1":"USA","team2":"3B/E/F/I/J","ground":"San Francisco Bay Area (Santa Clara)"},{"round":"Round of 32","num":82,"date":"2026-07-01","time":"13:00 UTC-7","team1":"1G","team2":"3A/E/H/I/J","ground":"Seattle"},{"round":"Round of 32","num":83,"date":"2026-07-02","time":"19:00 UTC-4","team1":"2K","team2":"2L","ground":"Toronto"},{"round":"Round of 32","num":84,"date":"2026-07-02","time":"12:00 UTC-7","team1":"1H","team2":"2J","ground":"Los Angeles (Inglewood)"},{"round":"Round of 32","num":85,"date":"2026-07-02","time":"20:00 UTC-7","team1":"1B","team2":"3E/F/G/I/J","ground":"Vancouver"},{"round":"Round of 32","num":86,"date":"2026-07-03","time":"18:00 UTC-4","team1":"1J","team2":"2H","ground":"Miami (Miami Gardens)"},{"round":"Round of 32","num":87,"date":"2026-07-03","time":"20:30 UTC-5","team1":"1K","team2":"3D/E/I/J/L","ground":"Kansas City"},{"round":"Round of 32","num":88,"date":"2026-07-03","time":"13:00 UTC-5","team1":"2D","team2":"2G","ground":"Dallas (Arlington)"},{"round":"Round of 16","num":89,"date":"2026-07-04","time":"17:00 UTC-4","team1":"W74","team2":"W77","ground":"Philadelphia"},{"round":"Round of 16","num":90,"date":"2026-07-04","time":"12:00 UTC-5","team1":"W73","team2":"W75","ground":"Houston"},{"round":"Round of 16","num":91,"date":"2026-07-05","time":"16:00 UTC-4","team1":"W76","team2":"W78","ground":"New York/New Jersey (East Rutherford)"},{"round":"Round of 16","num":92,"date":"2026-07-05","time":"18:00 UTC-6","team1":"W79","team2":"W80","ground":"Mexico City"},{"round":"Round of 16","num":93,"date":"2026-07-06","time":"14:00 UTC-5","team1":"W83","team2":"W84","ground":"Dallas (Arlington)"},{"round":"Round of 16","num":94,"date":"2026-07-06","time":"17:00 UTC-7","team1":"W81","team2":"W82","ground":"Seattle"},{"round":"Round of 16","num":95,"date":"2026-07-07","time":"12:00 UTC-4","team1":"W86","team2":"W88","ground":"Atlanta"},{"round":"Round of 16","num":96,"date":"2026-07-07","time":"13:00 UTC-7","team1":"W85","team2":"W87","ground":"Vancouver"},{"round":"Quarter-final","num":97,"date":"2026-07-09","time":"16:00 UTC-4","team1":"W89","team2":"W90","ground":"Boston (Foxborough)"},{"round":"Quarter-final","num":98,"date":"2026-07-10","time":"12:00 UTC-7","team1":"W93","team2":"W94","ground":"Los Angeles (Inglewood)"},{"round":"Quarter-final","num":99,"date":"2026-07-11","time":"17:00 UTC-4","team1":"W91","team2":"W92","ground":"Miami (Miami Gardens)"},{"round":"Quarter-final","num":100,"date":"2026-07-11","time":"20:00 UTC-5","team1":"W95","team2":"W96","ground":"Kansas City"},{"round":"Semi-final","num":101,"date":"2026-07-14","time":"14:00 UTC-5","team1":"W97","team2":"W98","ground":"Dallas (Arlington)"},{"round":"Semi-final","num":102,"date":"2026-07-15","time":"15:00 UTC-4","team1":"W99","team2":"W100","ground":"Atlanta"},{"round":"Match for third place","num":103,"date":"2026-07-18","time":"17:00 UTC-4","team1":"L101","team2":"L102","ground":"Miami (Miami Gardens)"},{"round":"Final","num":104,"date":"2026-07-19","time":"15:00 UTC-4","team1":"W101","team2":"W102","ground":"New York/New Jersey (East Rutherford)"}]};

// ── Team Data ────────────────────────────────────────────────────────────────
const FLAGS = {
  Algeria:"\u{1F1E9}\u{1F1FF}",Argentina:"\u{1F1E6}\u{1F1F7}",Australia:"\u{1F1E6}\u{1F1FA}",
  Austria:"\u{1F1E6}\u{1F1F9}",Belgium:"\u{1F1E7}\u{1F1EA}","Bosnia & Herzegovina":"\u{1F1E7}\u{1F1E6}",
  Brazil:"\u{1F1E7}\u{1F1F7}",Canada:"\u{1F1E8}\u{1F1E6}","Cape Verde":"\u{1F1E8}\u{1F1FB}",
  Colombia:"\u{1F1E8}\u{1F1F4}",Croatia:"\u{1F1ED}\u{1F1F7}","Cura\u00e7ao":"\u{1F1E8}\u{1F1FC}",
  "Czech Republic":"\u{1F1E8}\u{1F1FF}","DR Congo":"\u{1F1E8}\u{1F1E9}",Ecuador:"\u{1F1EA}\u{1F1E8}",
  Egypt:"\u{1F1EA}\u{1F1EC}",England:"\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}",
  France:"\u{1F1EB}\u{1F1F7}",Germany:"\u{1F1E9}\u{1F1EA}",Ghana:"\u{1F1EC}\u{1F1ED}",
  Haiti:"\u{1F1ED}\u{1F1F9}",Iran:"\u{1F1EE}\u{1F1F7}",Iraq:"\u{1F1EE}\u{1F1F6}",
  "Ivory Coast":"\u{1F1E8}\u{1F1EE}",Japan:"\u{1F1EF}\u{1F1F5}",Jordan:"\u{1F1EF}\u{1F1F4}",
  Mexico:"\u{1F1F2}\u{1F1FD}",Morocco:"\u{1F1F2}\u{1F1E6}",Netherlands:"\u{1F1F3}\u{1F1F1}",
  "New Zealand":"\u{1F1F3}\u{1F1FF}",Norway:"\u{1F1F3}\u{1F1F4}",Panama:"\u{1F1F5}\u{1F1E6}",
  Paraguay:"\u{1F1F5}\u{1F1FE}",Portugal:"\u{1F1F5}\u{1F1F9}",Qatar:"\u{1F1F6}\u{1F1E6}",
  "Saudi Arabia":"\u{1F1F8}\u{1F1E6}",Scotland:"\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}",
  Senegal:"\u{1F1F8}\u{1F1F3}","South Africa":"\u{1F1FF}\u{1F1E6}","South Korea":"\u{1F1F0}\u{1F1F7}",
  Spain:"\u{1F1EA}\u{1F1F8}",Sweden:"\u{1F1F8}\u{1F1EA}",Switzerland:"\u{1F1E8}\u{1F1ED}",
  Tunisia:"\u{1F1F9}\u{1F1F3}",Turkey:"\u{1F1F9}\u{1F1F7}",USA:"\u{1F1FA}\u{1F1F8}",
  Uruguay:"\u{1F1FA}\u{1F1FE}",Uzbekistan:"\u{1F1FA}\u{1F1FF}",
};
const fl = (t) => FLAGS[t] || "\u2022";

const CODE3 = {
  Algeria:"ALG",Argentina:"ARG",Australia:"AUS",Austria:"AUT",Belgium:"BEL",
  "Bosnia & Herzegovina":"BIH",Brazil:"BRA",Canada:"CAN","Cape Verde":"CPV",
  Colombia:"COL",Croatia:"CRO","Cura\u00e7ao":"CUW","Czech Republic":"CZE",
  "DR Congo":"COD",Ecuador:"ECU",Egypt:"EGY",England:"ENG",France:"FRA",
  Germany:"GER",Ghana:"GHA",Haiti:"HAI",Iran:"IRN",Iraq:"IRQ","Ivory Coast":"CIV",
  Japan:"JPN",Jordan:"JOR",Mexico:"MEX",Morocco:"MAR",Netherlands:"NED",
  "New Zealand":"NZL",Norway:"NOR",Panama:"PAN",Paraguay:"PAR",Portugal:"POR",
  Qatar:"QAT","Saudi Arabia":"KSA",Scotland:"SCO",Senegal:"SEN","South Africa":"RSA",
  "South Korea":"KOR",Spain:"ESP",Sweden:"SWE",Switzerland:"SUI",Tunisia:"TUN",
  Turkey:"TUR",USA:"USA",Uruguay:"URU",Uzbekistan:"UZB",
};
const c3 = (t) => CODE3[t] || "";

const ALIAS = {
  "korea republic":"South Korea","south korea":"South Korea",korea:"South Korea",
  czechia:"Czech Republic","t\u00fcrkiye":"Turkey",turkiye:"Turkey",turkey:"Turkey",
  "c\u00f4te d'ivoire":"Ivory Coast","ivory coast":"Ivory Coast",
  "congo dr":"DR Congo","dr congo":"DR Congo","cabo verde":"Cape Verde",
  "united states":"USA",usa:"USA","bosnia and herzegovina":"Bosnia & Herzegovina",
};
const canon = (n) => ALIAS[(n||"").toLowerCase().trim()] || n;

// ── Palette (WC26 brand-aligned) ─────────────────────────────────────────────
const C = {
  gold:"#EFC15B", goldDeep:"#C8922E", blue:"#3F7BE0", green:"#38C06B",
  red:"#E14B3C", chalk:"#F4F4F0", muted:"#9A9AA4", faint:"#66666E",
  line:"#2A2A31", panel:"#161619", panel2:"#101013", ink:"#0A0A0C",
};

// ── Time Helpers (Luanda WAT = UTC+1) ────────────────────────────────────────
const OFF = 1;
function parseKO(date, time) {
  if (!date) return null;
  const m = (time||"").match(/(\d+):(\d+)\s*UTC([+-]\d+)/);
  const [y,mo,d] = date.split("-").map(Number);
  if (!m) return new Date(Date.UTC(y,mo-1,d,12,0));
  return new Date(Date.UTC(y,mo-1,d,Number(m[1])-Number(m[3]),Number(m[2])));
}
function luanda(dt) {
  if (!dt) return {day:"",time:""};
  const l = new Date(dt.getTime()+OFF*3600000);
  return {
    day: l.toLocaleDateString("en-GB",{weekday:"short",day:"2-digit",month:"short",timeZone:"UTC"}),
    time: l.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit",hour12:false,timeZone:"UTC"}),
  };
}
const todayISO = () => new Date(Date.now()+OFF*3600000).toISOString().slice(0,10);
function matchDateLuanda(m) {
  const dt = parseKO(m.date,m.time);
  return dt ? new Date(dt.getTime()+OFF*3600000).toISOString().slice(0,10) : m.date;
}
function labelDay(iso) {
  const [y,mo,d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y,mo-1,d)).toLocaleDateString("en-GB",{weekday:"short",day:"2-digit",month:"short",timeZone:"UTC"});
}

// ── Standings Engine ─────────────────────────────────────────────────────────
const emptyRow = (t) => ({team:t,P:0,W:0,D:0,L:0,GF:0,GA:0,GD:0,Pts:0});

function computeGroups(matches) {
  const G = {};
  for (const m of matches) {
    if (!m.group) continue;
    const g = m.group;
    G[g] = G[g]||{};
    G[g][m.team1] = G[g][m.team1]||emptyRow(m.team1);
    G[g][m.team2] = G[g][m.team2]||emptyRow(m.team2);
    const ft = m.score && m.score.ft;
    if (!ft) continue;
    const [a,b] = ft, r1 = G[g][m.team1], r2 = G[g][m.team2];
    r1.P++; r2.P++; r1.GF+=a; r1.GA+=b; r2.GF+=b; r2.GA+=a;
    if (a>b) {r1.W++;r2.L++;r1.Pts+=3;}
    else if (a<b) {r2.W++;r1.L++;r2.Pts+=3;}
    else {r1.D++;r2.D++;r1.Pts++;r2.Pts++;}
  }
  const out = {};
  for (const g of Object.keys(G)) {
    let rows = Object.values(G[g]);
    rows.forEach(r => r.GD = r.GF - r.GA);
    rows.sort((a,b) => b.Pts-a.Pts || b.GD-a.GD || b.GF-a.GF);
    out[g] = breakTies(matches, g, rows);
  }
  return out;
}

function miniLeague(matches, g, teams) {
  const names = teams.map(t=>t.team), set = new Set(names), tab = {};
  names.forEach(n => tab[n]={p:0,gd:0,gf:0});
  for (const m of matches) {
    if (m.group!==g || !m.score?.ft) continue;
    if (!set.has(m.team1)||!set.has(m.team2)) continue;
    const [x,y]=m.score.ft;
    tab[m.team1].gf+=x; tab[m.team2].gf+=y;
    tab[m.team1].gd+=x-y; tab[m.team2].gd+=y-x;
    if(x>y)tab[m.team1].p+=3;else if(x<y)tab[m.team2].p+=3;else{tab[m.team1].p++;tab[m.team2].p++;}
  }
  return [...teams].sort((a,b) => {
    const A=tab[a.team],B=tab[b.team];
    return B.p-A.p||B.gd-A.gd||B.gf-A.gf||a.team.localeCompare(b.team);
  });
}

function breakTies(matches, g, rows) {
  const out=[]; let i=0;
  while (i<rows.length) {
    let j=i+1;
    while (j<rows.length && rows[j].Pts===rows[i].Pts && rows[j].GD===rows[i].GD && rows[j].GF===rows[i].GF) j++;
    const block = rows.slice(i,j);
    out.push(...(block.length>1 ? miniLeague(matches,g,block) : block));
    i=j;
  }
  return out;
}

function computeThirds(gt) {
  const thirds = [];
  for (const g of Object.keys(gt)) if (gt[g][2]) thirds.push({...gt[g][2], group:g});
  thirds.sort((a,b) => b.Pts-a.Pts||b.GD-a.GD||b.GF-a.GF||a.team.localeCompare(b.team));
  return thirds;
}

// ── Knockout Resolver ────────────────────────────────────────────────────────
function buildResolver(matches, gt) {
  const byNum = {}; matches.forEach(m => { if(m.num) byNum[m.num]=m; });
  const done = {}; Object.keys(gt).forEach(g => {
    done[g] = matches.filter(m=>m.group===g&&m.score?.ft).length>=6;
  });
  const cache = {};
  function resolve(token, d=0) {
    if (!token||d>12) return null;
    if (cache[token]!==undefined) return cache[token];
    let res=null;
    if (/^[12][A-L]$/.test(token)) {
      const pos=Number(token[0])-1, g="Group "+token[1];
      if (done[g]&&gt[g]?.[pos]) res=gt[g][pos].team;
    } else if (/^[WL]\d+$/.test(token)) {
      const want=token[0], m=byNum[Number(token.slice(1))];
      if (m?.score?.ft) {
        const t1=resolve(m.team1,d+1)||(FLAGS[m.team1]?m.team1:null);
        const t2=resolve(m.team2,d+1)||(FLAGS[m.team2]?m.team2:null);
        const [a,b]=m.score.ft;
        if (t1&&t2&&a!==b) res = want==="W" ? (a>b?t1:t2) : (a>b?t2:t1);
      }
    } else if (FLAGS[token]) res=token;
    cache[token]=res; return res;
  }
  return resolve;
}
function slotLabel(t) {
  if (/^[12][A-L]$/.test(t)) return (t[0]==="1"?"Winner ":"Runner-up ")+"Group "+t[1];
  if (/\//.test(t)) return "3rd: "+t.replace(/^3/,"").split("/").join(" / ");
  if (/^W\d+$/.test(t)) return "W#"+t.slice(1);
  if (/^L\d+$/.test(t)) return "L#"+t.slice(1);
  return t;
}

// ═════════════════════════════════════════════════════════════════════════════
// APP
// ═════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [data, setData] = useState(SNAPSHOT);
  const [status, setStatus] = useState("snapshot"); // snapshot|loading|live|error
  const [note, setNote] = useState("");
  const [updated, setUpdated] = useState(null);
  const [dataAsOf, setDataAsOf] = useState(DATA_AS_OF);
  const [lastRefresh, setLastRefresh] = useState(0);
  const [tab, setTab] = useState("groups");
  const [detail, setDetail] = useState(null);
  const [share, setShare] = useState(null);
  const [shareErr, setShareErr] = useState("");
  const [apiKey, setApiKey] = useState(() => { try { return localStorage.getItem(LS_KEY)||""; } catch(e){ return ""; } });
  const [showKeyInput, setShowKeyInput] = useState(false);

  const matches = data.matches||[];
  const groupTables = useMemo(() => computeGroups(matches), [matches]);
  const thirds = useMemo(() => computeThirds(groupTables), [groupTables]);
  const resolve = useMemo(() => buildResolver(matches, groupTables), [matches, groupTables]);
  const groupGames = matches.filter(m=>m.group);
  const played = groupGames.filter(m=>m.score?.ft).length;
  const today = todayISO();
  const todayMatches = matches.filter(m => matchDateLuanda(m)===today && (m.group || m.score?.ft));
  const ageDays = Math.max(0,Math.floor((Date.parse(today)-Date.parse(dataAsOf))/86400000));
  const stale = status!=="live" && ageDays>=1;
  const hasUnverified = matches.some(m=>m.src==="web"&&m.score?.ft);

  // ── Refresh ────────────────────────────────────────────────────────────────────────────
  function mergeResults(currentMatches, arr) {
    const idx = {};
    currentMatches.forEach((m,i) => { if(m.group) idx[[canon(m.team1),canon(m.team2)].sort().join("|")]=i; });
    const next = currentMatches.map(m=>({...m}));
    let filled=0, corrected=0;
    for (const r of arr) {
      if (!r?.s || !Array.isArray(r.s) || r.s.length!==2) continue;
      if (!Number.isFinite(r.s[0])||!Number.isFinite(r.s[1])) continue;
      const key = [canon(r.a),canon(r.b)].sort().join("|");
      const i = idx[key]; if (i===undefined) continue;
      const swap = canon(next[i].team1)!==canon(r.a);
      const ft = swap ? [r.s[1],r.s[0]] : [r.s[0],r.s[1]];
      const ex = next[i].score?.ft;
      if (ex && ex[0]===ft[0] && ex[1]===ft[1]) continue;
      if (ex) corrected++; else filled++;
      next[i] = {...next[i], score:{...(next[i].score||{}),ft}, src:"web"};
    }
    return {next, filled, corrected, total:filled+corrected};
  }

  function extractArray(text) {
    // Extract the first standalone JSON array, avoiding nested ones inside objects
    const standalone = text.match(/(?:^|[\s,:\[])([\[][\s\S]*?[\]])(?=[\s,:\]]|$)/);
    const raw = standalone ? standalone[1] : text.match(/\[[\s\S]*\]/)?.[0];
    if (!raw) return null;
    let s = raw;
    for (let k=0;k<3;k++) {
      try { const v=JSON.parse(s); if(Array.isArray(v)) return v; } catch(e){}
      const cut=s.lastIndexOf("]",s.length-2); if(cut<0)break; s=s.slice(0,cut+1);
    }
    return null;
  }

  const refresh = useCallback(async (auto) => {
    const now=Date.now();
    if (!auto && now-lastRefresh<COOLDOWN_MS) { setNote("Just refreshed \u2014 wait a few seconds."); return; }
    if (status==="loading") return;
    setLastRefresh(now); setStatus("loading"); setNote("\uD83D\uDD0D Searching for latest results\u2026");
    const errors=[];
    const key = apiKey || (typeof window!=="undefined" && window.ANTHROPIC_API_KEY) || "";

    // Path 1: Claude API + web search
    if (key) {
      try {
        const names = Object.keys(FLAGS).join(", ");
        const r = await fetch("https://api.anthropic.com/v1/messages", {
          method:"POST",
          headers:{"Content-Type":"application/json","x-api-key":key,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
          body: JSON.stringify({
            model:"claude-sonnet-4-6", max_tokens:2048,
            messages:[{role:"user",content:
              "Search the web for ALL 2026 FIFA World Cup group stage results played so far. "+
              "Today is "+todayISO()+". Return ONLY a JSON array, no prose, no markdown. "+
              "Each item: {\"a\":\"Home\",\"b\":\"Away\",\"s\":[hg,ag]}. "+
              "Use EXACTLY these team names: "+names+". Include every played match. Omit unplayed."}],
            tools:[{type:"web_search_20250305",name:"web_search"}],
          }),
        });
        if (!r.ok) { const b=await r.text().catch(()=>""); throw new Error("API "+r.status+": "+b.slice(0,80)); }
        const d = await r.json();
        const text = (d.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("\n");
        const arr = extractArray(text);
        if (!arr||arr.length===0) throw new Error("no parseable results");
        setData(prev => {
          const cur = prev.matches||[];
          const {next,filled,corrected,total} = mergeResults(cur, arr);
          if (total>0) {
            const p=[]; if(filled)p.push(filled+" new"); if(corrected)p.push(corrected+" corrected");
            setTimeout(()=>setNote("\u2705 Updated: "+p.join(", ")+" result"+(total>1?"s":"")+" via web search."),0);
          } else {
            setTimeout(()=>setNote("\u2705 All "+arr.length+" results matched \u2014 standings are current."),0);
          }
          return {...prev, matches:next};
        });
        setStatus("live"); setUpdated(new Date()); setDataAsOf(todayISO()); return;
      } catch(e) { errors.push("Web search: "+(e.message||String(e))); }
    } else {
      errors.push("Web search: no API key (tap the key \u{1F511} icon to add one)");
    }

    // Path 2: GitHub raw (fallback)
    try {
      setNote("Trying direct source\u2026");
      const r = await fetch(SOURCE_URL,{cache:"no-store"});
      if (!r.ok) throw new Error("HTTP "+r.status);
      const json = await r.json(); if(!json.matches) throw new Error("bad payload");
      const p = json.matches.filter(m=>m.group&&m.score?.ft).length;
      setData(json); setStatus("live"); setUpdated(new Date()); setDataAsOf(todayISO());
      setNote("\u2705 Pulled from openfootball \u2014 "+p+" group matches played."); return;
    } catch(e) { errors.push("GitHub: "+(e.message||String(e))); }

    setStatus("snapshot");
    setNote("\u26A0 Could not update. Showing embedded data ("+played+" matches, as of "+dataAsOf+"). Errors: "+errors.join(" | "));
  }, [apiKey, lastRefresh, status, played, dataAsOf]);

  useEffect(() => { refresh(true); }, []);

  // ── Share System ─────────────────────────────────────────────────────────
  async function doShare(drawFn, title, filename) {
    setShareErr(""); setShare(null);
    let step="init";
    try {
      step="drawing"; const canvas = await drawFn();
      if (!(canvas instanceof HTMLCanvasElement)) throw new Error("not a canvas");
      step="to blob";
      const blob = await new Promise((ok,no) => canvas.toBlob(b=>b?ok(b):no(new Error("toBlob null")),"image/png"));
      step="native share";
      if (navigator.share && navigator.canShare) {
        const file = new File([blob], filename, {type:"image/png"});
        if (navigator.canShare({files:[file]})) {
          try { await navigator.share({files:[file],title}); return; }
          catch(e) { if(e.name==="AbortError") return; }
        }
      }
      step="modal"; setShare({url:URL.createObjectURL(blob), title, filename, blob});
    } catch(e) { setShareErr("Share failed at "+step+": "+(e.message||String(e))); }
  }

  const shareStandings = () => doShare(()=>drawStandings(groupTables,played,groupGames.length,dataAsOf,hasUnverified),"WC26 Standings","wc26-standings.png");
  const shareMatch = (m) => doShare(()=>drawMatch(m,resolve,dataAsOf),"WC26 Match","wc26-match.png");
  const shareGroup = (g,rows) => doShare(()=>drawGroup(g,rows,dataAsOf),"WC26 "+g,"wc26-"+g.toLowerCase().replace(/ /g,"-")+".png");
  const shareToday = () => doShare(()=>drawToday(todayMatches,resolve,dataAsOf),"WC26 Today","wc26-today.png");
  const shareThirds = () => doShare(()=>drawThirds(thirds,dataAsOf),"WC26 Third-Place Race","wc26-thirds.png");

  // ── Render ───────────────────────────────────────────────────────────────
  const asOfLabel = (() => { try { const [y,m,d]=dataAsOf.split("-").map(Number); return new Date(Date.UTC(y,m-1,d)).toLocaleDateString("en-GB",{day:"2-digit",month:"short",timeZone:"UTC"}); } catch(e){return dataAsOf;} })();

  return (
    <div style={{minHeight:"100vh",background:`radial-gradient(130% 90% at 50% -15%,#1a1a1f 0%,${C.panel2} 55%,#08080A 100%)`,color:C.chalk,fontFamily:"'Noto Sans',system-ui,sans-serif"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Anton&family=Archivo:wght@500;600;700;800;900&family=Noto+Sans:wght@400;500;600;700&display=swap');
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}
        @keyframes fade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
        .D{font-family:Archivo,sans-serif;font-weight:800}
        .A{font-family:Anton,sans-serif;font-weight:400}
        .N{font-variant-numeric:tabular-nums;font-family:Archivo,sans-serif;font-weight:700}
        *{box-sizing:border-box}::selection{background:${C.gold};color:${C.ink}}
        .sc{scrollbar-width:thin;scrollbar-color:${C.line} transparent}
        .tap{cursor:pointer;transition:border-color .15s}.tap:hover{border-color:${C.gold}!important}
      `}</style>

      <div style={{maxWidth:1180,margin:"0 auto",padding:"0 16px 64px"}}>

        {/* ── Header ─────────────────────────────────────────────── */}
        <header style={{paddingTop:26,paddingBottom:14}}>
          <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
            <div style={{display:"flex",alignItems:"center",gap:14}}>
              <div className="A" style={{flex:"0 0 auto",width:58,height:58,borderRadius:12,background:`linear-gradient(150deg,${C.gold},${C.goldDeep})`,color:C.ink,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",lineHeight:.82,fontSize:26,boxShadow:"0 4px 18px rgba(239,193,91,0.25)"}}>
                <span>2</span><span>6</span>
              </div>
              <div>
                <div className="D" style={{letterSpacing:3,fontSize:11.5,color:C.gold,textTransform:"uppercase"}}>Canada \u00b7 Mexico \u00b7 USA</div>
                <h1 className="A" style={{margin:"1px 0 0",fontSize:38,lineHeight:.95,letterSpacing:.5,textTransform:"uppercase"}}>World Cup <span style={{color:C.gold}}>26</span></h1>
                <div style={{color:C.muted,fontSize:12.5,marginTop:5}}>Live standings \u00b7 tap any match for scorers \u00b7 Luanda (WAT)</div>
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{textAlign:"right"}}>
                <div style={{display:"flex",alignItems:"center",gap:7,justifyContent:"flex-end",fontSize:12,color:C.muted}}>
                  <span style={{width:8,height:8,borderRadius:9,background:status==="live"?C.green:status==="loading"?C.gold:status==="error"?C.red:C.muted,animation:status==="live"?"pulse 1.6s infinite":"none"}} />
                  {status==="live"?"Live":status==="loading"?"Updating\u2026":status==="error"?"Offline":"Snapshot"}
                </div>
                <div style={{fontSize:11,color:C.faint,marginTop:2}}>{status==="live"&&updated?"Updated "+updated.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"}):"Data as of "+asOfLabel}</div>
              </div>
              <Btn onClick={shareStandings} ghost>Share</Btn>
              <button onClick={()=>setShowKeyInput(v=>!v)} title={apiKey?"API key set":"Add API key for live updates"} style={{cursor:"pointer",background:"none",border:`1px solid ${apiKey?C.green:C.line}`,color:apiKey?C.green:C.muted,padding:"10px 11px",borderRadius:8,fontSize:14,lineHeight:1}}>\uD83D\uDD11</button>
              <Btn onClick={()=>refresh(false)} disabled={status==="loading"}>{status==="loading"?"\u2026":"Refresh"}</Btn>
            </div>
            {showKeyInput&&<div style={{marginTop:10,display:"flex",gap:8,alignItems:"center",animation:"fade .2s"}}>
              <input type="password" value={apiKey} onChange={e=>{const v=e.target.value.trim();setApiKey(v);try{v?localStorage.setItem(LS_KEY,v):localStorage.removeItem(LS_KEY);}catch(ex){}}} placeholder="Paste Anthropic API key for live web search" style={{flex:1,background:C.panel2,border:`1px solid ${C.line}`,color:C.chalk,padding:"9px 11px",borderRadius:8,fontSize:13,outline:"none"}} />
              <Btn onClick={()=>{setShowKeyInput(false);if(apiKey)refresh(false);}}>OK</Btn>
            </div>}
          </div>

          <div style={{marginTop:16}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:C.muted,marginBottom:6}}>
              <span className="D" style={{letterSpacing:1,textTransform:"uppercase"}}>Group stage progress</span>
              <span className="N">{played} / {groupGames.length}</span>
            </div>
            <div style={{height:6,background:C.line,borderRadius:6,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${groupGames.length?(played/groupGames.length)*100:0}%`,background:`linear-gradient(90deg,${C.gold},${C.green})`,borderRadius:6,transition:"width .6s"}} />
            </div>
          </div>

          {stale && <Banner color={C.gold} bg>{"\u26A0"} Frozen data from {asOfLabel} ({ageDays}d old). Tap Refresh. Don't share as current.</Banner>}
          {hasUnverified && <Banner color={C.gold}>{"\u26A0"} Some results from web search are marked unverified.</Banner>}
          {note && <Banner color={status==="error"?C.red:C.muted}>{note}</Banner>}
        </header>

        {todayMatches.length>0 && <TodayStrip matches={todayMatches} resolve={resolve} onOpen={setDetail} onShare={shareToday} />}

        <Nav tab={tab} set={setTab} />

        {tab==="groups" && <GroupsTab gt={groupTables} thirds={thirds} onShareG={shareGroup} onShareT={shareThirds} />}
        {tab==="fixtures" && <FixturesTab matches={matches} resolve={resolve} today={today} onOpen={setDetail} />}
        {tab==="bracket" && <BracketTab matches={matches} resolve={resolve} onOpen={setDetail} thirds={thirds} gt={groupTables} />}
        {tab==="rules" && <RulesTab />}

        <footer style={{marginTop:32,paddingTop:16,borderTop:`1px solid ${C.line}`,fontSize:11.5,color:C.faint,display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
          <span>Data: openfootball/worldcup.json (public domain) \u00b7 {status==="live"?"live":"snapshot"}</span>
          <span>Luanda (WAT, UTC+1) \u00b7 calculated in-browser</span>
        </footer>
      </div>

      {detail && <MatchDetail m={detail} resolve={resolve} onShare={shareMatch} onClose={()=>setDetail(null)} />}
      {share && <ShareModal url={share.url} title={share.title} filename={share.filename} blob={share.blob} onClose={()=>{try{URL.revokeObjectURL(share.url)}catch(e){}setShare(null)}} />}
      {shareErr && <div onClick={()=>setShareErr("")} style={{position:"fixed",bottom:20,left:16,right:16,zIndex:70,background:C.red,color:"#fff",padding:"12px 16px",borderRadius:10,fontSize:13,fontWeight:600,animation:"fade .3s",cursor:"pointer"}}>{shareErr} <span style={{float:"right",opacity:.7}}>dismiss</span></div>}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// UI COMPONENTS
// ═════════════════════════════════════════════════════════════════════════════
function Btn({onClick,disabled,ghost,children}) {
  return <button onClick={onClick} disabled={disabled} className="D" style={{cursor:disabled?"default":"pointer",border:ghost?`1px solid ${C.line}`:"none",background:ghost?"transparent":C.gold,color:ghost?C.chalk:C.ink,padding:"10px 15px",borderRadius:8,fontWeight:700,fontSize:13,letterSpacing:.5,textTransform:"uppercase",opacity:disabled?.6:1}}>{children}</button>;
}
function ShareBtn({onClick}) {
  return <button onClick={e=>{e.stopPropagation();onClick();}} className="D" style={{cursor:"pointer",background:"none",border:`1px solid ${C.line}`,color:C.muted,padding:"4px 10px",borderRadius:6,fontSize:11,letterSpacing:.5,textTransform:"uppercase"}}>{"\u2197"} Share</button>;
}
function Banner({color,bg,children}) {
  return <div style={{marginTop:10,fontSize:12.5,color:bg?C.ink:color,background:bg?color:"rgba(239,193,91,0.08)",border:bg?"none":`1px solid rgba(239,193,91,0.4)`,borderRadius:8,padding:"8px 11px",fontWeight:bg?600:400,animation:"fade .3s"}}>{children}</div>;
}
function FlagE({t,h=15}) { return <span style={{fontSize:Math.round(h*1.05),lineHeight:1,verticalAlign:"middle"}}>{fl(t)}</span>; }
function Side({name,score,small}) {
  const known=!!FLAGS[name];
  return <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,padding:"1px 0"}}>
    <span style={{display:"flex",alignItems:"center",gap:6,fontSize:small?13:14,color:known?C.chalk:C.muted,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}><FlagE t={name} h={small?13:15} /> {name}</span>
    {score!==null&&score!==undefined && <span className="N" style={{fontWeight:700,fontSize:small?14:16}}>{score}</span>}
  </div>;
}

// ── Today Strip ──────────────────────────────────────────────────────────────
function TodayStrip({matches,resolve,onOpen,onShare}) {
  return <div style={{background:C.panel,border:`1px solid ${C.line}`,borderRadius:12,padding:"12px 14px",marginTop:4}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
      <span className="D" style={{fontSize:12,letterSpacing:2,textTransform:"uppercase",color:C.blue,fontWeight:600}}>{"\u25CF"} Today's matches</span>
      <ShareBtn onClick={onShare} />
    </div>
    <div style={{display:"flex",gap:10,overflowX:"auto"}} className="sc">
      {matches.map((m,i)=>{const t1=resolve(m.team1)||m.team1,t2=resolve(m.team2)||m.team2,ft=m.score?.ft,{time}=luanda(parseKO(m.date,m.time));
        return <div key={i} className="tap" onClick={()=>onOpen(m)} style={{minWidth:168,flex:"0 0 auto",background:C.panel2,border:`1px solid ${C.line}`,borderRadius:9,padding:"9px 11px"}}>
          <div style={{fontSize:10,color:C.faint,marginBottom:5}}>{m.group||m.round} \u00b7 {ft?"FT":time}</div>
          <Side name={t1} score={ft?ft[0]:null} small /><Side name={t2} score={ft?ft[1]:null} small />
        </div>;})}
    </div>
  </div>;
}

// ── Nav ──────────────────────────────────────────────────────────────────────
function Nav({tab,set}) {
  return <nav style={{display:"flex",gap:4,margin:"22px 0 18px",borderBottom:`1px solid ${C.line}`}}>
    {[["groups","Groups"],["fixtures","Fixtures"],["bracket","Bracket"],["rules","Rules"]].map(([id,label])=>{const on=tab===id;
      return <button key={id} onClick={()=>set(id)} className="D" style={{cursor:"pointer",background:"none",border:"none",color:on?C.chalk:C.muted,fontSize:15,fontWeight:on?700:500,letterSpacing:.6,textTransform:"uppercase",padding:"10px 14px",borderBottom:on?`2px solid ${C.gold}`:"2px solid transparent",marginBottom:-1}}>{label}</button>;})}
  </nav>;
}

// ── Groups ───────────────────────────────────────────────────────────────────
function GroupsTab({gt,thirds,onShareG,onShareT}) {
  const qualT = new Set(thirds.slice(0,8).map(t=>t.group));
  return <div>
    <ThirdPlaceRace thirds={thirds} onShare={onShareT} />
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))",gap:14}}>
      {Object.keys(gt).sort().map(g=><GroupCard key={g} g={g} rows={gt[g]} tq={qualT.has(g)} onShare={()=>onShareG(g,gt[g])} />)}
    </div>
  </div>;
}
function GroupCard({g,rows,tq,onShare}) {
  return <div style={{background:C.panel,border:`1px solid ${C.line}`,borderRadius:12,overflow:"hidden"}}>
    <div className="D" style={{padding:"11px 14px",fontSize:16,fontWeight:700,letterSpacing:1,borderBottom:`1px solid ${C.line}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <span>{g}</span>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:11,color:C.faint,fontWeight:500}}>P W D L \u00b7 PTS</span>
        <ShareBtn onClick={onShare} />
      </div>
    </div>
    <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}><tbody>
      {rows.map((r,i)=>{const col=i<2?C.gold:i===2?(tq?C.blue:C.faint):C.faint;
        return <React.Fragment key={r.team}>
          <tr style={{borderTop:i?`1px solid ${C.panel2}`:"none"}}>
            <td style={{padding:"8px 4px 8px 12px",width:18}}><span style={{display:"inline-block",width:4,height:22,borderRadius:3,background:col,verticalAlign:"middle"}} /></td>
            <td className="N" style={{width:16,color:C.faint,textAlign:"center"}}>{i+1}</td>
            <td style={{padding:"8px 6px"}}><span style={{display:"flex",alignItems:"center",gap:7}}><FlagE t={r.team} /><span style={{fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:130}}>{r.team}</span></span></td>
            <td className="N" style={{textAlign:"center",color:C.muted,fontSize:12,whiteSpace:"nowrap"}}>{r.P} {r.W} {r.D} {r.L}</td>
            <td className="N" style={{textAlign:"center",color:C.muted,fontSize:12,width:34}}>{r.GD>0?"+":""}{r.GD}</td>
            <td className="N" style={{textAlign:"right",padding:"8px 12px 8px 6px",fontWeight:700,fontSize:15}}>{r.Pts}</td>
          </tr>
          {i===1&&<tr><td colSpan={6} style={{padding:0}}><div style={{height:0,borderTop:`1px dashed ${C.gold}`,margin:"0 12px",opacity:.5}} /></td></tr>}
        </React.Fragment>;})}
    </tbody></table>
  </div>;
}
function ThirdPlaceRace({thirds,onShare}) {
  const ranked = thirds.filter(t=>t.P>0);
  return <div style={{background:C.panel,border:`1px solid ${C.line}`,borderRadius:12,padding:16,marginBottom:18}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",flexWrap:"wrap",gap:8}}>
      <h2 className="D" style={{margin:0,fontSize:19,fontWeight:700,letterSpacing:.5}}>Race for the <span style={{color:C.blue}}>8 best third-placed</span> teams</h2>
      <div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:12,color:C.muted}}>Top 8 \u2192 Round of 32</span><ShareBtn onClick={onShare} /></div>
    </div>
    {ranked.length===0?<p style={{color:C.muted,fontSize:13,margin:"12px 0 0"}}>No third-placed standings yet.</p>
    :<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:8,marginTop:14}}>
      {ranked.map((t,i)=>{const q=i<8;return <div key={t.team} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",background:q?"rgba(239,193,91,0.10)":C.panel2,border:`1px solid ${q?"rgba(239,193,91,0.4)":C.line}`,borderRadius:8}}>
        <span className="N" style={{fontSize:13,color:q?C.gold:C.faint,width:18,fontWeight:700}}>{i+1}</span>
        <FlagE t={t.team} h={16} />
        <div style={{minWidth:0}}><div style={{fontSize:13,fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{t.team}</div>
          <div className="N" style={{fontSize:11,color:C.muted}}>{t.group.replace("Group ","Grp ")} \u00b7 {t.Pts}pt \u00b7 {t.GD>0?"+":""}{t.GD}</div>
        </div></div>;})}
    </div>}
    <div style={{fontSize:11,color:C.faint,marginTop:12}}>Order: points \u2192 GD \u2192 GF. Third-place bracket slots assigned by FIFA combination table once all 12 groups finish.</div>
  </div>;
}

// ── Fixtures ─────────────────────────────────────────────────────────────────
function FixturesTab({matches,resolve,today,onOpen}) {
  const [filter,setFilter]=useState("all");
  const groups=Array.from(new Set(matches.filter(m=>m.group).map(m=>m.group))).sort();
  const filtered=matches.filter(m=>filter==="all"?true:filter==="ko"?!m.group:m.group===filter);
  const byDate={};filtered.forEach(m=>{const k=matchDateLuanda(m);(byDate[k]=byDate[k]||[]).push(m);});
  const dates=Object.keys(byDate).sort();
  const chip=(id,label)=>{const on=filter===id;return <button key={id} onClick={()=>setFilter(id)} className="D" style={{cursor:"pointer",border:`1px solid ${on?C.gold:C.line}`,background:on?"rgba(239,193,91,0.14)":"transparent",color:on?C.gold:C.muted,padding:"5px 11px",borderRadius:7,fontSize:12,letterSpacing:.5,textTransform:"uppercase",fontWeight:600}}>{label}</button>;};
  return <div>
    <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:16}}>{chip("all","All")}{groups.map(g=>chip(g,g.replace("Group ","")))}{chip("ko","Knockout")}</div>
    {dates.map(d=>{const isT=d===today;return <div key={d} style={{marginBottom:18}}>
      <div className="D" style={{fontSize:13,letterSpacing:1,textTransform:"uppercase",color:isT?C.blue:C.muted,marginBottom:8,fontWeight:600,display:"flex",alignItems:"center",gap:8}}>{labelDay(d)}{isT&&<span style={{fontSize:10,background:C.blue,color:"#fff",padding:"1px 6px",borderRadius:4}}>TODAY</span>}</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:10}}>
        {byDate[d].sort((a,b)=>parseKO(a.date,a.time)-parseKO(b.date,b.time)).map((m,i)=>{const t1=resolve(m.team1)||m.team1,t2=resolve(m.team2)||m.team2,ft=m.score?.ft,{time}=luanda(parseKO(m.date,m.time));
          return <div key={i} className="tap" onClick={()=>onOpen(m)} style={{background:C.panel,border:`1px solid ${C.line}`,borderRadius:10,padding:"10px 13px"}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.faint,marginBottom:6}}><span>{m.group||m.round}</span><span>{ft?(m.src==="web"?"FT \u26A0":"FT"):time} \u00b7 {m.ground}</span></div>
            <Side name={t1} score={ft?ft[0]:null} /><Side name={t2} score={ft?ft[1]:null} />
          </div>;})}
      </div>
    </div>;})}
  </div>;
}

// ── Bracket ──────────────────────────────────────────────────────────────────
function BracketTab({matches,resolve,onOpen,thirds,gt}) {
  const rounds=[["Round of 32","Round of 32"],["Round of 16","Round of 16"],["Quarter-final","Quarter-finals"],["Semi-final","Semi-finals"],["Final","Final"]];
  const gDone=Object.keys(gt).filter(g=>gt[g].every(r=>r.P>=3)).length;
  return <div>
    <div style={{fontSize:12,color:C.muted,marginBottom:12}}>Tap a tie for details. Scroll toward the Final on 19 July.</div>
    <div style={{background:"rgba(239,193,91,0.07)",border:`1px solid rgba(239,193,91,0.35)`,borderRadius:10,padding:"10px 12px",marginBottom:14,fontSize:12.5,color:"#d4d4cf"}}>
      <b style={{color:C.gold}}>Third-place slots</b> are assigned by FIFA's combination table after all 12 groups finish ({gDone}/12 done). Placeholders are expected.
      {gDone===12&&thirds.length>=8&&<div style={{marginTop:8,display:"flex",flexWrap:"wrap",gap:6}}><span style={{color:C.muted,marginRight:4}}>Qualified:</span>{thirds.slice(0,8).map(t=><span key={t.team} style={{fontSize:12,background:C.panel2,border:`1px solid ${C.line}`,borderRadius:6,padding:"2px 7px"}}><FlagE t={t.team} h={12} /> {t.team}</span>)}</div>}
    </div>
    <div className="sc" style={{display:"flex",gap:18,overflowX:"auto",paddingBottom:12}}>
      {rounds.map(([key,label])=><div key={key} style={{minWidth:240,flex:"0 0 auto"}}>
        <div className="D" style={{fontSize:13,letterSpacing:1,textTransform:"uppercase",color:C.gold,marginBottom:10,fontWeight:600}}>{label}</div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>{matches.filter(m=>m.round===key).map(m=><BracketTie key={m.num} m={m} resolve={resolve} onOpen={onOpen} />)}</div>
      </div>)}
      <div style={{minWidth:220,flex:"0 0 auto"}}>
        <div className="D" style={{fontSize:13,letterSpacing:1,textTransform:"uppercase",color:C.faint,marginBottom:10,fontWeight:600}}>3rd place</div>
        {matches.filter(m=>m.round==="Match for third place").map(m=><BracketTie key={m.num} m={m} resolve={resolve} onOpen={onOpen} />)}
      </div>
    </div>
  </div>;
}
function BracketTie({m,resolve,onOpen}) {
  const r1=resolve(m.team1),r2=resolve(m.team2),ft=m.score?.ft,{day,time}=luanda(parseKO(m.date,m.time));
  const ln=(token,resolved,score)=>{const k=!!resolved;return <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,padding:"5px 0"}}>
    <span style={{display:"flex",alignItems:"center",gap:6,minWidth:0}}>
      <span style={{display:"inline-flex",width:21,justifyContent:"center"}}>{k?<FlagE t={resolved} h={14} />:<span style={{color:C.faint}}>{"\u25A2"}</span>}</span>
      <span style={{fontSize:k?13:11,color:k?C.chalk:C.faint,fontWeight:k?600:400,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{k?resolved:slotLabel(token)}</span>
    </span>{score!=null&&<span className="N" style={{fontWeight:700}}>{score}</span>}</div>;};
  return <div className="tap" onClick={()=>onOpen(m)} style={{background:C.panel,border:`1px solid ${C.line}`,borderRadius:9,padding:"8px 11px"}}>
    <div style={{fontSize:9.5,color:C.faint,marginBottom:3}}>#{m.num} \u00b7 {day} {time}</div>
    {ln(m.team1,r1,ft?ft[0]:null)}<div style={{borderTop:`1px solid ${C.panel2}`}} />{ln(m.team2,r2,ft?ft[1]:null)}
  </div>;
}

// ── Match Detail ─────────────────────────────────────────────────────────────
function MatchDetail({m,resolve,onShare,onClose}) {
  const t1=resolve(m.team1)||m.team1,t2=resolve(m.team2)||m.team2,ft=m.score?.ft;
  const k1=FLAGS[t1],k2=FLAGS[t2],{day,time}=luanda(parseKO(m.date,m.time));
  const q=encodeURIComponent(`${k1?t1:m.team1} vs ${k2?t2:m.team2} World Cup 2026`);
  const g1=m.goals1||[],g2=m.goals2||[];
  const goalCol=(goals,align)=><div style={{flex:1,textAlign:align}}>{goals.length===0?<span style={{color:C.faint,fontSize:12}}>{ft?"\u2014":""}</span>:goals.map((g,i)=><div key={i} style={{fontSize:12.5,color:"#cdd8d1",marginBottom:3}}>{g.name} <span className="N" style={{color:C.gold}}>{g.minute}'</span></div>)}</div>;
  return <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(6,6,8,0.72)",display:"flex",alignItems:"center",justifyContent:"center",padding:16,zIndex:50,animation:"fade .2s"}}>
    <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:460,background:C.panel,border:`1px solid ${C.line}`,borderRadius:16,overflow:"hidden"}}>
      <div style={{padding:"14px 16px",borderBottom:`1px solid ${C.line}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span className="D" style={{fontSize:13,letterSpacing:1,textTransform:"uppercase",color:C.gold,fontWeight:600}}>{m.group||m.round}</span>
        <button onClick={onClose} style={{cursor:"pointer",background:"none",border:"none",color:C.muted,fontSize:22,lineHeight:1}}>{"\u00D7"}</button>
      </div>
      <div style={{padding:"18px 16px"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:14}}>
          <div style={{flex:1,textAlign:"right"}}><div style={{display:"flex",justifyContent:"flex-end"}}>{k1?<FlagE t={t1} h={30} />:<span style={{fontSize:28,color:C.faint}}>{"\u25A2"}</span>}</div><div style={{fontSize:14,fontWeight:600,marginTop:2,color:k1?C.chalk:C.muted}}>{k1?t1:slotLabel(m.team1)}</div></div>
          <div className="N" style={{fontSize:34,fontWeight:700,minWidth:90,textAlign:"center"}}>{ft?`${ft[0]} \u2013 ${ft[1]}`:<span style={{fontSize:15,color:C.muted}}>{time}</span>}</div>
          <div style={{flex:1,textAlign:"left"}}><div style={{display:"flex",justifyContent:"flex-start"}}>{k2?<FlagE t={t2} h={30} />:<span style={{fontSize:28,color:C.faint}}>{"\u25A2"}</span>}</div><div style={{fontSize:14,fontWeight:600,marginTop:2,color:k2?C.chalk:C.muted}}>{k2?t2:slotLabel(m.team2)}</div></div>
        </div>
        {ft&&(g1.length>0||g2.length>0)&&<div style={{display:"flex",gap:10,marginTop:16,paddingTop:14,borderTop:`1px solid ${C.line}`}}>{goalCol(g1,"right")}<div style={{color:C.faint,fontSize:14,alignSelf:"flex-start"}}>{"\u26BD"}</div>{goalCol(g2,"left")}</div>}
        <div style={{marginTop:16,fontSize:12.5,color:C.muted,lineHeight:1.7}}>
          <div>{"\uD83D\uDCC5"} {day} \u00b7 <b style={{color:C.chalk}}>{time}</b> Luanda</div>
          <div>{"\uD83D\uDCCD"} {m.ground}</div>
        </div>
        <div style={{display:"flex",gap:8,marginTop:16}}>
          <Btn onClick={()=>onShare(m)}>Share image</Btn>
          <a href={`https://www.google.com/search?q=${q}`} target="_blank" rel="noopener noreferrer" style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",background:"transparent",color:C.chalk,border:`1px solid ${C.line}`,padding:"11px",borderRadius:9,fontWeight:700,fontSize:13,textDecoration:"none",letterSpacing:.3}}>{ft?"Match report \u2197":"Follow live \u2197"}</a>
        </div>
      </div>
    </div>
  </div>;
}

// ── Rules ────────────────────────────────────────────────────────────────────
function RulesTab() {
  const B=({title,children})=><div style={{background:C.panel,border:`1px solid ${C.line}`,borderRadius:12,padding:"16px 18px",marginBottom:14}}><h3 className="D" style={{margin:"0 0 10px",fontSize:16,fontWeight:700,letterSpacing:.5,color:C.gold}}>{title}</h3>{children}</div>;
  const s={fontSize:13.5,lineHeight:1.65,color:"#cdd8d1",margin:"0 0 7px"};
  return <div style={{maxWidth:760}}>
    <B title="Format \u2014 first 48-team World Cup"><ul style={{margin:0,paddingLeft:18}}><li style={s}>48 teams in 12 groups of 4. Each team plays the other three once.</li><li style={s}>Win = 3 pts, draw = 1, loss = 0.</li><li style={s}><b style={{color:C.gold}}>Top 2 per group</b> advance, plus the <b style={{color:C.blue}}>8 best third-placed teams</b> \u2014 32 of 48 reach the knockouts.</li><li style={s}>Knockouts: R32 \u2192 R16 \u2192 QF \u2192 SF \u2192 Final (19 Jul, MetLife). Ties: extra time then penalties.</li></ul></B>
    <B title="Tiebreakers (FIFA order)"><ol style={{margin:0,paddingLeft:18}}><li style={s}>Points</li><li style={s}>Goal difference</li><li style={s}>Goals scored</li><li style={s}>Mini-league among tied teams (pts \u2192 GD \u2192 GF)</li><li style={s}>Fair play / drawing of lots (not simulated; falls to alphabetical)</li></ol></B>
    <B title="How it updates"><p style={{...s,margin:0}}><b>Refresh</b> searches the web for the latest results and merges them in. It runs on load and on tap. Results found this way are flagged <b>{"\u26A0"} unverified</b>. If web search fails, it tries the openfootball.json source directly. If both fail, the embedded snapshot is shown. The status line tells you what happened. <b>Share</b> generates an image card from any block.</p></B>
  </div>;
}

// ═════════════════════════════════════════════════════════════════════════════
// CANVAS SHARE SYSTEM
// ═════════════════════════════════════════════════════════════════════════════
const F = {S:"'Noto Sans',Arial,sans-serif", D:"Archivo,Arial,sans-serif", A:"Anton,'Arial Narrow',Archivo,sans-serif"};
const K = {GOLD:"#EFC15B",INK:"#0E0E11",PANEL:"#17171B",LINE:"#2A2A31",WHITE:"#F4F4F0",MUTE:"#9A9AA4",FAINT:"#5C5C64",GREEN:"#38C06B",RED:"#E14B3C",BLUE:"#3F7BE0"};

function rr(x,px,py,w,h,r){x.beginPath();x.moveTo(px+r,py);x.arcTo(px+w,py,px+w,py+h,r);x.arcTo(px+w,py+h,px,py+h,r);x.arcTo(px,py+h,px,py,r);x.arcTo(px,py,px+w,py,r);x.closePath();}
function trn(x,s,max){if(x.measureText(s).width<=max)return s;let t=s;while(t.length>1&&x.measureText(t+"\u2026").width>max)t=t.slice(0,-1);return t+"\u2026";}

function mkCanvas(W,H) {
  const c=document.createElement("canvas");c.width=W;c.height=H;
  const x=c.getContext("2d");
  const bg=x.createLinearGradient(0,0,0,H);
  bg.addColorStop(0,"#1A1A1F");bg.addColorStop(.5,"#101013");bg.addColorStop(1,"#08080A");
  x.fillStyle=bg;x.fillRect(0,0,W,H);x.textBaseline="alphabetic";
  return {c,x};
}
function d26(x,cx,cy,sz) {
  rr(x,cx-sz/2,cy-sz/2,sz,sz,sz*.19);x.fillStyle=K.GOLD;x.fill();
  x.fillStyle=K.INK;x.textAlign="center";x.font=`${sz*.47}px ${F.A}`;
  x.fillText("2",cx,cy-sz*.04);x.fillText("6",cx,cy+sz*.38);
}
function dFooter(x,W,H,dataAsOf) {
  x.textAlign="center";x.fillStyle=K.FAINT;x.font=`400 22px ${F.S}`;
  x.fillText(`data as of ${dataAsOf} \u00b7 openfootball.json`,W/2,H-60);
  x.fillStyle=K.GOLD;x.font=`600 22px ${F.D}`;
  x.fillText("WORLD CUP 26 \u00b7 CANADA \u00b7 MEXICO \u00b7 USA",W/2,H-30);
}

// ── 1. Standings Card (1080x1350) ────────────────────────────────────────────
async function drawStandings(gt,played,total,dataAsOf,unv) {
  try{await document.fonts?.ready}catch(e){}
  const W=1080,H=1350,{c,x}=mkCanvas(W,H);
  d26(x,60,68,60);
  x.textAlign="left";x.fillStyle=K.GOLD;x.font=`600 22px ${F.D}`;x.fillText("CANADA \u00b7 MEXICO \u00b7 USA",150,86);
  x.fillStyle=K.WHITE;x.font=`58px ${F.A}`;x.fillText("WORLD CUP STANDINGS",150,132);
  const date=new Date(Date.now()+3600000).toLocaleDateString("en-GB",{day:"numeric",month:"long",timeZone:"UTC"});
  x.fillStyle=K.MUTE;x.font=`400 26px ${F.S}`;x.fillText(`${date}  \u00b7  ${played}/${total} group matches played`,60,196);
  const letters=Object.keys(gt).sort(),cols=3,rows=4,mx=60,top=238,gap=22,footer=70;
  const gw=(W-mx*2-(cols-1)*gap)/cols,gh=(H-top-footer-(rows-1)*gap)/rows;
  letters.forEach((L,idx)=>{
    const col=idx%cols,row=Math.floor(idx/cols),px=mx+col*(gw+gap),py=top+row*(gh+gap);
    x.fillStyle=K.PANEL;rr(x,px,py,gw,gh,14);x.fill();
    x.strokeStyle=K.LINE;x.lineWidth=1;rr(x,px,py,gw,gh,14);x.stroke();
    x.save();rr(x,px,py,gw,gh,14);x.clip();x.fillStyle=K.GOLD;x.fillRect(px,py,5,gh);x.restore();
    x.fillStyle=K.WHITE;x.font=`26px ${F.A}`;x.textAlign="left";x.fillText(L.toUpperCase(),px+20,py+38);
    gt[L].slice(0,2).forEach((r,i)=>{
      const ry=py+78+i*42;
      x.font=`28px ${F.S}`;x.textAlign="left";x.fillText(fl(r.team),px+16,ry+2);
      x.fillStyle=i===0?K.GOLD:"#2E2E36";rr(x,px+52,ry-18,50,24,5);x.fill();
      x.fillStyle=i===0?K.INK:K.WHITE;x.font=`700 14px ${F.D}`;x.textAlign="center";x.fillText(c3(r.team),px+77,ry);
      x.textAlign="left";x.fillStyle=K.WHITE;x.font=`600 20px ${F.S}`;x.fillText(trn(x,r.team,gw-178),px+110,ry);
      x.textAlign="right";x.fillStyle=K.GOLD;x.font=`24px ${F.A}`;x.fillText(String(r.Pts),px+gw-16,ry);
      x.textAlign="left";
    });
  });
  dFooter(x,W,H,dataAsOf);
  if(unv){x.textAlign="left";x.fillStyle=K.GOLD;x.font=`600 20px ${F.S}`;x.fillText("\u26A0 includes unverified web-search results",60,H-14);}
  return c;
}

// ── 2. Match Card (1080x1080) ────────────────────────────────────────────────
async function drawMatch(m,resolve,dataAsOf) {
  try{await document.fonts?.ready}catch(e){}
  const W=1080,H=1080,{c,x}=mkCanvas(W,H);
  const t1=resolve(m.team1)||m.team1,t2=resolve(m.team2)||m.team2;
  const k1=!!FLAGS[t1],k2=!!FLAGS[t2],ft=m.score?.ft,{day,time}=luanda(parseKO(m.date,m.time));
  const cx=W/2,cL=W*.28,cR=W*.72;
  d26(x,cx,74,68);
  x.textAlign="center";x.fillStyle=K.GOLD;x.font=`600 22px ${F.D}`;
  x.fillText("WORLD CUP 26 \u00b7 "+(m.group||m.round).toUpperCase(),cx,148);
  x.fillStyle=K.MUTE;x.font=`400 24px ${F.S}`;x.fillText(`${day} \u00b7 ${time} (Luanda)`,cx,184);
  x.font=`72px ${F.S}`;x.fillText(k1?fl(t1):"\u25A2",cL,278);x.fillText(k2?fl(t2):"\u25A2",cR,278);
  const dC=(ccx,t,k)=>{x.fillStyle=k?K.GOLD:"#2E2E36";rr(x,ccx-40,298,80,34,7);x.fill();x.fillStyle=k?K.INK:K.WHITE;x.font=`700 22px ${F.D}`;x.textAlign="center";x.fillText(k?c3(t):"\u2014",ccx,323);};
  dC(cL,t1,k1);dC(cR,t2,k2);
  x.fillStyle=K.WHITE;x.font=`28px ${F.A}`;x.textAlign="center";
  const nf=s=>{let t=s;while(t.length>1&&x.measureText(t).width>W*.42)t=t.slice(0,-1);return t===s?s:t.trim()+"\u2026";};
  x.fillText(nf((k1?t1:slotLabel(m.team1)).toUpperCase()),cL,372);
  x.fillText(nf((k2?t2:slotLabel(m.team2)).toUpperCase()),cR,372);
  if(ft){x.fillStyle=K.WHITE;x.font=`110px ${F.A}`;x.fillText(`${ft[0]} : ${ft[1]}`,cx,470);
    x.fillStyle=K.FAINT;x.font=`600 22px ${F.D}`;x.fillText("FULL TIME"+(m.src==="web"?"  \u00b7  \u26A0 UNVERIFIED":""),cx,508);
  }else{x.fillStyle=K.GOLD;x.font=`74px ${F.A}`;x.fillText(time,cx,456);x.fillStyle=K.FAINT;x.font=`600 22px ${F.D}`;x.fillText("KICKOFF (LUANDA)",cx,498);}
  x.strokeStyle=K.LINE;x.lineWidth=1;x.beginPath();x.moveTo(80,536);x.lineTo(W-80,536);x.stroke();
  const g1=m.goals1||[],g2=m.goals2||[],fg=gl=>`${gl.name} ${gl.minute}'${gl.penalty?" (P)":gl.owngoal?" (OG)":""}`;
  const ds=(goals,gcx,align)=>{x.textAlign=align;x.fillStyle="#d4d4d0";x.font=`400 26px ${F.S}`;goals.slice(0,7).forEach((gl,i)=>x.fillText(fg(gl),gcx,588+i*38));};
  if(ft){if(g1.length||g2.length){x.fillStyle=K.GOLD;x.textAlign="center";x.font=`24px ${F.S}`;x.fillText("\u26BD",cx,590);ds(g1,cx-60,"right");ds(g2,cx+60,"left");}
  else{x.textAlign="center";x.fillStyle=K.FAINT;x.font=`400 26px ${F.S}`;x.fillText("No goalscorer data",cx,600);}}
  else{x.textAlign="center";x.fillStyle=K.MUTE;x.font=`400 26px ${F.S}`;x.fillText("Not played yet",cx,600);}
  x.textAlign="center";x.fillStyle=K.MUTE;x.font=`400 26px ${F.S}`;x.fillText("\uD83D\uDCCD "+m.ground,cx,H-110);
  dFooter(x,W,H,dataAsOf); return c;
}

// ── 3. Group Card (1080x720) ─────────────────────────────────────────────────
async function drawGroup(g,rows,dataAsOf) {
  try{await document.fonts?.ready}catch(e){}
  const W=1080,H=720,{c,x}=mkCanvas(W,H);
  d26(x,60,68,60);x.textAlign="left";x.fillStyle=K.WHITE;x.font=`48px ${F.A}`;x.fillText(g.toUpperCase(),110,86);
  const top=140,rh=110;
  x.fillStyle=K.FAINT;x.font=`500 16px ${F.D}`;x.textAlign="right";x.fillText("P   W   D   L     GD",W-160,top-10);x.fillText("PTS",W-52,top-10);x.textAlign="left";
  rows.forEach((r,i)=>{
    const ry=top+i*rh,zone=i<2?K.GOLD:i===2?K.BLUE:K.FAINT;
    x.fillStyle=i%2===0?K.PANEL:"#13131A";x.fillRect(40,ry,W-80,rh);
    x.fillStyle=zone;x.fillRect(40,ry,6,rh);
    x.fillStyle=zone;x.font=`700 36px ${F.A}`;x.textAlign="center";x.fillText(String(i+1),80,ry+66);
    x.font=`36px ${F.S}`;x.textAlign="left";x.fillText(fl(r.team),110,ry+64);
    x.fillStyle=K.GOLD;x.font=`700 20px ${F.D}`;x.fillText(c3(r.team),160,ry+48);
    x.fillStyle=K.WHITE;x.font=`600 28px ${F.S}`;x.fillText(r.team,160,ry+76);
    x.fillStyle=K.MUTE;x.font=`400 22px ${F.S}`;x.textAlign="right";x.fillText(`${r.P}  ${r.W}  ${r.D}  ${r.L}   ${r.GD>=0?"+":""}${r.GD}`,W-160,ry+66);
    x.fillStyle=K.GOLD;x.font=`48px ${F.A}`;x.fillText(String(r.Pts),W-60,ry+72);x.textAlign="left";
  });
  dFooter(x,W,H,dataAsOf); return c;
}

// ── 4. Today Card (1080x1080) ────────────────────────────────────────────────
async function drawToday(todayMatches,resolve,dataAsOf) {
  try{await document.fonts?.ready}catch(e){}
  const W=1080,H=1080,{c,x}=mkCanvas(W,H);
  d26(x,W/2,74,68);
  x.textAlign="center";x.fillStyle=K.GOLD;x.font=`600 24px ${F.D}`;x.fillText("TODAY'S MATCHES",W/2,148);
  const date=new Date(Date.now()+3600000).toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric",timeZone:"UTC"});
  x.fillStyle=K.MUTE;x.font=`400 24px ${F.S}`;x.fillText(date+" (Luanda)",W/2,182);
  const n=todayMatches.length,top=220,avail=H-top-100,cardH=Math.min(160,Math.floor(avail/Math.max(n,1))-14);
  todayMatches.forEach((m,i)=>{
    const t1=resolve(m.team1)||m.team1,t2=resolve(m.team2)||m.team2,ft=m.score?.ft,{time}=luanda(parseKO(m.date,m.time));
    const ry=top+i*(cardH+14);
    x.fillStyle=K.PANEL;rr(x,60,ry,W-120,cardH,14);x.fill();x.strokeStyle=K.LINE;x.lineWidth=1;rr(x,60,ry,W-120,cardH,14);x.stroke();
    x.fillStyle=K.FAINT;x.font=`500 18px ${F.D}`;x.textAlign="left";x.fillText(m.group||m.round,84,ry+30);
    x.textAlign="right";x.fillText(ft?"FT":time,W-84,ry+30);
    const mid=ry+cardH*.62;
    x.textAlign="left";x.font=`32px ${F.S}`;x.fillText(fl(t1),84,mid);
    x.fillStyle=K.WHITE;x.font=`600 26px ${F.S}`;x.fillText(t1,132,mid);
    x.font=`32px ${F.S}`;x.fillText(fl(t2),84,mid+40);x.fillStyle=K.WHITE;x.font=`600 26px ${F.S}`;x.fillText(t2,132,mid+40);
    if(ft){x.textAlign="right";x.fillStyle=K.WHITE;x.font=`700 34px ${F.A}`;x.fillText(String(ft[0]),W-84,mid+2);x.fillText(String(ft[1]),W-84,mid+42);}
    x.textAlign="left";
  });
  dFooter(x,W,H,dataAsOf); return c;
}

// ── 5. Third-Place Race Card (1080x1080) ─────────────────────────────────────
async function drawThirds(thirds,dataAsOf) {
  try{await document.fonts?.ready}catch(e){}
  const W=1080,H=1080,{c,x}=mkCanvas(W,H);
  const ranked=thirds.filter(t=>t.P>0);
  d26(x,W/2,68,64);
  x.textAlign="center";x.fillStyle=K.GOLD;x.font=`600 24px ${F.D}`;x.fillText("RACE FOR THE 8 BEST THIRD-PLACED TEAMS",W/2,140);
  x.fillStyle=K.MUTE;x.font=`400 22px ${F.S}`;x.fillText("Top 8 qualify for the Round of 32",W/2,172);
  const top=210,rh=62;
  ranked.forEach((t,i)=>{
    const ry=top+i*rh,q=i<8,cut=i===7||(i===ranked.length-1&&ranked.length<8&&ranked.length>0);
    x.fillStyle=q?"rgba(239,193,91,0.08)":K.PANEL;rr(x,60,ry,W-120,rh-6,10);x.fill();
    x.strokeStyle=q?"rgba(239,193,91,0.3)":K.LINE;x.lineWidth=1;rr(x,60,ry,W-120,rh-6,10);x.stroke();
    x.fillStyle=q?K.GOLD:K.FAINT;x.font=`700 28px ${F.A}`;x.textAlign="center";x.fillText(String(i+1),100,ry+40);
    x.font=`28px ${F.S}`;x.textAlign="left";x.fillText(fl(t.team),130,ry+40);
    x.fillStyle=K.GOLD;x.font=`700 18px ${F.D}`;x.fillText(c3(t.team),172,ry+28);
    x.fillStyle=K.WHITE;x.font=`600 24px ${F.S}`;x.fillText(t.team,172,ry+48);
    x.fillStyle=K.MUTE;x.font=`400 20px ${F.S}`;x.textAlign="right";x.fillText(t.group.replace("Group ","Grp "),W-260,ry+40);
    x.fillStyle=K.MUTE;x.font=`400 22px ${F.S}`;x.fillText(`GD ${t.GD>=0?"+":""}${t.GD}  GF ${t.GF}`,W-130,ry+40);
    x.fillStyle=K.GOLD;x.font=`36px ${F.A}`;x.fillText(String(t.Pts),W-70,ry+44);x.textAlign="left";
    if(cut){x.strokeStyle=K.RED;x.lineWidth=2;x.setLineDash([8,6]);x.beginPath();x.moveTo(60,ry+rh-2);x.lineTo(W-60,ry+rh-2);x.stroke();x.setLineDash([]);
      x.fillStyle=K.RED;x.font=`600 16px ${F.D}`;x.textAlign="right";x.fillText("\u2191 QUALIFY    ELIMINATED \u2193",W-70,ry+rh+14);x.textAlign="left";}
  });
  dFooter(x,W,H,dataAsOf); return c;
}

// ═════════════════════════════════════════════════════════════════════════════
// SHARE MODAL
// ═════════════════════════════════════════════════════════════════════════════
function ShareModal({url,title,filename,blob,onClose}) {
  async function nativeShare(){try{const f=new File([blob],filename,{type:"image/png"});await navigator.share({files:[f],title});}catch(e){if(e.name!=="AbortError")alert("Share failed: "+e.message);}}
  const hasNative=typeof navigator!=="undefined"&&navigator.share&&navigator.canShare;
  return <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(6,6,8,0.85)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:16,zIndex:60,animation:"fade .2s"}}>
    <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:380,background:C.panel,border:`1px solid ${C.line}`,borderRadius:16,overflow:"hidden"}}>
      <div style={{padding:"12px 14px",borderBottom:`1px solid ${C.line}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span className="D" style={{fontSize:13,letterSpacing:1,textTransform:"uppercase",color:C.gold,fontWeight:700}}>{title||"Share"}</span>
        <button onClick={onClose} style={{cursor:"pointer",background:"none",border:"none",color:C.muted,fontSize:24,lineHeight:1}}>{"\u00D7"}</button>
      </div>
      <div style={{padding:14}}>
        <img src={url} alt={title} style={{width:"100%",borderRadius:10,display:"block",border:`1px solid ${C.line}`}} />
        <div style={{fontSize:12,color:C.muted,textAlign:"center",margin:"12px 0"}}>Long-press the image to save it directly.</div>
        {hasNative&&<button onClick={nativeShare} className="D" style={{cursor:"pointer",width:"100%",padding:"13px",borderRadius:9,fontWeight:700,fontSize:14,letterSpacing:.5,textTransform:"uppercase",textAlign:"center",border:"none",background:C.gold,color:C.ink}}>Share / Save\u2026</button>}
      </div>
    </div>
  </div>;
}
