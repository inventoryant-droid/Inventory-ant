const fs = require('fs');
const path = require('path');

const srcDir = __dirname;
const appJsxPath = path.join(srcDir, 'App.jsx');

const content = fs.readFileSync(appJsxPath, 'utf-8');

// Define markers
const markers = [
  { name: 'imports', start: "import React", end: "// --- GLOBAL HELPER: EXPIRES LOGIC ---" },
  { name: 'expiryHelpers', start: "// --- GLOBAL HELPER: EXPIRES LOGIC ---", end: "function AuthScreen" },
  { name: 'AuthScreen', start: "function AuthScreen", end: "function UserGuide" },
  { name: 'UserGuide', start: "function UserGuide", end: "function Sidebar" },
  { name: 'Sidebar', start: "function Sidebar", end: "function Dashboard" },
  { name: 'Dashboard', start: "function Dashboard", end: "function ScannerModal" },
  { name: 'ScannerModal', start: "function ScannerModal", end: "function AITools" },
  { name: 'AITools', start: "function AITools", end: "function Settings" },
  { name: 'Settings', start: "function Settings", end: "function Billing" },
  { name: 'Billing', start: "function Billing", end: "function Inventory" },
  { name: 'Inventory', start: "function Inventory", end: "function AntSupplyChain" },
  { name: 'AntSupplyChain', start: "function AntSupplyChain", end: "// =====================================================================" },
  { name: 'About', start: "// =====================================================================", end: "function AntAgent(" },
  { name: 'AntAgent', start: "function AntAgent(", end: "function WelcomeModal" },
  { name: 'WelcomeModal', start: "function WelcomeModal", end: "export default function App" },
  { name: 'App', start: "export default function App", end: null }
];

const blocks = {};

markers.forEach(m => {
  const startIdx = content.indexOf(m.start);
  let endIdx = m.end ? content.indexOf(m.end, startIdx) : content.length;
  if (startIdx !== -1) {
    blocks[m.name] = content.slice(startIdx, endIdx);
  } else {
    console.log("Missing marker:", m.name);
  }
});

// Create directories
const dirs = ['utils', 'components/ui', 'components/layout', 'pages'];
dirs.forEach(d => {
  const p = path.join(srcDir, d);
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
});

// Write files
// 1. utils/expiryHelpers.js
fs.writeFileSync(path.join(srcDir, 'utils', 'expiryHelpers.js'), 
`export ${blocks['expiryHelpers'].replace('const getExpiryInfo', 'const getExpiryInfo').replace('const getExpKey', 'export const getExpKey')}`.replace('const getExpiryInfo', 'export const getExpiryInfo')
);

// Helper to wrap components
const wrapComponent = (imports, body, exportName) => {
  return `${imports}\n\n${body}\nexport default ${exportName};\n`;
};

const commonImports = `import React, { useState, useEffect, useRef, useMemo } from 'react';\nimport '../App.css';`;

// 2. components/ui/AntSupplyChain.jsx
fs.writeFileSync(path.join(srcDir, 'components', 'ui', 'AntSupplyChain.jsx'), wrapComponent(commonImports, blocks['AntSupplyChain'], 'AntSupplyChain'));

// 3. components/ui/ScannerModal.jsx
fs.writeFileSync(path.join(srcDir, 'components', 'ui', 'ScannerModal.jsx'), wrapComponent(commonImports, blocks['ScannerModal'], 'ScannerModal'));

// 4. components/ui/WelcomeModal.jsx
fs.writeFileSync(path.join(srcDir, 'components', 'ui', 'WelcomeModal.jsx'), wrapComponent(commonImports, blocks['WelcomeModal'], 'WelcomeModal'));

// 5. components/layout/Sidebar.jsx
fs.writeFileSync(path.join(srcDir, 'components', 'layout', 'Sidebar.jsx'), wrapComponent(commonImports, blocks['Sidebar'], 'Sidebar'));

// Pages
const pages = [
  { name: 'AuthScreen', block: 'AuthScreen', extraImports: `import AntSupplyChain from '../components/ui/AntSupplyChain';` },
  { name: 'UserGuide', block: 'UserGuide' },
  { name: 'Dashboard', block: 'Dashboard', extraImports: `import { getExpiryInfo, getExpKey } from '../utils/expiryHelpers';` },
  { name: 'AITools', block: 'AITools' },
  { name: 'Settings', block: 'Settings', extraImports: `import Papa from 'papaparse';` },
  { name: 'Billing', block: 'Billing' },
  { name: 'Inventory', block: 'Inventory', extraImports: `import { getExpiryInfo, getExpKey } from '../utils/expiryHelpers';` },
  { name: 'About', block: 'About' },
];

pages.forEach(p => {
  let imp = commonImports;
  if (p.extraImports) imp += '\n' + p.extraImports;
  fs.writeFileSync(path.join(srcDir, 'pages', `${p.name}.jsx`), wrapComponent(imp, blocks[p.block], p.name));
});

// Write new App.jsx
const newAppJsx = `import React, { useState, useEffect, useRef, useMemo } from 'react';
import './App.css';
import AntAgentV2 from './components/AntAgentV2';
import AntXTerminal from './components/AntXTerminal';

import AuthScreen from './pages/AuthScreen';
import UserGuide from './pages/UserGuide';
import Sidebar from './components/layout/Sidebar';
import Dashboard from './pages/Dashboard';
import ScannerModal from './components/ui/ScannerModal';
import AITools from './pages/AITools';
import Settings from './pages/Settings';
import Billing from './pages/Billing';
import Inventory from './pages/Inventory';
import About from './pages/About';
import WelcomeModal from './components/ui/WelcomeModal';

${blocks['App']}
`;
fs.writeFileSync(path.join(srcDir, 'App.jsx'), newAppJsx);

console.log("Refactoring complete.");
