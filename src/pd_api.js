const { rejects } = require("assert");
const http = require("https");

class PdApi {
    constructor (apiKey) {
        this.apiKey = apiKey
    }

    fetch(path) {
        const options = {
            "method": "GET",
            "hostname": "api.pagerduty.com",
            "path": path,
            "port": null,
            "headers": {
                "accept": "application/vnd.pagerduty+json;version=2",
                "content-type": "application/json",
                "authorization": `Token token=${this.apiKey}`
            }
        };

        
        return new Promise((resolve, reject) =>  {
            const req = http.request(options, function (res) {
                let chunks = [];
                
                res.on("data", function (chunk) {
                    chunks.push(chunk);
                });
                
                res.on("end", function () {
                    const body = Buffer.concat(chunks);
                    resolve(JSON.parse(body.toString()));
                });
            }); 

            req.on('error', function(err) {
                reject(err)
            });

            req.end();
        })
    }

    fetchTriggeredIncidents(userId, since) {
        return this.fetch(`/incidents?total=true&statuses[]=triggered&statuses[]=acknowledged&time_zone=UTC&since=${since}&user_ids[]=${userId}`).then((response) => {
            return response['incidents']
        })
    }
}

module.exports = PdApi