import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

// build entries mapping (input -> output)
const entries = [
  { input: 'js/devmasterzone_alert.js', output: 'dist/devmasterzone_alert.js', name: 'DevMasterzoneAlert' },
  { input: 'js/devmasterzone_accordion.js', output: 'dist/devmasterzone_accordion.js', name: 'DevMasterzoneAccordion' }
];

export default entries.map(e => ({
  input: e.input,
  output: {
    file: e.output,
    format: 'umd',
    name: e.name,
    sourcemap: true
  },
  plugins: [
    resolve(),
    commonjs()
  ],
  onwarn(warning, warn) {
    if (warning.code === 'CIRCULAR_DEPENDENCY') return;
    warn(warning);
  }
}));
