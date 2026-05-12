---
title: Accessibility Toolkit
---
# Toolkit 
Deze Toolkit ondersteunt docenten bij het integreren van digitale toegankelijkheid in onderwijs. De materialen zijn ontwikkeld door Stichting Accessibility in het kader van het project Toegankelijkheid in Curriculum. Het project is mede mogelijk gemaakt door het Bartiméus Fonds.

## Hoe te gebruiken?
Deze toolkit bevat verschillende materialen die kunnen helpen bij het opzetten en uitvoeren van de lessen rondom digitale toegankelijkheid. 
De toolkit is opgebouwd aan de hand van de door Stichting Accessibility opgebouwde leerdoelen. 

## Materialen

<div id="toolkit-dynamic"></div>
<script>
  const REPO   = 'AccessibilityNL/Accessibility-Teaching-Toolkit';
  const BRANCH = 'main';
  const ROOT   = 'toolkit';

  fetch(`https://api.github.com/repos/${REPO}/git/trees/${BRANCH}?recursive=1`)
    .then(r => r.json())
    .then(async data => {
      if (!data.tree) throw new Error(JSON.stringify(data));

      // Group files by subfolder
      const folders = {};
      data.tree
        .filter(item => item.type === 'blob' && item.path.startsWith(ROOT + '/'))
        .forEach(item => {
          const parts = item.path.slice(ROOT.length + 1).split('/');
          if (parts.length !== 2) return;           // skip root-level or deeply nested
          const [folder, filename] = parts;
          if (!folders[folder]) folders[folder] = { text: null, files: [] };
          if (filename === 'text.md') {
            folders[folder].text = item.path;
          } else {
            folders[folder].files.push({ name: filename, path: item.path });
          }
        });

      const container = document.getElementById('toolkit-dynamic');
      container.innerHTML = '';

      for (const [folder, contents] of Object.entries(folders)) {
        const section = document.createElement('div');
        section.innerHTML = `<h3>${folder}</h3>`;

        // Fetch text.md — fail gracefully per folder
        if (contents.text) {
          try {
            const rawUrl = `https://raw.githubusercontent.com/${REPO}/${BRANCH}/${contents.text}`;
            const mdText = await fetch(rawUrl).then(r => {
              if (!r.ok) throw new Error(`HTTP ${r.status}`);
              return r.text();
            });
            const p = document.createElement('p');
            p.textContent = mdText;
            section.appendChild(p);
          } catch (e) {
            console.warn(`Could not load text.md for ${folder}:`, e);
          }
        }

        // Download list
        if (contents.files.length > 0) {
          const ul = document.createElement('ul');
          contents.files.forEach(file => {
            const rawUrl = `https://raw.githubusercontent.com/${REPO}/${BRANCH}/${file.path}`;
            ul.innerHTML += `<li><a href="${rawUrl}" download="${file.name}">${file.name}</a></li>`;
          });
          section.appendChild(ul);
        }

        container.appendChild(section);
      }

      if (container.children.length === 0) {
        container.innerHTML = '<em>No toolkit folders found.</em>';
      }
    })
    .catch(err => {
      document.getElementById('toolkit').innerHTML =
        `<strong>Error:</strong> <code>${err.message}</code>`;
    });
</script>