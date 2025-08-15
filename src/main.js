import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './parlor/App';
const rootElement = document.getElementById('root');
createRoot(rootElement).render(_jsx(React.StrictMode, { children: _jsx(App, {}) }));
