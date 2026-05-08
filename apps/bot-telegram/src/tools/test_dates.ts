const dates = ["2026-03-14 10:09:20", "2026-03-14T10:09:20"];
dates.forEach(d => {
  const dt = new Date(d);
  console.log(`Input: "${d}" => Date: ${dt} (Unix: ${dt.getTime()})`);
});
