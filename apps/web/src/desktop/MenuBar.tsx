export default function MenuBar() {
  return (
    <div className="h-6 bg-gray-900/80 backdrop-blur text-white flex items-center px-4 text-sm justify-between">
      <div className="flex space-x-4">
        <span className="font-bold">🐧 WebLinux</span>
        <span>File</span>
        <span>Edit</span>
        <span>View</span>
        <span>Window</span>
        <span>Help</span>
      </div>
      <div>🔊 {new Date().toLocaleTimeString()}</div>
    </div>
  );
}
