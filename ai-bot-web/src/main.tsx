import { VueQueryPlugin } from '@tanstack/vue-query';
import { createApp } from 'vue';
import App from './App';
import './styles.css';

createApp(App).use(VueQueryPlugin).mount('#app');
