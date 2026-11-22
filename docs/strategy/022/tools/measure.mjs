const t0 = performance.now();
process.on("exit", () => { process.stderr.write(`# measure: ${((performance.now() - t0) / 1000).toFixed(1)} s, peak ${Math.round(process.resourceUsage().maxRSS / 1024)} MB\n`); });
