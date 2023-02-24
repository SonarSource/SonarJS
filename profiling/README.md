# ESlint-bridge profiling

This tool allows identifying the bottlenecks of a rule performance.

## Fetch dependencies

Run: `npm i`

## Chrome dev tools

The Chrome dev tools allow you to see what functions took how much CPU time as:
- a top-down tree
- a bottom-up tree
- a (flame) graph

1. Boot the server in debug mode: `npm run server`. (or `npm run compile-server` if you have modifications in `eslint-bridge/`)
2. Open dev tools on chrome, using F12
3. You should see a green NodeJS icon like that, click it to connect the dev tools to the server's debugger:

![dev tools](images/dev-tools.png)

4. You might need to make sure the server starts by going to the "sources" tab and pressing the "play" button
5. In the server logs, you should see that the server is listening
6. Select the "Profiler" tab
5. Select "Profiles" on the left
6. Press "Start" on the bottom

![profiler](images/profiler.png)

7. Launch the Analysis on ruling projects: `npm run profile <my-rule-id> <ts|all> <parallelism>`
   1. `ts` for TS-only projects, `all` for both JS and TS, JS-only by default.
   2. `parallelism` sets the number of parallel files sent to the `eslint-bridge` for analysis. Defaults to 5.
8. Press "Stop"
9. View the profile
10.  Change the view from "Heavy (Bottom Up)" to "Tree (Top Down)" (on the top menu, above "Self Time")

![profile](images/profile.png)

11. If you prefer, you can also select the "Chart" view to display a flame graph

![flame graph](images/flame.png)

## Links

- [Chrome profiling](https://medium.com/@basakabhijoy/debugging-and-profiling-memory-leaks-in-nodejs-using-chrome-e8ece4560dba)
- [Chrome profiling - views](https://commandlinefanatic.com/cgi-bin/showarticle.cgi?article=art037)
- [Flame graphs with 0x](https://github.com/davidmarkclements/0x)
- [NodeJS profiling](https://nodejs.org/en/docs/guides/simple-profiling/)
