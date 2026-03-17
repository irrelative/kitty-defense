import './assets/styles/main.css';
import { GameApp } from './ui/render';

const root = document.querySelector<HTMLElement>('#app');

if (!root) {
  throw new Error('App root not found');
}

const app = new GameApp(root);
app.mount();
