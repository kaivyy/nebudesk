import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  ZoomIn, ZoomOut, Maximize, RotateCw, ChevronLeft, ChevronRight, 
  Play, Pause, Volume2, VolumeX, Repeat, Download, Film, Music, ImageIcon
} from 'lucide-react';
import { API_BASE_URL } from '../../config/api';

const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico']);
const VIDEO_EXTS = new Set(['mp4', 'webm', 'ogv', 'mov', 'mkv']);
const AUDIO_EXTS = new Set(['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a']);

function getMediaType(filename: string): 'image' | 'video' | 'audio' | 'unknown' {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (IMAGE_EXTS.has(ext)) return 'image';
  if (VIDEO_EXTS.has(ext)) return 'video';
  if (AUDIO_EXTS.has(ext)) return 'audio';
  return 'unknown';
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export default function ImageApp({ initialPath = '' }: { initialPath?: string }) {
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [mediaList, setMediaList] = useState<string[]>([]);
  const [mediaUrl, setMediaUrl] = useState('');
  const [error, setError] = useState('');
  
  // Image controls
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [imgDimensions, setImgDimensions] = useState<{ width: number; height: number } | null>(null);

  // Video / Audio playback controls
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const mediaContainerRef = useRef<HTMLDivElement>(null);

  const mediaType = useMemo(() => getMediaType(currentPath), [currentPath]);
  const filename = useMemo(() => currentPath.split('/').pop() || '', [currentPath]);

  // Load sibling media files from the same directory for Next/Prev navigation
  useEffect(() => {
    if (!currentPath) return;
    const parentDir = currentPath.substring(0, currentPath.lastIndexOf('/')) || '/';
    const fetchSiblings = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/files?p=${encodeURIComponent(parentDir)}`, { credentials: 'include' });
        if (res.ok) {
          const files: Array<{ name: string; isDir: boolean }> = await res.json();
          const siblings = files
            .filter(f => !f.isDir && getMediaType(f.name) !== 'unknown')
            .map(f => (parentDir === '/' ? `/${f.name}` : `${parentDir}/${f.name}`));
          setMediaList(siblings);
        }
      } catch {}
    };
    fetchSiblings();
  }, [currentPath]);

  const currentIndex = mediaList.indexOf(currentPath);

  // Load media stream
  useEffect(() => {
    if (!currentPath) return;
    setError('');
    setZoom(1);
    setRotation(0);
    setImgDimensions(null);
    setIsPlaying(false);
    setCurrentTime(0);

    const url = `${API_BASE_URL}/api/files/download?p=${encodeURIComponent(currentPath)}`;
    setMediaUrl(url);
  }, [currentPath]);

  // Sibling navigation
  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentPath(mediaList[currentIndex - 1]!);
    } else if (mediaList.length > 0) {
      setCurrentPath(mediaList[mediaList.length - 1]!); // Loop around
    }
  }, [currentIndex, mediaList]);

  const goNext = useCallback(() => {
    if (currentIndex < mediaList.length - 1) {
      setCurrentPath(mediaList[currentIndex + 1]!);
    } else if (mediaList.length > 0) {
      setCurrentPath(mediaList[0]!); // Loop around
    }
  }, [currentIndex, mediaList]);

  // Video / Audio toggles
  const togglePlay = () => {
    const mediaEl = videoRef.current || audioRef.current;
    if (!mediaEl) return;
    if (isPlaying) {
      mediaEl.pause();
      setIsPlaying(false);
    } else {
      mediaEl.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    const mediaEl = videoRef.current || audioRef.current;
    if (mediaEl) mediaEl.currentTime = time;
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    setIsMuted(vol === 0);
    const mediaEl = videoRef.current || audioRef.current;
    if (mediaEl) {
      mediaEl.volume = vol;
      mediaEl.muted = vol === 0;
    }
  };

  const toggleMute = () => {
    const mediaEl = videoRef.current || audioRef.current;
    if (!mediaEl) return;
    if (isMuted) {
      mediaEl.muted = false;
      setIsMuted(false);
      mediaEl.volume = volume || 0.5;
    } else {
      mediaEl.muted = true;
      setIsMuted(true);
    }
  };

  const toggleFullscreen = () => {
    if (!mediaContainerRef.current) return;
    if (!document.fullscreenElement) {
      mediaContainerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if an input is focused
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goNext();
      } else if (e.key === ' ' && (mediaType === 'video' || mediaType === 'audio')) {
        e.preventDefault();
        togglePlay();
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        setZoom(z => Math.min(5, z + 0.25));
      } else if (e.key === '-') {
        e.preventDefault();
        setZoom(z => Math.max(0.1, z - 0.25));
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        setRotation(r => (r + 90) % 360);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goPrev, goNext, isPlaying, mediaType]);

  return (
    <div className="h-full flex flex-col bg-[#121212] text-[#e0e0e0] select-none outline-none font-sans" tabIndex={0}>
      {/* Titlebar */}
      <div className="h-14 border-b border-[#242424] bg-[#1a1a1a] flex items-center px-3 shrink-0 nebudesk-drag-region select-none touch-none">
        <div className="w-[90px] shrink-0" />
        
        {/* File icon & Name */}
        <div className="flex items-center space-x-2 min-w-0 max-w-[280px] sm:max-w-md">
          {mediaType === 'image' && <ImageIcon size={16} className="text-pink-400 shrink-0" />}
          {mediaType === 'video' && <Film size={16} className="text-purple-400 shrink-0" />}
          {mediaType === 'audio' && <Music size={16} className="text-yellow-400 shrink-0" />}
          <span className="text-sm font-medium truncate text-gray-200" title={currentPath}>
            {filename || 'Media Viewer'}
          </span>
          {imgDimensions && (
            <span className="text-[11px] text-gray-500 bg-[#252525] px-1.5 py-0.5 rounded shrink-0">
              {imgDimensions.width} × {imgDimensions.height}
            </span>
          )}
          {mediaList.length > 1 && (
            <span className="text-[11px] text-gray-400 font-mono bg-[#282828] px-1.5 py-0.5 rounded shrink-0">
              {currentIndex + 1} / {mediaList.length}
            </span>
          )}
        </div>

        <div className="flex-1" />

        {/* Action Controls */}
        <div className="flex items-center space-x-1 nebudesk-no-drag">
          {mediaList.length > 1 && (
            <>
              <button 
                onClick={goPrev} 
                title="Previous (Left Arrow)" 
                className="p-1.5 hover:bg-[#2d2d2d] active:bg-[#383838] rounded text-gray-300 hover:text-white transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button 
                onClick={goNext} 
                title="Next (Right Arrow)" 
                className="p-1.5 hover:bg-[#2d2d2d] active:bg-[#383838] rounded text-gray-300 hover:text-white transition-colors"
              >
                <ChevronRight size={16} />
              </button>
              <div className="w-px h-4 bg-[#333] mx-1" />
            </>
          )}

          {mediaType === 'image' && (
            <>
              <button 
                onClick={() => setZoom(z => Math.max(0.1, z - 0.25))} 
                title="Zoom Out (-)" 
                className="p-1.5 hover:bg-[#2d2d2d] rounded text-gray-300 hover:text-white transition-colors"
              >
                <ZoomOut size={16} />
              </button>
              <span className="text-xs font-mono w-11 text-center text-gray-400">
                {Math.round(zoom * 100)}%
              </span>
              <button 
                onClick={() => setZoom(z => Math.min(5, z + 0.25))} 
                title="Zoom In (+)" 
                className="p-1.5 hover:bg-[#2d2d2d] rounded text-gray-300 hover:text-white transition-colors"
              >
                <ZoomIn size={16} />
              </button>
              <button 
                onClick={() => setRotation(r => (r + 90) % 360)} 
                title="Rotate 90° (R)" 
                className="p-1.5 hover:bg-[#2d2d2d] rounded text-gray-300 hover:text-white transition-colors ml-0.5"
              >
                <RotateCw size={15} />
              </button>
              <button 
                onClick={() => { setZoom(1); setRotation(0); }} 
                title="Reset Size" 
                className="p-1.5 hover:bg-[#2d2d2d] rounded text-gray-300 hover:text-white transition-colors"
              >
                <Maximize size={15} />
              </button>
            </>
          )}

          {mediaUrl && (
            <a 
              href={mediaUrl} 
              download={filename} 
              title="Download File" 
              className="p-1.5 hover:bg-[#2d2d2d] rounded text-gray-300 hover:text-white transition-colors ml-1"
            >
              <Download size={15} />
            </a>
          )}
        </div>
      </div>

      {/* Main Viewport */}
      <div 
        ref={mediaContainerRef} 
        className="flex-1 min-h-0 relative flex flex-col items-center justify-center bg-[#0d0d0d] overflow-hidden"
      >
        {error ? (
          <div className="text-red-400 text-sm bg-red-950/40 border border-red-800/50 p-4 rounded-lg flex flex-col items-center space-y-2">
            <span>Failed to load media file</span>
            <span className="text-xs text-red-300">{error}</span>
          </div>
        ) : !currentPath ? (
          <div className="text-gray-500 text-sm flex flex-col items-center space-y-2">
            <ImageIcon size={36} className="opacity-40 mb-1" />
            <span>No media file selected</span>
          </div>
        ) : mediaType === 'image' ? (
          <div className="w-full h-full overflow-auto flex items-center justify-center p-4 select-none">
            <img 
              src={mediaUrl} 
              alt={filename} 
              onLoad={(e) => {
                const img = e.currentTarget;
                setImgDimensions({ width: img.naturalWidth, height: img.naturalHeight });
              }}
              onError={() => setError('Unable to render image format')}
              style={{ 
                transform: `scale(${zoom}) rotate(${rotation}deg)`, 
                transition: 'transform 0.15s ease-out' 
              }}
              className="max-w-full max-h-full object-contain origin-center drop-shadow-2xl pointer-events-auto"
              draggable={false}
            />
          </div>
        ) : mediaType === 'video' ? (
          <div className="w-full h-full flex flex-col items-center justify-center relative group">
            <video 
              ref={videoRef}
              src={mediaUrl}
              onClick={togglePlay}
              onTimeUpdate={() => {
                if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
              }}
              onLoadedMetadata={() => {
                if (videoRef.current) {
                  setDuration(videoRef.current.duration);
                  setImgDimensions({ width: videoRef.current.videoWidth, height: videoRef.current.videoHeight });
                }
              }}
              onEnded={() => {
                if (!isLooping) setIsPlaying(false);
              }}
              onError={() => setError('Unable to decode video format')}
              loop={isLooping}
              className="max-w-full max-h-full object-contain cursor-pointer"
              playsInline
            />

            {/* Video Controls Overlay */}
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 flex flex-col space-y-2 opacity-95 transition-opacity duration-200">
              {/* Scrubbing Bar */}
              <div className="flex items-center w-full group/bar relative">
                <input 
                  type="range" 
                  min={0} 
                  max={duration || 100} 
                  step={0.1}
                  value={currentTime} 
                  onChange={handleSeek}
                  className="w-full h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:h-2 transition-all"
                />
              </div>

              {/* Bottom Control Buttons */}
              <div className="flex items-center justify-between text-xs text-gray-200 pt-1">
                <div className="flex items-center space-x-3">
                  <button 
                    onClick={togglePlay} 
                    className="p-1.5 hover:bg-white/20 rounded-full text-white transition-colors"
                    title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
                  >
                    {isPlaying ? <Pause size={18} /> : <Play size={18} className="fill-current" />}
                  </button>

                  <div className="flex items-center space-x-1.5 group/vol">
                    <button onClick={toggleMute} className="text-gray-300 hover:text-white" title="Mute/Unmute">
                      {isMuted || volume === 0 ? <VolumeX size={17} /> : <Volume2 size={17} />}
                    </button>
                    <input 
                      type="range" 
                      min={0} 
                      max={1} 
                      step={0.05} 
                      value={isMuted ? 0 : volume} 
                      onChange={handleVolumeChange} 
                      className="w-16 h-1 bg-gray-600 rounded appearance-none cursor-pointer accent-blue-500"
                    />
                  </div>

                  <span className="font-mono text-[11px] text-gray-400">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  {/* Playback speed */}
                  <select 
                    value={playbackRate} 
                    onChange={(e) => {
                      const rate = parseFloat(e.target.value);
                      setPlaybackRate(rate);
                      if (videoRef.current) videoRef.current.playbackRate = rate;
                    }}
                    className="bg-[#2a2a2a] text-gray-300 text-[11px] rounded px-1.5 py-0.5 border border-gray-700 focus:outline-none"
                  >
                    <option value={0.5}>0.5x</option>
                    <option value={1}>1.0x</option>
                    <option value={1.25}>1.25x</option>
                    <option value={1.5}>1.5x</option>
                    <option value={2}>2.0x</option>
                  </select>

                  <button 
                    onClick={() => setIsLooping(!isLooping)} 
                    className={`p-1.5 rounded transition-colors ${isLooping ? 'text-blue-400 bg-blue-500/20' : 'text-gray-400 hover:text-white'}`}
                    title={isLooping ? 'Loop: ON' : 'Loop: OFF'}
                  >
                    <Repeat size={15} />
                  </button>

                  <button 
                    onClick={toggleFullscreen} 
                    className="p-1.5 hover:bg-white/20 rounded text-gray-300 hover:text-white transition-colors"
                    title="Fullscreen"
                  >
                    <Maximize size={15} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : mediaType === 'audio' ? (
          <div className="flex flex-col items-center justify-center space-y-6 max-w-md w-full p-8 bg-[#181818] rounded-2xl border border-[#2b2b2b] shadow-2xl">
            <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center shadow-lg shadow-yellow-500/20">
              <Music size={48} className="text-black" />
            </div>

            <div className="text-center w-full">
              <h3 className="font-semibold text-base text-gray-100 truncate">{filename}</h3>
              <p className="text-xs text-gray-400 font-mono mt-1">Audio Playback</p>
            </div>

            <audio 
              ref={audioRef}
              src={mediaUrl}
              onTimeUpdate={() => {
                if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
              }}
              onLoadedMetadata={() => {
                if (audioRef.current) setDuration(audioRef.current.duration);
              }}
              onEnded={() => {
                if (!isLooping) setIsPlaying(false);
              }}
              loop={isLooping}
            />

            <div className="w-full space-y-2">
              <input 
                type="range" 
                min={0} 
                max={duration || 100} 
                step={0.1}
                value={currentTime} 
                onChange={handleSeek}
                className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-400"
              />
              <div className="flex justify-between text-[11px] font-mono text-gray-400">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            <div className="flex items-center justify-between w-full pt-2">
              <button onClick={toggleMute} className="text-gray-400 hover:text-white">
                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>

              <div className="flex items-center space-x-4">
                <button onClick={goPrev} className="p-2 hover:bg-[#2d2d2d] rounded-full text-gray-300">
                  <ChevronLeft size={20} />
                </button>
                <button 
                  onClick={togglePlay} 
                  className="w-12 h-12 bg-yellow-400 hover:bg-yellow-300 active:scale-95 text-black rounded-full flex items-center justify-center shadow-md transition-transform"
                >
                  {isPlaying ? <Pause size={22} className="fill-current" /> : <Play size={22} className="fill-current ml-0.5" />}
                </button>
                <button onClick={goNext} className="p-2 hover:bg-[#2d2d2d] rounded-full text-gray-300">
                  <ChevronRight size={20} />
                </button>
              </div>

              <button 
                onClick={() => setIsLooping(!isLooping)} 
                className={`p-1.5 rounded transition-colors ${isLooping ? 'text-yellow-400' : 'text-gray-500 hover:text-gray-300'}`}
              >
                <Repeat size={18} />
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-500 space-y-3">
            <p>Preview not available for this format</p>
            {mediaUrl && (
              <a 
                href={mediaUrl} 
                download={filename} 
                className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium"
              >
                <Download size={14} />
                <span>Download {filename}</span>
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
