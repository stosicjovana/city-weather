var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var apiRequest = require('request-promise');
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended : true}));
var timezoneApiKey='HLI66KZL3ANA';
app.use(express.static(__dirname + '/public'));
var http = require('http').Server(app);
var io = require('socket.io')(http);

io.on('connection', () =>{
	console.log('a user is connected');
  })

var allCitiesWeatherStore=[];

app.get('/', function(req,res){
	res.render('weather-main');
});

app.post('/add', function(req){

	if(req && req.body && req.body.city_name)
	{
		var exists= allCitiesWeatherStore.find(function(e){
			return e.city === req.body.city_name
		});
		if(exists)
			return;
		var resp = fetchWeatherInfo(req.body.city_name).then(function(weather){
			allCitiesWeatherStore.push(weather);


			io.sockets.emit('cities', weather);
		}).catch(function (err) {
			console.log('Fetch error message' + err)
		});;;
}
});

app.post('/remove', function(req){

	if(req && req.body && req.body.city_id)
	{
		allCitiesWeatherStore = allCitiesWeatherStore.filter(function(el){
			el.id != req.body.city_id;
		});

		io.sockets.emit('delete', req.body.city_id);
}
});

async function fetchWeatherInfo(city){
		var weatherUrl = `http://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=65f1d985b6d530b19bb46d62c4c08dbc`;

		
		let shouldProcceed=false;

		var ltd;
		var lng;
		var weatherInfoData;
		await apiRequest(weatherUrl).then(function(weatherResponse){
			
			let weatherResponseData=JSON.parse(weatherResponse)
			if(weatherResponseData)
			{
				var ident=city.replace(/\s/g, "");
				weatherInfoData = weatherInfoCreator(weatherResponseData, ident, city);
				ltd=weatherInfoData.ltd;
				lng= weatherInfoData.lng;
				shouldProcceed=true;
			}
		}).catch(function (err) {
			console.log('Weather api rejected with message' + err)
		});;
		
	
			
			var timeZoneUrl = `http://api.timezonedb.com/v2.1/get-time-zone?key=HLI66KZL3ANA&format=json&by=position&lat=${ltd}&lng=${lng}`;

			if(shouldProcceed===true){
				await apiRequest(timeZoneUrl)
				.then(function (timeResponse) {
					var timeResponseData = JSON.parse(timeResponse);
					if(timeResponseData){
						var time = timeResponseData.formatted.split(" ")[1];
						var hoursMinutes = time.split(':')[0] + ':' + time.split(':')[1];
						weatherInfoData.time = hoursMinutes;
						weatherInfoData.country=timeResponseData.countryName;
					}
				})
				.catch(function (err) {
					console.log('Time zone api rejected with message' + err)
				});
			}

	return weatherInfoData;

}

function weatherInfoCreator(weatherResponseData, ident, city){
	var weatherInfoData = {
		id:ident,
		city: city,
		temp: Math.round(weatherResponseData.main.temp),
		desc: weatherResponseData.weather[0].description,
		icon: weatherResponseData.weather[0].icon,
		wind: weatherResponseData.wind.speed,
		lng:weatherResponseData.coord.lon,
		ltd:weatherResponseData.coord.lat,
		time:'',
		country:'',
	}
	return weatherInfoData;
}

var server = http.listen(3000, () => {
	console.log('server is running on port', server.address().port);
  });