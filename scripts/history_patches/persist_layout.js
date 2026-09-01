const fs = require('fs');
let code = fs.readFileSync('apps/web/src/apps/code/CodeApp.tsx', 'utf8');

const targetState = `  const [activeActivity, setActiveActivity] = useState('explorer');
  const [sidebarWidth, setSidebarWidth] = useState(256);
  const [showBottomPanel, setShowBottomPanel] = useState(false);
  const [bottomPanelHeight, setBottomPanelHeight] = useState(250);`;

const persistedState = `  const [activeActivity, setActiveActivity] = useState(() => localStorage.getItem('nebucode_activity') || 'explorer');
  const [sidebarWidth, setSidebarWidth] = useState(() => Number(localStorage.getItem('nebucode_sidebar')) || 256);
  const [showBottomPanel, setShowBottomPanel] = useState(() => localStorage.getItem('nebucode_terminal_open') === 'true');
  const [bottomPanelHeight, setBottomPanelHeight] = useState(() => Number(localStorage.getItem('nebucode_terminal_height')) || 250);

  useEffect(() => { localStorage.setItem('nebucode_activity', activeActivity); }, [activeActivity]);
  useEffect(() => { localStorage.setItem('nebucode_sidebar', sidebarWidth.toString()); }, [sidebarWidth]);
  useEffect(() => { localStorage.setItem('nebucode_terminal_open', showBottomPanel.toString()); }, [showBottomPanel]);
  useEffect(() => { localStorage.setItem('nebucode_terminal_height', bottomPanelHeight.toString()); }, [bottomPanelHeight]);`;

code = code.replace(targetState, persistedState);
fs.writeFileSync('apps/web/src/apps/code/CodeApp.tsx', code);
console.log('done!');
