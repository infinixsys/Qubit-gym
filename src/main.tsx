import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource-variable/inter';
import { StoreProvider } from './store';
import App from './App';
import './styles.css';
import './readability.css';

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><StoreProvider><App/></StoreProvider></React.StrictMode>);
