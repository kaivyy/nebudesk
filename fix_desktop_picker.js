const fs = require('fs');
let code = fs.readFileSync('apps/web/src/desktop/Desktop.tsx', 'utf8');

code = code.replace("import FolderPicker from './FolderPicker';", "import FilePicker from './FilePicker';");

const oldPickerState = `  // Folder Picker State
  const [pickerProps, setPickerProps] = useState<{ onSelect: (p: string) => void, onCancel: () => void, initialPath: string } | null>(null);

  useEffect(() => {
    const handlePickFolder = (e: any) => {
      setPickerProps({
        initialPath: e.detail.initialPath || '/root',
        onSelect: (path: string) => {
          if (e.detail.onSelect) e.detail.onSelect(path);
          setPickerProps(null);
        },
        onCancel: () => {
          setPickerProps(null);
        }
      });
    };
    document.addEventListener('desktop:pick-folder', handlePickFolder);
    return () => document.removeEventListener('desktop:pick-folder', handlePickFolder);
  }, []);`;

const newPickerState = `  // Picker State
  const [pickerProps, setPickerProps] = useState<{ onSelect: (p: string) => void, onCancel: () => void, initialPath: string, mode: 'file' | 'folder' } | null>(null);

  useEffect(() => {
    const handlePickFolder = (e: any) => {
      setPickerProps({
        mode: 'folder',
        initialPath: e.detail.initialPath || '/root',
        onSelect: (path: string) => {
          if (e.detail.onSelect) e.detail.onSelect(path);
          setPickerProps(null);
        },
        onCancel: () => setPickerProps(null)
      });
    };
    const handlePickFile = (e: any) => {
      setPickerProps({
        mode: 'file',
        initialPath: e.detail.initialPath || '/root',
        onSelect: (path: string) => {
          if (e.detail.onSelect) e.detail.onSelect(path);
          setPickerProps(null);
        },
        onCancel: () => setPickerProps(null)
      });
    };
    document.addEventListener('desktop:pick-folder', handlePickFolder);
    document.addEventListener('desktop:pick-file', handlePickFile);
    return () => {
      document.removeEventListener('desktop:pick-folder', handlePickFolder);
      document.removeEventListener('desktop:pick-file', handlePickFile);
    };
  }, []);`;

code = code.replace(oldPickerState, newPickerState);

code = code.replace(
  '{pickerProps && <FolderPicker {...pickerProps} />}',
  '{pickerProps && <FilePicker {...pickerProps} />}'
);

fs.writeFileSync('apps/web/src/desktop/Desktop.tsx', code);
// Also let's delete FolderPicker
fs.unlinkSync('apps/web/src/desktop/FolderPicker.tsx');
