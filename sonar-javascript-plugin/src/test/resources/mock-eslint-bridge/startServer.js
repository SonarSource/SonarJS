#!/usr/bin/env node

const http = require('http')
const port = process.argv[2]

const issues = [{
  line: 1,
  column: 3,
  endLine: 3,
  endColumn: 5,
  ruleId: "no-all-duplicated-branches",
  message: "Issue message"
},
{
  line: 1,
  column: 2,
  ruleId: "no-all-duplicated-branches",
  message: "Line issue message"
}
]

const requestHandler = (request, response) => {
  response.end(JSON.stringify(issues))
}

const server = http.createServer(requestHandler)

server.listen(port, (err) => {
  if (err) {
    return console.log('something bad happened', err)
  }

  console.log(`server is listening on ${port}`)
})
