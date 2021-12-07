const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
const isSafari = /Safari/.test(navigator.userAgent) && /Apple Computer/.test(navigator.vendor);

const copy = document.querySelector("#copy");
const clear = document.querySelector("#clear");
const spellcheck = document.querySelector("#spellcheck");
const textarea = document.querySelector("textarea");
const highlights = document.querySelector("#highlights");
const length = document.querySelector("#length");
const output = document.querySelector("output");
const list = document.querySelector("#list");
const template = document.querySelector("template");

let hiddens = [];
let duplicates = {};

// Text analysis
const count = (text, minLength) => {
  // https://mathiasbynens.be/notes/es-unicode-property-escapes#word
  const wordRegex = isChrome || isSafari ?
  new RegExp(`([\\p{Alphabetic}\\p{Mark}\\p{Decimal_Number}\\p{Connector_Punctuation}\\p{Join_Control}]+){${minLength},}`, 'gu') :
  new RegExp(`(\\w+){${minLength},}`, 'g');
  let result;
  const words = {};
  while ((result = wordRegex.exec(text)) !== null) {
    const word = result[0].toLowerCase();
    if (!words[word]) {
      words[word] = [];
    }
    words[word].push(result.index);
    words[word].push(result.index + word.length);
  }
  return words;
};

// Array manipulation
const duplicatePass = ([key, value]) => 2 < value.length;

const occurrenceComparator = ([keyA, valueA], [keyB, valueB]) =>
valueB.length - valueA.length;

const numberComparator = (numberA, numberB) => numberA - numberB;

const differ = (object, [key, value], index) => {
  object[key] = {
    action: object[key] ? "KEEP" : "ADD",
    word: key,
    occurrences: value,
    index };

  return object;
};

const cleaner = (object, [word, details]) => {
  if (details.action) {
    delete details.action;
    object[word] = details;
  }
  return object;
};

const flattener = (array, details) => [...array, ...details.occurrences];

// DOM manipulation
const update = (item, details) => {
  item.style.zIndex = details.occurrences.length / 2;
  item.style.top = `${0.6 + details.index * 3}rem`;
  item.querySelector(".count").textContent = details.occurrences.length / 2;
};

const add = (word, details) => {
  const node = document.importNode(template.content, true);
  list.appendChild(node);
  const item = list.lastElementChild;
  item.id = `word-${word}`;
  const hidden = item.querySelector(".hidden");
  hidden.name = word;
  hidden.checked = hiddens.includes(word);
  hidden.addEventListener("change", handleToggle);
  item.querySelector(".word").textContent = word;
  update(item, details);
};

const keep = (word, details) => {
  const item = document.querySelector(`#word-${word}`);
  update(item, details);
};

const markObsolete = word => {
  document.querySelector(`#word-${word}`).classList.add("obsolete");
};

const remove = item => item.remove();

const removeObsolete = () => {
  document.querySelectorAll(".obsolete").forEach(remove);
};

const render = ([word, details]) => {
  if (details.action === "ADD") {
    add(word, details);
  } else if (details.action === "KEEP") {
    keep(word, details);
  } else {
    markObsolete(word);
  }
};

const getHue = word => {
  return (
    360 -
    360 / Object.keys(duplicates).length * duplicates[word.toLowerCase()].index);

};

const getHSL = word => {
  const hue = getHue(word);
  return `hsl(${hue + 20}, 100%, ${180 < hue && hue < 360 ? 80 : 50}%)`;
};

const colorize = word => {
  const color = getHSL(word);
  const count = document.querySelector(`#word-${word} .count`);
  const wordElement = document.querySelector(`#word-${word} .word`);
  count.style.borderColor = color;
  count.style.backgroundColor = color;
  wordElement.style.borderColor = color;
  wordElement.style.backgroundColor = color;
};

const highlight = (occurrence, index, occurrences) => {
  let node;
  if (index < occurrences.length - 1) {
    if (index % 2) {
      const word = textarea.value.substring(occurrence, occurrences[index + 1]);
      node = document.createElement("mark");
      node.textContent = word;
      if (!hiddens.includes(word.toLowerCase())) {
        const color = getHSL(word);
        node.style.background = color;
        node.style.border = `0.2rem solid ${color}`;
      }
    } else {
      const text = textarea.value.substring(occurrence, occurrences[index + 1]);
      node = document.createTextNode(text);
    }
  } else {
    const text = textarea.value.substring(occurrence);
    node = document.createTextNode(text + "\r\n\r\n");
  }
  highlights.appendChild(node);
};

const handleChange = () => {
  // Count words
  const words = count(textarea.value, length.value);

  // Diff word stats with previous
  const diff = Object.entries(words).
  filter(duplicatePass).
  sort(occurrenceComparator).
  reduce(differ, duplicates);

  // Render items
  Object.entries(diff).forEach(render);

  // Clean obsolete from duplicates
  duplicates = Object.entries(diff).reduce(cleaner, {});

  // Adjust height of list
  list.style.height = `${1.2 + Object.keys(duplicates).length * 3}rem`;

  // Colorize items
  Object.keys(duplicates).forEach(colorize);

  // Flatten occurrences
  const occurrences = Object.values(duplicates).
  reduce(flattener, [0]).
  sort(numberComparator);

  // Highlight
  while (highlights.firstChild) {
    highlights.removeChild(highlights.firstChild);
  }
  occurrences.forEach(highlight);

  // Remove
  window.setTimeout(removeObsolete, 400);
};

const handleToggle = event => {
  const word = event.target.name;
  if (event.target.checked) {
    if (!hiddens.includes(word)) {
      hiddens.push(word);
    }
  } else {
    const index = hiddens.indexOf(word);
    if (0 <= index) {
      hiddens.splice(index, 1);
    }
  }
  handleChange();
};

copy.addEventListener("click", () => {
  textarea.select();
  document.execCommand("copy");
});

clear.addEventListener("click", () => {
  textarea.value = "";
  textarea.focus();
  handleChange();
});

spellcheck.addEventListener("change", event => {
  textarea.setAttribute("spellcheck", event.target.checked.toString());
  const { value } = textarea;
  textarea.value = value + " ";
  textarea.value = value;
});

textarea.addEventListener("scroll", event => {
  highlights.scrollTop = event.target.scrollTop;
});

textarea.addEventListener(
"focus",
() => {
  textarea.value = "";
  handleChange();
},
{
  once: true });



textarea.addEventListener("input", handleChange);
length.addEventListener("input", handleChange);
length.addEventListener("input", () => output.textContent = length.value);

handleChange();