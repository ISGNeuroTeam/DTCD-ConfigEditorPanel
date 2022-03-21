import html from 'rollup-plugin-html';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import styles from 'rollup-plugin-styles';
import json from '@rollup/plugin-json';
import { babel } from '@rollup/plugin-babel';
import { version } from './package.json';

const watch = Boolean(process.env.ROLLUP_WATCH);

const pluginName = 'ConfigEditorPanel';
const fileDest = watch
  ? `./../../DTCD/server/plugins/DTCD-${pluginName}_${version}/${pluginName}.js`
  : `./build/${pluginName}.js`;

const plugins = [
  json(),
  resolve({
    jsnext: true,
    preferBuiltins: true,
    browser: true,
  }),
  styles({
    // mode: 'inject',
    // modules: true,
    mode:['inject',()=>''],
  }),
  html({
    include: ['**/*.html', '**/*.svg'],
  }),
  babel({
    babelHelpers: 'bundled',
    plugins: ['@babel/plugin-proposal-class-properties', '@babel/plugin-proposal-private-methods'],
  }),
  commonjs(),
];

export default {
  plugins,
  input: `src/${pluginName}.js`,
  output: {
    file: fileDest,
    format: 'esm',
    sourcemap: false,
  },
  watch: {
    include: ['./src/**'],
  },
};
