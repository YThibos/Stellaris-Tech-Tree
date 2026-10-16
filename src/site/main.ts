import { mount } from 'svelte';
// The font ships with the site, so visitors' browsers never contact a font service.
import '@fontsource/exo-2/400.css';
import '@fontsource/exo-2/500.css';
import '@fontsource/exo-2/600.css';
import '@fontsource/exo-2/700.css';
import App from './App.svelte';
import './theme.css';

const target = document.getElementById('app');
if (!target) throw new Error('The page has no #app element.');

mount(App, { target });
