const targetList = require("./targets.json");
const targets = targetList.slice(0, targetList.indexOf("murky") + 1); // Words no rarer than this one

const counters = {};
for (let i = 0; i < targets.length; i++) {
  const uniq = [];
  for (let j = 0; j < targets[i].length; j++) {
    if (targets[i][j] === "*" || uniq.includes(targets[i][j])) continue;
    uniq.push(targets[i][j]);
    counters[targets[i][j]] = (counters[targets[i][j]] || 0) + 1;
  }
}

console.log(JSON.stringify(counters));
