const fs = require('fs');
let code = fs.readFileSync('apps/web/src/apps/files/FilesApp.tsx', 'utf8');

code = code.replace("ChevronLeft, ChevronRight, LayoutGrid, AlignJustify, FolderOpen,", "ChevronLeft, ChevronRight, LayoutGrid, FolderOpen,");
code = code.replace("Clock, Users, AppWindow, ArrowDownCircle, Monitor, Cloud, HardDrive, List, Columns, Share, Tag, MoreHorizontal", "Clock, Users, AppWindow, ArrowDownCircle, Monitor, Cloud, HardDrive, List, MoreHorizontal");

fs.writeFileSync('apps/web/src/apps/files/FilesApp.tsx', code);
