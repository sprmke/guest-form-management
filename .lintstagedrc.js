module.exports = {
  'ui/**/*.{ts,tsx,js,jsx}': (files) => {
    const relativeFiles = files.map((file) => file.replace(/^ui\//, '')).join(' ');
    return [`cd ui && eslint --fix ${relativeFiles}`];
  },
  'ui/**/*.{json,css,md}': ['prettier --write'],
  '*.{json,md,mdc}': ['prettier --write'],
};
