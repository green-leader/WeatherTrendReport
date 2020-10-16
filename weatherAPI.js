/**
 * Go and get weather data to try and determin if the daily temps will be trending upward or down.
 */
//https://classroom.synonym.com/calculate-trendline-2709.html
const got = require('got');

const lat = process.env.gps_lat;
const lon = process.env.gps_lon;
const appid = process.env.api_weather;
const url = process.env.api_discord;

var curr = new Date();
curr.setMinutes(00);
curr.setHours(12);
curr = Math.floor(curr / 1000);

/**
 * Send out the http requests such that 12 days are received
 * 7 day future forecast
 * 5 day historic
 */
async function getData() {
        try {
                let inputArray = [
                        got('https://api.openweathermap.org/data/2.5/onecall', { searchParams: { lat: lat, lon: lon, exclude: 'current,minutely,hourly,alerts', units: 'imperial', appid: appid } })
                ];
                var i;
                for (i = 1; i <= 5; i++) {
                        let baseURL = 'https://api.openweathermap.org/data/2.5/onecall/timemachine';

                        inputArray.push(got(baseURL, { searchParams: { dt: curr - (86400 * i), lat: lat, lon: lon, exclude: 'current,minutely,hourly,alerts', units: 'imperial', appid: appid } }));

                }

                let arr = [];
                arr = await Promise.all(inputArray);

                let dataOutput = [];

                arr.forEach(item => {
                        dataOutput.push(JSON.parse(item.body));
                });
                return dataOutput;

        } catch (error) {
                console.error("Get Data Error: " + error.response.body);
        }
}


function weekAverage(week) {
        let average = 0;
        week.forEach(day => {
                if (typeof day["feels_like"] === "number") {
                        average += day["feels_like"];
                } else {
                        average += day["feels_like"]["day"];
                }
        });
        return Number((average / week.length).toFixed(2));
}

/**
* perform a pop at the front and not the back.
* no error checking for length
* @param {array} arr the array to perform the fron pop on 
*/
function fpop(arr) {
        var result = arr[0];
        arr.splice(0, 1);
        return result;
}
/**
* Get a moving week from the two week period of data
* @param {*} arr the array we need to obtain a 7 day period from. 
*/
function getWeek(arr) {
        let week = [];
        for (var i = 0; i < 7; i++) {
                week.push(arr[i]);
        }
        if (week.length === 7 && week[6]) {
                fpop(arr);
                return week;
        }
        return undefined;
}

// Moving Averages:
// ["3","5","6.5"] = 1.75

function trendLineSlope(arr) {
        //https://classroom.synonym.com/calculate-trendline-2709.html
        let a = 0; //97.5
        for (var i = 1; i <= arr.length; i++) {
                a += i * arr[i - 1];
        }
        a = arr.length * a;

        let b = 0; // 87
        arr.forEach(item => {
                b += Number(item);
        });
        //b = (b*28).toFixed(2) // Summation of x values
        let sigma = 0;
        for (var i = 1; i <= arr.length; i++) {
                sigma += i;
        }
        b = Number((b * sigma).toFixed(2)); // Summation of x values

        let c = 0; //42
        for (var i = 1; i <= arr.length; i++) {
                c += Math.pow(i, 2);
        }
        c = c * arr.length;

        let d = 0; // 36
        for (var i = 1; i <= arr.length; i++) {
                d += i;
        }
        d = d ** 2;

        let slope = Number((a - b) / (c - d));
        return slope;
}




function message(msg) {
        var returnResult = got.post(url, {
                json: {
                        content: msg
                },
                responseType: 'json'
        });
        return returnResult;
}

exports.handler = async (event) => {

        return getData().then(res => {
                var days = [];
                res.forEach(item => {
                        if ("daily" in item) {
                                item["daily"].forEach(x => {
                                        days.push(x);
                                });
                        } else if ("current" in item) {
                                days.push(item["current"]);
                        }
                });
                days.sort((a, b) => { return a["dt"] - b["dt"] });
                //console.log(JSON.stringify(days))

                var movingAvg = [];
                do {
                        var week = getWeek(days);
                        if (typeof week !== 'undefined') {
                                movingAvg.push(weekAverage(week));
                        }

                } while (days.length > 6);

                var slope = trendLineSlope(movingAvg);
                return slope;

        }).then(async slope => {
                let returnString = "Slope: " + slope.toFixed(2).toString();
                console.log("returnString: " + returnString);
                
                let response;

                try {
                        response = await message(returnString);

                } catch (err) {
                        console.log(err.response.body);
                        return JSON.stringify(err.response.body);
                }
                console.log(response.statusCode + ' ' + response.body);
                return response.statusCode + ' ' + response.body;

        });
};
