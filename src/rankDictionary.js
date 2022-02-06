const dictionary = require("./dictionary.json");
const frequencies = require("./frequencies.json");

const score = (word) => {
  let freqSum = 0;
  const uniq = [];

  for (let i = 0; i < word.length; i++) {
    if (uniq.includes(word[i])) continue;
    uniq.push(word[i]);
    freqSum += frequencies[word[i]] || 0;
  }
  return freqSum;
};

const rankedDictionary = dictionary
  .filter((word) => word.length >= 4 && word.length <= 11)
  .sort((a, b) =>
    a.length === b.length ? score(b) - score(a) : a.length - b.length
  );

console.log(JSON.stringify(rankedDictionary));
