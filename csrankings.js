/*

  CSrankings.ts

  @author Emery Berger <emery@cs.umass.edu> http://www.emeryberger.com

*/
/// <reference path="./typescript/jquery.d.ts" />
/// <reference path="./typescript/papaparse.d.ts" />
/// <reference path="./typescript/set.d.ts" />
/// <reference path="./typescript/d3.d.ts" />
/// <reference path="./typescript/d3pie.d.ts" />
;
;
;
;
;
var CSRankings = (function () {
    function CSRankings() {
        CSRankings.setAllCheckboxes();
        CSRankings.initAreaDict();
        CSRankings.loadAliases(function () {
            CSRankings.loadHomepages(function () {
                CSRankings.loadAuthorInfo(function () {
                    CSRankings.loadCountryInfo(CSRankings.rank);
                });
            });
        });
    }
    CSRankings.translateNameToDBLP = function (name) {
        // Ex: "Emery D. Berger" -> "http://dblp.uni-trier.de/pers/hd/b/Berger:Emery_D="
        // First, replace spaces and non-ASCII characters (not complete).
        // Known issue: does not properly handle suffixes like Jr., III, etc.
        name = name.replace(/'/g, "=");
        name = name.replace(/\-/g, "=");
        name = name.replace(/\./g, "=");
        name = name.replace(/Á/g, "=Aacute=");
        name = name.replace(/á/g, "=aacute=");
        name = name.replace(/è/g, "=egrave=");
        name = name.replace(/é/g, "=eacute=");
        name = name.replace(/ó/g, "=oacute=");
        name = name.replace(/ç/g, "=ccedil=");
        name = name.replace(/ä/g, "=auml=");
        name = name.replace(/ö/g, "=ouml=");
        name = name.replace(/ü/g, "=uuml=");
        var splitName = name.split(" ");
        var newname = "";
        var lastName = splitName[splitName.length - 1];
        splitName.pop();
        var newName = splitName.join(" ");
        newName = newName.replace(/\s/g, "_");
        newName = newName.replace(/\-/g, "=");
        var str = "http://dblp.uni-trier.de/pers/hd";
        var lastInitial = lastName[0].toLowerCase();
        str += "/" + lastInitial + "/" + lastName + ":" + newName;
        return str;
    };
    /* Build the areaDict dictionary: areas -> names used in pie charts
       and areaPosition dictionary: areas -> position in area array
    */
    CSRankings.initAreaDict = function () {
        for (var i = 0; i < CSRankings.areaNames.length; i++) {
            CSRankings.areaDict[CSRankings.areas[i]] = CSRankings.areaNames[i];
            CSRankings.areaPosition[CSRankings.areas[i]] = i;
        }
    };
    /* Create the prologue that we preface each generated HTML page with (the results). */
    CSRankings.makePrologue = function () {
        var s = "<html>"
            + "<head>"
            + '<style type="text/css">'
            + '  body { font-family: "Helvetica", "Arial"; }'
            + "  table td { vertical-align: top; }"
            + "</style>"
            + "</head>"
            + "<body>"
            + '<div class="row">'
            + '<div class="table" style="overflow:auto; height: 650px;">'
            + '<table class="table-sm table-striped"'
            + 'id="ranking" valign="top">';
        return s;
    };
    /* from http://hubrik.com/2015/11/16/sort-by-last-name-with-javascript/ */
    CSRankings.compareNames = function (a, b) {
        //split the names as strings into arrays
        var aName = a.split(" ");
        var bName = b.split(" ");
        // get the last names by selecting
        // the last element in the name arrays
        // using array.length - 1 since full names
        // may also have a middle name or initial
        var aLastName = aName[aName.length - 1];
        var bLastName = bName[bName.length - 1];
        // compare the names and return either
        // a negative number, positive number
        // or zero.
        if (aLastName < bLastName)
            return -1;
        if (aLastName > bLastName)
            return 1;
        return 0;
    };
    CSRankings.redisplay = function (str) {
        jQuery("#success").html(str);
    };
    /* Create a pie chart */
    CSRankings.makeChart = function (name) {
        console.assert(CSRankings.color.length >= CSRankings.areas.length, "Houston, we have a problem.");
        var data = [];
        var keys = CSRankings.areas;
        for (var i = 0; i < keys.length; i++) {
            if (CSRankings.authorAreas[unescape(name)][keys[i]] > 0) {
                data.push({ "label": CSRankings.areaDict[keys[i]],
                    "value": CSRankings.authorAreas[unescape(name)][keys[i]],
                    "color": CSRankings.color[i] });
            }
        }
        var pie = new d3pie(name + "-chart", {
            "header": {
                "title": {
                    "text": unescape(name),
                    "fontSize": 24,
                    "font": "open sans"
                },
                "subtitle": {
                    "text": "Publication Profile",
                    "color": "#999999",
                    "fontSize": 14,
                    "font": "open sans"
                },
                "titleSubtitlePadding": 9
            },
            "size": {
                "canvasHeight": 500,
                "canvasWidth": 500,
                "pieInnerRadius": "38%",
                "pieOuterRadius": "83%"
            },
            "data": {
                "content": data,
                "smallSegmentGrouping": {
                    "enabled": true,
                    "value": 1
                }
            },
            "labels": {
                "outer": {
                    "pieDistance": 32
                },
                "inner": {
                    "format": "value",
                    "hideWhenLessThanPercentage": 2
                },
                "mainLabel": {
                    "fontSize": 12
                },
                "percentage": {
                    "color": "#ffffff",
                    "decimalPlaces": 0
                },
                "value": {
                    "color": "#ffffff",
                    "fontSize": 10
                },
                "lines": {
                    "enabled": true
                },
                "truncation": {
                    "enabled": true
                }
            },
            "effects": {
                "load": {
                    "effect": "none"
                },
                "pullOutSegmentOnClick": {
                    "effect": "linear",
                    "speed": 400,
                    "size": 8
                }
            },
            "misc": {
                "gradient": {
                    "enabled": true,
                    "percentage": 100
                }
            }
        });
    };
    /* Turn the chart display on or off. */
    CSRankings.toggleChart = function (name) {
        var chart = document.getElementById(name + "-chart");
        var widget = document.getElementById(name + "-widget");
        if (chart.style.display === 'block') {
            chart.style.display = 'none';
            chart.innerHTML = '';
        }
        else {
            chart.style.display = 'block';
            CSRankings.makeChart(name);
        }
    };
    /* Expand or collape the view of all faculty in a department. */
    CSRankings.toggleFaculty = function (dept) {
        var e = document.getElementById(dept + "-faculty");
        var widget = document.getElementById(dept + "-widget");
        if (e.style.display === 'block') {
            e.style.display = 'none';
            widget.innerHTML = CSRankings.RightTriangle;
        }
        else {
            e.style.display = 'block';
            widget.innerHTML = CSRankings.DownTriangle;
        }
    };
    /* Set all checkboxes to true. */
    CSRankings.setAllCheckboxes = function () {
        for (var i = 1; i <= CSRankings.areas.length; i++) {
            var str = 'input[name=field_' + i + ']';
            jQuery(str).prop('checked', true);
        }
    };
    /* A convenience function for ending a pipeline of function calls executed in continuation-passing style. */
    CSRankings.nop = function () { };
    CSRankings.loadCoauthors = function (cont) {
        Papa.parse(CSRankings.coauthorFile, {
            download: true,
            header: true,
            complete: function (results) {
                var data = results.data;
                CSRankings.coauthors = data;
                cont();
            }
        });
    };
    CSRankings.loadAliases = function (cont) {
        var self = this;
        Papa.parse(CSRankings.aliasFile, {
            header: true,
            download: true,
            complete: function (results) {
                var data = results.data;
                var d = data;
                for (var i = 0; i < d.length; i++) {
                    self.aliases[d[i].alias] = d[i].name;
                }
                cont();
            }
        });
    };
    CSRankings.loadCountryInfo = function (cont) {
        var self = this;
        Papa.parse(CSRankings.countryinfoFile, {
            header: true,
            download: true,
            complete: function (results) {
                var data = results.data;
                var ci = data;
                for (var i = 0; i < ci.length; i++) {
                    self.countryInfo[ci[i].institution] = ci[i].region;
                }
                cont();
            }
        });
    };
    CSRankings.loadAuthorInfo = function (cont) {
        var self = this;
        Papa.parse(CSRankings.authorinfoFile, {
            download: true,
            header: true,
            complete: function (results) {
                var data = results.data;
                self.authors = data;
                for (var i = 1; i <= self.areas.length; i++) {
                    var str = 'input[name=field_' + i + ']';
                    jQuery(str).click(function () { self.rank(); });
                }
                cont();
                /*	    rank(); */
            }
        });
    };
    CSRankings.loadHomepages = function (cont) {
        var self = this;
        Papa.parse(CSRankings.homepagesFile, {
            header: true,
            download: true,
            complete: function (results) {
                var data = results.data;
                var d = data;
                for (var i = 0; i < d.length; i++) {
                    self.homepages[d[i].name] = d[i].homepage;
                }
                cont();
            }
        });
    };
    CSRankings.activateAll = function (value) {
        if (value === undefined) {
            value = true;
        }
        for (var i = 1; i <= CSRankings.areas.length; i++) {
            var str = "input[name=field_" + i + "]";
            jQuery(str).prop('checked', value);
        }
        CSRankings.rank();
        return false;
    };
    CSRankings.activateNone = function () {
        return CSRankings.activateAll(false);
    };
    CSRankings.activateFields = function (value, fields) {
        if (value === undefined) {
            value = true;
        }
        for (var i = 0; i <= fields.length; i++) {
            var str = "input[name=field_" + fields[i] + "]";
            jQuery(str).prop('checked', value);
        }
        CSRankings.rank();
        return false;
    };
    CSRankings.activateSystems = function (value) {
        var systemsFields = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
        return CSRankings.activateFields(value, systemsFields);
    };
    CSRankings.activateAI = function (value) {
        var aiFields = [1, 2, 3, 4, 5];
        return CSRankings.activateFields(value, aiFields);
    };
    CSRankings.activateTheory = function (value) {
        var theoryFields = [16, 17, 18];
        return CSRankings.activateFields(value, theoryFields);
    };
    CSRankings.activateOthers = function (value) {
        var otherFields = [19, 20, 21, 22];
        return CSRankings.activateFields(value, otherFields);
    };
    CSRankings.deactivateSystems = function () {
        return CSRankings.activateSystems(false);
    };
    CSRankings.deactivateAI = function () {
        return CSRankings.activateAI(false);
    };
    CSRankings.deactivateTheory = function () {
        return CSRankings.activateTheory(false);
    };
    CSRankings.deactivateOthers = function () {
        return CSRankings.activateOthers(false);
    };
    CSRankings.toggleAI = function (cb) {
        if (cb.checked) {
            CSRankings.activateAI(false);
        }
        else {
            CSRankings.activateAI(true);
        }
        return false;
    };
    CSRankings.sortIndex = function (univagg) {
        var keys = Object.keys(univagg);
        keys.sort(function (a, b) {
            if (univagg[a] > univagg[b]) {
                return -1;
            }
            if (univagg[b] > univagg[a]) {
                return 1;
            }
            if (a < b) {
                return -1;
            }
            if (b < a) {
                return 1;
            }
            return 0;
        });
        return keys;
    };
    CSRankings.computeCoauthors = function (coauthors, startyear, endyear, weights) {
        var coauthorList = {};
        for (var c in coauthors) {
            if (!coauthors.hasOwnProperty(c)) {
                continue;
            }
            var author = coauthors[c].author;
            var coauthor = coauthors[c].coauthor;
            var year = coauthors[c].year;
            var area = coauthors[c].area;
            if (!(author in coauthorList)) {
                coauthorList[author] = new Set([]);
            }
            if ((weights[area] === 0) || (year < startyear) || (year > endyear)) {
                continue;
            }
            coauthorList[author].add(coauthor);
        }
        return coauthorList;
    };
    CSRankings.countAuthorAreas = function (areacount, authors, startyear, endyear, weights, authorAreas) {
        // Build up an associative array of depts.
        var depts = {};
        /* Now rebuild. */
        for (var r in authors) {
            if (!authors.hasOwnProperty(r)) {
                continue;
            }
            var theDept = authors[r].dept;
            var theArea = authors[r].area;
            var theCount = parseFloat(authors[r].count);
            var name_1 = authors[r].name;
            if (name_1 in CSRankings.aliases) {
                name_1 = CSRankings.aliases[name_1];
            }
            var year = authors[r].year;
            if (!(name_1 in authorAreas)) {
                authorAreas[name_1] = {};
                for (var area in CSRankings.areaDict) {
                    if (CSRankings.areaDict.hasOwnProperty(area)) {
                        authorAreas[name_1][area] = 0;
                    }
                }
            }
            if (!(theDept in authorAreas)) {
                authorAreas[theDept] = {};
                for (var area in CSRankings.areaDict) {
                    if (CSRankings.areaDict.hasOwnProperty(area)) {
                        authorAreas[theDept][area] = 0;
                    }
                }
            }
            if ((weights[theArea] !== 0) && (year >= startyear) && (year <= endyear)) {
                authorAreas[name_1][theArea] += theCount;
                authorAreas[theDept][theArea] += theCount;
            }
        }
    };
    CSRankings.countPapers = function (areacount, areaAdjustedCount, areaDeptAdjustedCount, authors, startyear, endyear, weights) {
        /* Count the total number of papers (raw and adjusted) in each area. */
        for (var r in authors) {
            if (!authors.hasOwnProperty(r)) {
                continue;
            }
            var area = authors[r].area;
            if (weights[area] == 0) {
                continue;
            }
            var year = authors[r].year;
            if ((year < startyear) || (year > endyear)) {
                continue;
            }
            var dept = authors[r].dept;
            var areaDept = area + dept;
            areaDeptAdjustedCount[areaDept] = 0;
            var count = parseFloat(authors[r].count);
            var adjustedCount = parseFloat(authors[r].adjustedcount);
            areacount[area] += count;
            areaAdjustedCount[area] += adjustedCount;
        }
    };
    CSRankings.buildDepartments = function (areaDeptAdjustedCount, deptCounts, deptNames, facultycount, facultyAdjustedCount, authors, startyear, endyear, weights, regions) {
        /* Build the dictionary of departments (and count) to be ranked. */
        var visited = {}; /* contains an author name if that author has been processed. */
        for (var r in authors) {
            if (!authors.hasOwnProperty(r)) {
                continue;
            }
            var year = authors[r].year;
            if ((year < startyear) || (year > endyear)) {
                continue;
            }
            var area = authors[r].area;
            var dept = authors[r].dept;
            var areaDept = area + dept;
            if (!(areaDept in areaDeptAdjustedCount)) {
                areaDeptAdjustedCount[areaDept] = 0;
            }
            if (weights[area] === 0) {
                continue;
            }
            switch (regions) {
                case "USA":
                    if (dept in CSRankings.countryInfo) {
                        continue;
                    }
                    break;
                case "europe":
                    if (!(dept in CSRankings.countryInfo)) {
                        continue;
                    }
                    if (CSRankings.countryInfo[dept] != "europe") {
                        continue;
                    }
                    break;
                case "canada":
                    if (!(dept in CSRankings.countryInfo)) {
                        continue;
                    }
                    if (CSRankings.countryInfo[dept] != "canada") {
                        continue;
                    }
                    break;
                case "northamerica":
                    if ((dept in CSRankings.countryInfo) && (CSRankings.countryInfo[dept] != "canada")) {
                        continue;
                    }
                    break;
                case "australasia":
                    if (!(dept in CSRankings.countryInfo)) {
                        continue;
                    }
                    if (CSRankings.countryInfo[dept] != "australasia") {
                        continue;
                    }
                    break;
                case "world":
                    break;
            }
            var name_2 = authors[r].name;
            var count = parseInt(authors[r].count);
            var adjustedCount = parseFloat(authors[r].adjustedcount);
            if ((year >= startyear) && (year <= endyear)) {
                areaDeptAdjustedCount[areaDept] += adjustedCount;
                /* Is this the first time we have seen this person? */
                if (!(name_2 in visited)) {
                    visited[name_2] = true;
                    facultycount[name_2 + dept] = 0;
                    facultyAdjustedCount[name_2 + dept] = 0;
                    if (!(dept in deptCounts)) {
                        deptCounts[dept] = 0;
                        deptNames[dept] = [];
                    }
                    deptNames[dept].push(name_2);
                    deptCounts[dept] += 1;
                }
                facultycount[name_2 + dept] += count;
                facultyAdjustedCount[name_2 + dept] += adjustedCount;
            }
        }
    };
    /* Compute aggregate statistics. */
    CSRankings.computeStats = function (deptNames, areaAdjustedCount, areaDeptAdjustedCount, areas, numAreas, displayPercentages, weights, univagg) {
        for (var dept in deptNames) {
            if (!deptNames.hasOwnProperty(dept)) {
                continue;
            }
            if (displayPercentages) {
                if (CSRankings.useArithmeticMean) {
                    univagg[dept] = 0;
                }
                if (CSRankings.useGeometricMean) {
                    univagg[dept] = 1;
                }
                if (CSRankings.useHarmonicMean) {
                    univagg[dept] = 0;
                }
            }
            else {
                univagg[dept] = 0;
            }
            for (var ind = 0; ind < areas.length; ind++) {
                var area = areas[ind];
                var areaDept = area + dept;
                if (!(areaDept in areaDeptAdjustedCount)) {
                    areaDeptAdjustedCount[areaDept] = 0;
                }
                if (weights[area] != 0) {
                    if (displayPercentages) {
                        if (areaDeptAdjustedCount[areaDept] != 0) {
                            if (CSRankings.useArithmeticMean) {
                                univagg[dept] += areaDeptAdjustedCount[areaDept] / areaAdjustedCount[area];
                            }
                            if (CSRankings.useGeometricMean) {
                                univagg[dept] *= areaDeptAdjustedCount[areaDept];
                            }
                            if (CSRankings.useHarmonicMean) {
                                univagg[dept] += areaAdjustedCount[area] / areaDeptAdjustedCount[areaDept];
                            }
                        }
                        else {
                        }
                    }
                    else {
                        univagg[dept] += areaDeptAdjustedCount[areaDept];
                    }
                }
            }
            if (displayPercentages) {
                if (CSRankings.useArithmeticMean) {
                    univagg[dept] = univagg[dept] / numAreas;
                }
                if (CSRankings.useGeometricMean) {
                    univagg[dept] = Math.pow(univagg[dept], 1 / numAreas);
                }
                if (CSRankings.useHarmonicMean) {
                    univagg[dept] = numAreas / univagg[dept];
                }
            }
        }
    };
    CSRankings.rank = function () {
        var form = document.getElementById("rankform");
        //    let s : string = "";
        var deptNames = {}; /* names of departments. */
        var deptCounts = {}; /* number of faculty in each department. */
        var facultycount = {}; /* name + dept -> raw count of pubs per name / department */
        var facultyAdjustedCount = {}; /* name + dept -> adjusted count of pubs per name / department */
        var weights = {}; /* array to hold 1 or 0, depending on if the area is checked or not. */
        var areacount = {}; /* raw number of papers in each area */
        var areaAdjustedCount = {}; /* adjusted number of papers in each area (split among faculty authors). */
        var areaDeptAdjustedCount = {}; /* as above, but for area+dept. */
        var startyear = parseInt(jQuery("#startyear").find(":selected").text());
        var endyear = parseInt(jQuery("#endyear").find(":selected").text());
        var displayPercentages = Boolean(parseInt(jQuery("#displayPercent").find(":selected").val()));
        /* Show the top N (with more if tied at the end) */
        var minToRank = parseInt(jQuery("#minToRank").find(":selected").val());
        var whichRegions = jQuery("#regions").find(":selected").val();
        var numAreas = 0; /* Total number of areas checked */
        /* Update the 'weights' of each area from the checkboxes. */
        for (var ind = 0; ind < CSRankings.areas.length; ind++) {
            weights[CSRankings.areas[ind]] = jQuery('input[name=field_' + (ind + 1) + ']').prop('checked') ? 1 : 0;
            if (weights[CSRankings.areas[ind]] === 1) {
                /* One more area checked. */
                numAreas++;
            }
            areacount[CSRankings.areas[ind]] = 0;
            areaAdjustedCount[CSRankings.areas[ind]] = 0;
        }
        var coauthorList = {};
        if (CSRankings.showCoauthors) {
            coauthorList = CSRankings.computeCoauthors(CSRankings.coauthors, startyear, endyear, weights);
        }
        CSRankings.countPapers(areacount, areaAdjustedCount, areaDeptAdjustedCount, CSRankings.authors, startyear, endyear, weights);
        CSRankings.authorAreas = {};
        CSRankings.countAuthorAreas(areacount, CSRankings.authors, startyear, endyear, weights, CSRankings.authorAreas);
        CSRankings.buildDepartments(areaDeptAdjustedCount, deptCounts, deptNames, facultycount, facultyAdjustedCount, CSRankings.authors, startyear, endyear, weights, whichRegions);
        /* (university, total or average number of papers) */
        var univagg = {};
        CSRankings.computeStats(deptNames, areaAdjustedCount, areaDeptAdjustedCount, CSRankings.areas, numAreas, displayPercentages, weights, univagg);
        var univtext = {};
        /* Canonicalize names. */
        for (var dept in deptNames) {
            for (var ind = 0; ind < deptNames[dept].length; ind++) {
                name = deptNames[dept][ind];
                if (name in CSRankings.aliases) {
                    deptNames[dept][ind] = CSRankings.aliases[name];
                    if (!(CSRankings.aliases[name] + dept in facultycount)) {
                        facultycount[CSRankings.aliases[name] + dept] = facultycount[name + dept];
                        facultyAdjustedCount[CSRankings.aliases[name] + dept] = facultyAdjustedCount[name + dept];
                    }
                    else {
                        facultycount[CSRankings.aliases[name] + dept] += facultycount[name + dept];
                        facultyAdjustedCount[CSRankings.aliases[name] + dept] += facultyAdjustedCount[name + dept];
                    }
                }
            }
        }
        /* Build drop down for faculty names and paper counts. */
        var _loop_1 = function(dept) {
            var p = '<div class="row"><div class="table"><table class="table-striped" width="100%"><thead><th></th><td><small><em><abbr title="Click on an author\'s name to go to their home page.">Faculty</abbr></em></small></td><td align="right"><small><em>&nbsp;&nbsp;<abbr title="Total number of publications (click for DBLP entry).">Raw&nbsp;\#&nbsp;Pubs</abbr></em></small></td><td align="right"><small><em>&nbsp;&nbsp;<abbr title="Count divided by number of co-authors">Adjusted&nbsp;&nbsp;\#</abbr></em></small></td></thead><tbody>';
            /* Build a dict of just faculty from this department for sorting purposes. */
            var fc = {};
            for (var ind = 0; ind < deptNames[dept].length; ind++) {
                name = deptNames[dept][ind];
                fc[name] = facultycount[name + dept];
            }
            var keys = Object.keys(fc);
            keys.sort(function (a, b) { return fc[b] - fc[a]; });
            var _loop_2 = function(ind) {
                name = keys[ind];
                if (CSRankings.showCoauthors) {
                    /* Build up text for co-authors. */
                    var coauthorStr_1 = "";
                    if ((!(name in coauthorList)) || (coauthorList[name].size === 0)) {
                        coauthorList[name] = new Set([]);
                        coauthorStr_1 = "(no senior co-authors on these papers)";
                    }
                    else {
                        coauthorStr_1 = "Senior co-authors on these papers:\n";
                    }
                    /* Sort it by last name. */
                    var l_1 = [];
                    coauthorList[name].forEach(function (item, coauthors) {
                        l_1.push(item);
                    });
                    if (l_1.length > CSRankings.maxCoauthors) {
                        coauthorStr_1 = "(more than " + CSRankings.maxCoauthors + " senior co-authors)";
                    }
                    else {
                        l_1.sort(CSRankings.compareNames);
                        l_1.forEach(function (item, coauthors) {
                            coauthorStr_1 += item + "\n";
                        });
                        /* Trim off the trailing newline. */
                        coauthorStr_1 = coauthorStr_1.slice(0, coauthorStr_1.length - 1);
                    }
                }
                p += "<tr><td>&nbsp;&nbsp;&nbsp;&nbsp;</td><td><small>"
                    + '<a title="Click for author\'s home page." target="_blank" href="'
                    + encodeURI(CSRankings.homepages[name])
                    + '">'
                    + name
                    + '</a>&nbsp;'
                    + "<span onclick=\"CSRankings.toggleChart('"
                    + escape(name)
                    + "')\" class=\"hovertip\" ><font color=\"blue\">" + CSRankings.PieChart + "</font></span>"
                    + '</small>'
                    + '</td><td align="right"><small>'
                    + '<a title="Click for author\'s DBLP entry." target="_blank" href="'
                    + CSRankings.translateNameToDBLP(name) + '">'
                    + facultycount[name + dept]
                    + '</a>'
                    + "</small></td>"
                    + '</a></small></td><td align="right"><small>'
                    + (Math.floor(10.0 * facultyAdjustedCount[name + dept]) / 10.0).toFixed(1)
                    + "</small></td></tr>"
                    + "<tr><td colspan=\"4\">"
                    + '<div style="display:none;" id="' + escape(name) + "-chart" + '">'
                    + '</div>'
                    + "</td></tr>";
            };
            for (var ind = 0; ind < keys.length; ind++) {
                _loop_2(ind);
            }
            p += "</tbody></table></div></div>";
            univtext[dept] = p;
        };
        for (var dept in deptNames) {
            _loop_1(dept);
        }
        /* Start building up the string to output. */
        var s = CSRankings.makePrologue();
        if (displayPercentages) {
            s = s + '<thead><tr><th align="left">Rank&nbsp;&nbsp;</th><th align="right">Institution&nbsp;&nbsp;</th><th align="right"><abbr title="Geometric mean number of papers published across all areas.">Average&nbsp;Count</abbr></th><th align="right">&nbsp;&nbsp;&nbsp;<abbr title="Number of faculty who have published in these areas.">Faculty</abbr></th></th></tr></thead>';
        }
        else {
            s = s + '<thead><tr><th align="left">Rank&nbsp;&nbsp;</th><th align="right">Institution&nbsp;&nbsp;</th><th align="right">Adjusted&nbsp;Pub&nbsp;Count</th><th align="right">&nbsp;&nbsp;&nbsp;Faculty</th></tr></thead>';
        }
        s = s + "<tbody>";
        /* As long as there is at least one thing selected, compute and display a ranking. */
        if (numAreas > 0) {
            var ties = 1; /* number of tied entries so far (1 = no tie yet); used to implement "competition rankings" */
            var rank = 0; /* index */
            var oldv = null; /* old number - to track ties */
            /* Sort the university aggregate count from largest to smallest. */
            var keys2 = CSRankings.sortIndex(univagg);
            /* Display rankings until we have shown `minToRank` items or
               while there is a tie (those all get the same rank). */
            for (var ind = 0; ind < keys2.length; ind++) {
                var dept = keys2[ind];
                var v = univagg[dept];
                if (CSRankings.useArithmeticMean || CSRankings.useHarmonicMean) {
                    v = (Math.floor(10000.0 * v) / (100.0));
                }
                if (CSRankings.useGeometricMean) {
                    v = (Math.floor(10.0 * v) / 10.0);
                }
                if ((ind >= minToRank) && (v != oldv)) {
                    break;
                }
                if (v === 0.0) {
                    break;
                }
                if (oldv != v) {
                    if (CSRankings.useDenseRankings) {
                        rank = rank + 1;
                    }
                    else {
                        rank = rank + ties;
                        ties = 0;
                    }
                }
                s += "\n<tr><td>" + rank + "</td>";
                s += "<font color=\"blue\"><td><span onclick=\"CSRankings.toggleFaculty('" + dept + "')\" class=\"hovertip\" id=\"" + dept + "-widget\">" + CSRankings.RightTriangle + "</span></font>&nbsp;" + dept;
                s += "&nbsp;<font color=\"blue\">" + "<span onclick=\"CSRankings.toggleChart('"
                    + escape(dept)
                    + "')\" class=\"hovertip\" id=\""
                    + escape(dept)
                    + "-widget\">" + CSRankings.PieChart + "</span></font>";
                //	    s += '<div style="display:none;" style="width: 100%; height: 350px;" id="' + escape(dept) + '">' + '</div>';
                s += "</td>";
                if (displayPercentages) {
                    /* Show average */
                    if (CSRankings.useArithmeticMean || CSRankings.useHarmonicMean) {
                        s += '<td align="right">' + (Math.floor(10000.0 * v) / (100.0)).toPrecision(2) + "%</td>";
                    }
                    if (CSRankings.useGeometricMean) {
                        s += '<td align="right">' + (Math.floor(10.0 * v) / 10.0).toFixed(1) + "</td>";
                    }
                }
                else {
                    /* Show count */
                    s += '<td align="right">' + (Math.floor(100.0 * v) / 100.0) + "</td>";
                }
                s += '<td align="right">' + deptCounts[dept] + "<br />"; /* number of faculty */
                s += "</td>";
                s += "</tr>\n";
                s += '<tr><td colspan="4"><div style="display:none;" style="width: 100%; height: 350px;" id="'
                    + escape(dept)
                    + '-chart">' + '</div></td></tr>';
                s += '<tr><td colspan="4"><div style="display:none;" id="' + dept + '-faculty">' + univtext[dept] + '</div></td></tr>';
                ties++;
                oldv = v;
            }
            s += "</tbody>" + "</table>" + "<br />";
            if (CSRankings.allowRankingChange) {
                /* Disable option to change ranking approach for now. */
                if (CSRankings.useDenseRankings) {
                    s += '<em><a class="only_these_areas" onClick="deactivateDenseRankings(); return false;"><font color="blue"><b>Using dense rankings. Click to use competition rankings.</b></font></a><em>';
                }
                else {
                    s += '<em><a class="only_these_areas" onClick="activateDenseRankings(); return false;"><font color="blue"><b>Using competition rankings. Click to use dense rankings.</b></font></a></em>';
                }
            }
            s += "</div>" + "</div>" + "\n";
            s += "<br>" + "</body>" + "</html>";
        }
        else {
            /* Nothing selected. */
            s = "<h4>Please select at least one area.</h4>";
        }
        setTimeout((function (str) { CSRankings.redisplay(str); })(s), 0);
        return false;
    };
    CSRankings.activateDenseRankings = function () {
        CSRankings.useDenseRankings = true;
        CSRankings.rank();
        return false;
    };
    CSRankings.deactivateDenseRankings = function () {
        CSRankings.useDenseRankings = false;
        CSRankings.rank();
        return false;
    };
    CSRankings.coauthorFile = "faculty-coauthors.csv";
    CSRankings.authorinfoFile = "generated-author-info.csv";
    CSRankings.countryinfoFile = "country-info.csv";
    CSRankings.aliasFile = "dblp-aliases.csv";
    CSRankings.homepagesFile = "homepages.csv";
    CSRankings.allowRankingChange = false; /* Can we change the kind of rankings being used? */
    CSRankings.showCoauthors = false;
    CSRankings.maxCoauthors = 30; /* Max co-authors to display. */
    CSRankings.useArithmeticMean = false;
    CSRankings.useGeometricMean = true; /* This is the default and arguably only principled choice. */
    CSRankings.useHarmonicMean = false;
    /* All the areas, in order by their 'field_' number (the checkboxes) in index.html. */
    CSRankings.areas = ["ai", "vision", "mlmining", "nlp", "web",
        "arch", "networks", "security", "database", "highperf", "mobile", "metrics", "opsys", "proglang", "softeng",
        "theory", "crypto", "logic",
        "graphics", "hci", "robotics", "compbio"];
    CSRankings.areaNames = ["AI", "Vision", "ML", "NLP", "Web & IR",
        "Arch", "Networks", "Security", "DB", "HPC", "Mobile", "Metrics", "OS", "PL", "SE",
        "Theory", "Crypto", "Logic",
        "Graphics", "HCI", "Robotics", "Computational Biology"];
    CSRankings.useDenseRankings = false; /* Set to true for "dense rankings" vs. "competition rankings". */
    CSRankings.areaDict = {};
    CSRankings.areaPosition = {};
    CSRankings.authors = []; /* The data which will hold the parsed CSV of author info. */
    CSRankings.coauthors = []; /* The data which will hold the parsed CSV of co-author info. */
    CSRankings.countryInfo = {}; /* Maps institutions to (non-US) regions. */
    CSRankings.aliases = {}; /* Maps aliases to canonical author name. */
    CSRankings.homepages = {}; /* Maps names to home pages. */
    CSRankings.authorAreas = {};
    /* Maps authors to the areas they have published in (for pie chart display). */
    /* Colors for all areas. */
    CSRankings.color = ["#f30000", "#0600f3", "#00b109", "#14e4b4", "#0fe7fb", "#67f200", "#ff7e00", "#8fe4fa", "#ff5300", "#640000", "#3854d1", "#d00ed8", "#7890ff", "#01664d", "#04231b", "#e9f117", "#f3228e", "#7ce8ca", "#ff5300", "#ff5300", "#7eff30", "#9a8cf6", "#79aff9", "#bfbfbf", "#56b510", "#00e2f6", "#ff4141", "#61ff41"];
    CSRankings.RightTriangle = "&#9658;"; // right-facing triangle symbol (collapsed view)
    CSRankings.DownTriangle = "&#9660;"; // downward-facing triangle symbol (expanded view)
    CSRankings.PieChart = "&#9685;"; // symbol that looks close enough to a pie chart
    return CSRankings;
}());
function init() {
    var ranker = new CSRankings();
}
window.onload = init;
//	jQuery(document).ready(
