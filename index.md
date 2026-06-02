---
title: Accessibility Toolkit
---
# Toolkit 
Deze Toolkit ondersteunt docenten bij het integreren van digitale toegankelijkheid in onderwijs. De materialen zijn ontwikkeld door Stichting Accessibility in het kader van het project Toegankelijkheid in Curriculum. Het project is mede mogelijk gemaakt door het Bartiméus Fonds.

## Hoe te gebruiken?
Deze toolkit bevat verschillende materialen die kunnen helpen bij het opzetten en uitvoeren van de lessen rondom digitale toegankelijkheid. 
De toolkit is opgebouwd aan de hand van de door Stichting Accessibility opgebouwde leerdoelen. 

## Materialen


<script>
const REPO   = 'AccessibilityNL/Accessibility-Teaching-Toolkit';
const BRANCH = 'main';
const ROOT   = 'toolkit';

const CACHE_KEY = 'toolkit-cache-v1';
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

async function fetchTree() {
  const cached = localStorage.getItem(CACHE_KEY);
  if (cached) {
    const parsed = JSON.parse(cached);
    if (Date.now() - parsed.time < CACHE_TTL) {
      return parsed.data;
    }
  }

  const res = await fetch(`https://api.github.com/repos/${REPO}/git/trees/${BRANCH}?recursive=1`);
  const data = await res.json();

  if (!data.tree) throw new Error('Invalid GitHub response');

  localStorage.setItem(CACHE_KEY, JSON.stringify({
    time: Date.now(),
    data
  }));

  return data;
}

function buildTree(treeData) {
  const root = { name: ROOT, children: {}, files: [], text: null };

  treeData
    .filter(item => item.type === 'blob' && item.path.startsWith(ROOT + '/'))
    .forEach(item => {
      const parts = item.path.split('/').slice(1);
      let current = root;

      parts.forEach((part, index) => {
        const isFile = index === parts.length - 1;

        if (isFile) {
          if (part === 'text.md') {
            current.text = item.path;
          } else {
            current.files.push({ name: part, path: item.path });
          }
        } else {
          if (!current.children[part]) {
            current.children[part] = { name: part, children: {}, files: [], text: null };
          }
          current = current.children[part];
        }
      });
    });

  return root;
}

async function fetchAllTexts(folder) {
  const promises = [];

  function collect(node) {
    if (node.text) {
      const url = `https://raw.githubusercontent.com/${REPO}/${BRANCH}/${node.text}`;
      promises.push(
        fetch(url)
          .then(r => r.ok ? r.text() : '')
          .then(text => node.textContent = text)
          .catch(() => node.textContent = '')
      );
    }
    Object.values(node.children).forEach(collect);
  }

  collect(folder);
  await Promise.all(promises);
}

function createSafeTextElement(tag, text) {
  const el = document.createElement(tag);
  el.textContent = text;
  return el;
}

function render(folder, container) {
  const section = document.createElement('div');

  section.appendChild(createSafeTextElement('h3', folder.name));

  if (folder.textContent) {
    section.appendChild(createSafeTextElement('p', folder.textContent));
  }

  if (folder.files.length > 0) {
    const ul = document.createElement('ul');

    folder.files
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach(file => {
        const li = document.createElement('li');
        const a = document.createElement('a');

        a.href = `https://raw.githubusercontent.com/${REPO}/${BRANCH}/${file.path}`;
        a.textContent = file.name;
        a.download = file.name;

        li.appendChild(a);
        ul.appendChild(li);
      });

    section.appendChild(ul);
  }

  Object.values(folder.children)
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach(child => render(child, section));

  container.appendChild(section);
}

async function init() {
  try {
    const container = document.getElementById('toolkit-dynamic');
    container.innerHTML = 'Loading...';

    const data = await fetchTree();

    if (data.truncated) {
      console.warn('GitHub tree truncated. Results may be incomplete.');
    }

    const tree = buildTree(data.tree);

    await fetchAllTexts(tree);

    container.innerHTML = '';
    render(tree, container);

    if (container.children.length === 0) {
      container.textContent = 'No toolkit content found.';
    }

  } catch (err) {
    document.getElementById('toolkit').innerHTML =
      `<strong>Error:</strong> <code>${err.message}</code>`;
  }
}

init();
</script>
