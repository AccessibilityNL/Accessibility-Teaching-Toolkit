
document.addEventListener('DOMContentLoaded', init);

const REPO   = 'AccessibilityNL/Accessibility-Teaching-Toolkit';
const BRANCH = 'main';
const ROOT   = 'toolkit';

const CACHE_KEY = 'toolkit-cache-v1';
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

async function init() {
  const container = document.getElementById('toolkit-dynamic');

  if (!container) {
    console.error('Missing #toolkit-dynamic');
    return;
  }

  try {
    container.textContent = 'Loading...';

    const data = await fetchTree();

    if (data.truncated) {
      console.warn('GitHub tree truncated, results may be incomplete');
    }

    const tree = buildTree(data.tree);

    await fetchAllTexts(tree);

    container.innerHTML = '';
    render(tree, container);

    if (container.children.length === 0) {
      container.textContent = 'No toolkit content found';
    }

  } catch (err) {
    container.innerHTML = `<strong>Error:</strong> <code>${err.message}</code>`;
  }
}

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

  if (!data.tree) {
    throw new Error('Invalid GitHub response');
  }

  localStorage.setItem(CACHE_KEY, JSON.stringify({
    time: Date.now(),
    data: data
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
            current.children[part] = {
              name: part,
              children: {},
              files: [],
              text: null
            };
          }
          current = current.children[part];
        }
      });
    });

  return root;
}

async function fetchAllTexts(root) {
  const tasks = [];

  function collect(node) {
    if (node.text) {
      const url = `https://raw.githubusercontent.com/${REPO}/${BRANCH}/${node.text}`;

      tasks.push(
        fetch(url)
          .then(r => r.ok ? r.text() : '')
          .then(text => { node.textContent = text; })
          .catch(() => { node.textContent = ''; })
      );
    }

    Object.values(node.children).forEach(collect);
  }

  collect(root);

  await Promise.all(tasks);
}

function render(folder, container) {
  const section = document.createElement('div');

  const title = document.createElement('h3');
  title.textContent = folder.name;
  section.appendChild(title);

  if (folder.textContent) {
    const p = document.createElement('p');
    p.textContent = folder.textContent;
    section.appendChild(p);
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
