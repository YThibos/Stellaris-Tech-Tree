import { mount } from 'svelte';
import App from './App.svelte';
import './theme.css';

const target = document.getElementById('app');
if (!target) throw new Error('The page has no #app element.');

mount(App, { target });
