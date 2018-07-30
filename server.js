var Cesium = require('cesium')
const express = require('express')
const bodyParser = require('body-parser')
const app = express()
const ejs = require('ejs')
const port = process.env.PORT || 3000
const elasticsearch = require('elasticsearch')

app.set('view engine', 'ejs')

var es = new elasticsearch.Client({
  host: process.env.ES_URL || 'http://localhost:9200',
  httpAuth: process.env.ES_HTTP_AUTH || ''
});

es.ping({
  // ping usually has a 3000ms timeout
  requestTimeout: 3000
}, function (error) {
  if (error) {
    console.trace('ElasticSearch cluster is down!');
    process.exit(1); 
  } else {
    console.log('ElasticSearch cluster is reachable.');
  }
});

// create application/json parser
var jsonParser = bodyParser.json()

app.use('/Build', express.static('node_modules/cesium/Build'))
app.use('/models', express.static('models'))

app.get('/', function (req, res) {
  res.render('index')
})

var state = {
     "doorCamera" : { "color" : "BLACK", "alpha" : 1.0, "alphaStart" : 1.0, "alphaEnd" : 0.5 },
    "accessPoint" : { "color" : "BLACK", "alpha" : 1.0, "alphaStart" : 1.0, "alphaEnd" : 0.5 },
       "doorLock" : { "color" : "BLACK", "alpha" : 1.0, "alphaStart" : 1.0, "alphaEnd" : 0.5 },
 'motionDetector' : { "color" : "BLACK", "alpha" : 1.0, "alphaStart" : 1.0, "alphaEnd" : 0.5 },
          'lamp1' : { "color" : "BLACK", "alpha" : 1.0, "alphaStart" : 1.0, "alphaEnd" : 0.5 },
   'undeerground' : { "color" : "WHITE", "alpha" : 0.5, "alphaStart" : 0.5, "alphaEnd" : 0.25 }
}

/* Need to eventually instrument these as well:
     'miniCamera' : { "color" : "BLACK", "alpha" : 1.0 },
     'blueRange1' : { "color" : "BLACK", "alpha" : 1.0 },
          'alexa' : { "color" : "BLACK", "alpha" : 1.0 }
*/

app.get('/state', function (req, res) {
  res.status(200).json({ success: true, state: state })
})

var updateStateInterval;

