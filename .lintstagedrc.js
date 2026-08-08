const fs = require('fs');

function nonSymlinkFiles(files) {
  return files.filter((file) => {
    try {
      return !fs.lstatSync(file).isSymbolicLink();
    } catch {
      return false;
    }
  });
}

function prettierWrite(files) {
  const filtered = nonSymlinkFiles(files);
  return filtered.length ? [`prettier --write ${filtered.join(' ')}`] : [];
}

module.exports = {
  'ui/**/*.{ts,tsx,js,jsx}': (files) => {
    const relativeFiles = files.map((file) => file.replace(/^ui\//, '')).join(' ');
    return [`cd ui && eslint --fix ${relativeFiles}`];
  },
  'ui/**/*.{json,css,md}': prettierWrite,
  '*.{json,md,mdc}': prettierWrite,
};
