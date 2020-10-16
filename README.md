# WeatherTrend
Determine if weather over 12 day period is getting colder or warmer

Deployed to AWS lambda. The `weatherAPI.handler` is the entry function.
Will utilize a webhook on discord to send a message `Slope: 1.75` to indicate the weather will be getting warmer.

API Keys:
`const lat = process.env.gps_lat;` gps coordinates

`const lon = process.env.gps_lon;`

`const appid = process.env.api_weather;` is a key from openweathermap.

`const url = process.env.api_discord;` a webhook url for a discord server.