function updateState() {

/*
  // If unknown client attaches to the accessPoint, turn it YELLOW, otherwise make it BLACK
  var underground_query = {
    index: 'underground-ap-devices-*',
    type: 'webhook',
    body: {
      query: {
        range: { timestamp: { gte: 'now-60s', lt: 'now' } }
      }
    }
  }
  es.search(underground_query).then(function (resp) {
    var hits = (resp.hits && resp.hits.hits.length) || 0;
    if(hits > 0) { console.log(`${hits} ` + JSON.stringify(underground_query)) }
    state["accessPoint"]["color"] = ( hits > 0 ? "YELLOW" : "BLACK" )
  }, function (err) {
    if(err) {
      console.trace(err.message);
    }
  })

  var now_in_milliseconds = (new Date).getTime();

  // If person is detected by the doorCamera (persondetect), turn it WHITE, otherwise make it BLACK
  var persondetect_query = {
    index: 'persondetect',
    type: '_doc',
    body: {
      query: {
        range: { DeviceTime: { gte: now_in_milliseconds - 10000, lt: now_in_milliseconds } }
      }
    }
  };
  es.search(persondetect_query).then(function (resp) {
    var hits = (resp.hits && resp.hits.hits.length) || 0;
    if(hits > 0) { console.log(`${hits} ` + JSON.stringify(persondetect_query)) }
    state["doorCamera"]["persondetect"] = hits
    if(("webcam-pcap" in state["doorCamera"]) && state["doorCamera"]["webcam-pcap"] <= 0) {
      state["doorCamera"]["color"] = ( hits > 0 ? "WHITE" : "BLACK" )
    }
  }, function (err) {
    if(err) {
      console.trace(err.message);
    }
  })

  // If unauthorized connection to the doorCamera occurs (webcam-pcap-*), turn it YELLOW, otherwise make it BLACK

  var webcam_query = {
    index: 'webcam-pcap-*',
    type: 'webhook',
    body: {
      query: {
        range: { timestamp: { gte: 'now-60s', lt: 'now' } }
      }
    }
  }
  es.search(webcam_query).then(function (resp) {
    var hits = (resp.hits && resp.hits.hits.length) || 0;
    if(hits > 0) { console.log(`${hits} ` + JSON.stringify(webcam_query)) }
    state["doorCamera"]["color"] = ( hits > 0 ? "YELLOW" : "BLACK" )
    state["doorCamera"]["webcam-pcap"] = hits
  }, function (err) {
    if(err) {
      console.trace(err.message);
    }
  })

  // If doorLock is manually unlocked (door-lock-*), turn it YELLOW, otherwise make it BLACK
  var doorlock_query = {
    index: 'door-lock-*',
    type: 'webhook',
    body: {
      sort: { timestamp: { order: "desc" }},
      query: {
        bool: {
          must: { match: { user: "Manual Unlock" } },
	  filter: [ { range: { timestamp: { gte: 'now-60s', lt: 'now' } } } ]
        }
      }
    }
  }
  es.search(doorlock_query).then(function (resp) {
    var hits = (resp.hits && resp.hits.hits.length) || 0;
    if(hits > 0) { console.log(`${hits} ` + JSON.stringify(doorlock_query)) }
    state["doorLock"]["door-lock"] = hits
    if(hits>0) {
      if(state["doorLock"]["color"] == "WHITE" || state["doorLock"]["color"] == "BLACK") {
        state["doorLock"]["color"] = "YELLOW"
      }
    }
  }, function (err) {
    if(err) {
      console.trace(err.message);
    }
  })

  var ifttt_query = {
    index: 'ifttt-*',
    type: 'webhook',
    body: {
      sort: { timestamp: { order: "desc" }},
      query: {
        bool: {
          must: { match: { user: "Manual Unlock" } },
	  filter: [ { range: { timestamp: { gte: 'now-60s', lt: 'now' } } } ]
        }
      }
    }
  }
  es.search(ifttt_query).then(function (resp) {
    var hits = (resp.hits && resp.hits.hits.length) || 0;
    if(hits > 0) { console.log(`${hits} ` + JSON.stringify(ifttt_query)) }
    state["doorLock"]["ifttt"] = hits
    if(("door-lock" in state["doorLock"]) && state["doorLock"]["door-lock"] <= 0) {
      state["doorLock"]["color"] = ( hits > 0 ? "YELLOW" : "BLACK" )
    }
  }, function (err) {
    if(err) {
      console.trace(err.message);
    }
  })

  // If doorLock is NOT manually unlocked (door-lock-*), turn it WHITE, otherwise make it BLACK
  var doorlock_notquery = {
    index: 'door-lock-*',
    type: 'webhook',
    body: {
      sort: { timestamp: { order: "desc" }},
      query: {
        bool: {
          must_not: { match: { user: "Manual Unlock" } },
	  filter: [ { range: { timestamp: { gte: 'now-10s', lt: 'now' } } } ]
        }
      }
    }
  }
  es.search(doorlock_notquery).then(function (resp) {
    var hits = (resp.hits && resp.hits.hits.length) || 0;
    if(hits > 0) { console.log(`${hits} ` + JSON.stringify(doorlock_notquery)) }
    state["doorLock"]["notdoor-lock"] = hits
    if((("ifttt" in state["doorLock"]) && state["doorLock"]["ifttt"] <= 0) &&
       (("door-lock" in state["doorLock"]) && state["doorLock"]["door-lock"] <= 0)) {
      if(state["doorLock"]["color"] == "BLACK") {
        if(hits > 0) { state["doorLock"]["color"] = "WHITE" }
      }
    }
  }, function (err) {
    if(err) {
      console.trace(err.message);
    }
  })

  var ifttt_notquery = {
    index: 'ifttt-*',
    type: 'webhook',
    body: {
      sort: { timestamp: { order: "desc" }},
      query: {
        bool: {
          must_not: { match: { user: "Manual Unlock" } },
	  filter: [ { range: { timestamp: { gte: 'now-10s', lt: 'now' } } } ]
        }
      }
    }
  }
  es.search(ifttt_notquery).then(function (resp) {
    var hits = (resp.hits && resp.hits.hits.length) || 0;
    if(hits > 0) { console.log(`${hits} ` + JSON.stringify(ifttt_notquery)) }
    state["doorLock"]["notifttt"] = hits
    if((("ifttt" in state["doorLock"]) && state["doorLock"]["ifttt"] <= 0) &&
       (("door-lock" in state["doorLock"]) && state["doorLock"]["door-lock"] <= 0)) {
      if(("notdoor-lock" in state["doorLock"]) && state["doorLock"]["notdoor-lock"] <= 0) {
        state["doorLock"]["color"] = ( hits > 0 ? "WHITE" : "BLACK" )
      }
    }
  }, function (err) {
    if(err) {
      console.trace(err.message);
    }
  })

  // If motionDetector has triggered (domoticz), turn it WHITE, otherwise make it BLACK
  var domoticz_query = {
    index: 'domoticz*',
    type: 'notification',
    body: {
      query: {
        bool: {
          must: { match: { message: "Motion" } },
	  filter: [ { range: { timestamp: { gte: 'now-10s', lt: 'now' } } } ]
        }
      }
    }
  };
  es.search(domoticz_query).then(function (resp) {
    var hits = (resp.hits && resp.hits.hits.length) || 0;
    if(hits > 0) { console.log(`${hits} ` + JSON.stringify(domoticz_query)) }
    state["motionDetector"]["color"] = ( hits > 0 ? "WHITE" : "BLACK" )
  }, function (err) {
    if(err) {
      console.trace(err.message);
    }
  })

  // If Alexa has triggered the lamp (alexa-trigger-*), turn it WHITE, otherwise make it BLACK
  var alexatrigger_query = {
    index: 'alexa-trigger-*',
    type: 'webhook',
    body: {
      query: {
        bool: {
          must: { match: { target: "lamp" } },
	  filter: [ { range: { timestamp: { gte: 'now-10s', lt: 'now' } } } ]
        }
      }
    }
  };
  es.search(alexatrigger_query).then(function (resp) {
    var hits = (resp.hits && resp.hits.hits.length) || 0;
    if(hits > 0) { console.log(`${hits} ` + JSON.stringify(alexatrigger_query)) }
    state["lamp1"]["color"] = ( hits > 0 ? "WHITE" : "BLACK" )
  }, function (err) {
    if(err) {
      console.trace(err.message);
    }
  })

  // If David's underground algorithm has triggered (sfalgo), turn the underground RED, otherwise make it WHITE
  var sfalgo_query = {
    index: 'sfalgo',
    type: '_doc',
    body: {
      query: {
        range: { DateTime: { gte: now_in_milliseconds - 10000, lt: now_in_milliseconds } }
      }
    }
  };
  es.search(sfalgo_query).then(function (resp) {
    var hits = (resp.hits && resp.hits.hits.length) || 0;
    if(hits > 0) { console.log(`${hits} ` + JSON.stringify(sfalgo_query)) }
    var seconds = Math.floor(new Date().getTime() / 1000);
    state["underground"]["color"] = ( (hits > 0 ) && ( seconds % 2 == 0 )   ? "RED" : "WHITE" )
  }, function (err) {
    if(err) {
      console.trace(err.message);
    }
  })
*/
}
updateStateInterval = setInterval(updateState, 1000);

app.post('/', jsonParser, (req, res) => {
  console.log('POST /')
  console.log(req.body)
  res.status(200).json({ success: true })
})

app.listen(port, (err) => {
  if (err) {
    return console.log('something bad happened', err)
  }

  console.log(`server is listening on ${port}`)
})
