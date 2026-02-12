// Quick test to check if parsing works
const SAMPLE = `EditorWindow < UIMiniWindow
  size: 800 600
  !text: tr('Sample')`;

console.log('Sample OTUI:', SAMPLE);
console.log('Length:', SAMPLE.length);
console.log('Lines:', SAMPLE.split('\n').length);
