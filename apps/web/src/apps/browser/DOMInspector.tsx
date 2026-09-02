import { useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';

interface DOMNode {
  nodeId: number;
  nodeType: number;
  nodeName: string;
  localName: string;
  nodeValue: string;
  childNodeCount?: number;
  children?: DOMNode[];
  attributes?: string[];
}

interface DOMInspectorProps {
  node: DOMNode | null;
}

const DOMNodeView = ({ node, depth = 0 }: { node: DOMNode; depth?: number }) => {
  const [expanded, setExpanded] = useState(depth < 3);

  // Text node
  if (node.nodeType === 3) {
    if (!node.nodeValue || !node.nodeValue.trim()) return null;
    return (
      <div style={{ paddingLeft: `${depth * 14}px` }} className="text-gray-300 whitespace-pre-wrap font-mono">
        {node.nodeValue}
      </div>
    );
  }

  // Element node or Document
  if (node.nodeType === 1 || node.nodeType === 9) {
    const hasChildren = node.children && node.children.length > 0;
    const tagName = node.localName ? node.localName.toLowerCase() : node.nodeName.toLowerCase();
    
    if (node.nodeType === 9) { // Document root
      return (
        <div className="font-mono leading-relaxed">
          {node.children && node.children.map(child => (
            <DOMNodeView key={child.nodeId} node={child} depth={depth} />
          ))}
        </div>
      );
    }
    
    // Parse attributes array ["name", "value", "name2", "value2"]
    const attrs: Record<string, string> = {};
    if (node.attributes) {
      for (let i = 0; i < node.attributes.length; i += 2) {
        attrs[node.attributes[i]] = node.attributes[i + 1];
      }
    }

    const formatAttrs = () => {
      return Object.entries(attrs).map(([key, val]) => (
        <span key={key} className="text-gray-400">
          {' '}
          <span className="text-[#9cdcfe]">{key}</span>=
          <span className="text-[#ce9178]">"{val}"</span>
        </span>
      ));
    };

    return (
      <div className="font-mono leading-relaxed">
        <div 
          className="flex items-center hover:bg-[#2a2d2a] cursor-pointer select-none" 
          style={{ paddingLeft: `${Math.max(0, depth * 14 - (hasChildren ? 14 : 0))}px` }}
          onClick={() => setExpanded(!expanded)}
        >
          {hasChildren ? (
            <span className="w-3.5 flex items-center justify-center text-gray-500">
              {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </span>
          ) : (
             <span className="w-3.5"></span>
          )}
          
          <span className="text-gray-400">&lt;</span>
          <span className="text-[#569cd6]">{tagName}</span>
          {formatAttrs()}
          <span className="text-gray-400">&gt;</span>
          {!expanded && hasChildren && <span className="text-gray-500 ml-1">...&lt;/{tagName}&gt;</span>}
        </div>
        
        {expanded && node.children && (
          <div>
            {node.children.map(child => (
              <DOMNodeView key={child.nodeId} node={child} depth={depth + 1} />
            ))}
          </div>
        )}

        {expanded && hasChildren && (
          <div style={{ paddingLeft: `${depth * 14}px` }} className="hover:bg-[#2a2d2a] cursor-pointer" onClick={() => setExpanded(false)}>
            <span className="text-gray-400">&lt;/</span>
            <span className="text-[#569cd6]">{tagName}</span>
            <span className="text-gray-400">&gt;</span>
          </div>
        )}
      </div>
    );
  }

  return null;
};

export default function DOMInspector({ node }: DOMInspectorProps) {
  if (!node) {
    return <div className="p-3 text-gray-500 font-mono">DOM Tree not available or loading...</div>;
  }
  return (
    <div className="p-2 text-[12px] bg-[#1e1e1e] overflow-auto">
      <DOMNodeView node={node} />
    </div>
  );
}
