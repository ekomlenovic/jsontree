import { useApp } from "@/store/useApp";
import { classNames } from "@/utility/classNames";
import { useCallback, useEffect, useRef, useState } from "react";

interface FileItem {
name: string;
path: string;
isDirectory: boolean;
mtime: number;
}

export default function FileExplorer() {
const [currentPath, setCurrentPath] = useState<string>("");
const [items, setItems] = useState<FileItem[]>([]);
const [selectedFile, setSelectedFile] = useState<string | null>(null);
const [isAutoWatch, setIsAutoWatch] = useState(true);
const [loading, setLoading] = useState(false);

const latestFileRef = useRef<string | null>(null);
const setContents = useApp((state) => state.setContents);

// Charger le contenu d'un fichier
const loadFileContent = useCallback(async (filePath: string) => {
try {
setLoading(true);
// On demande l'action 'read'
const res = await fetch(`/api/files?action=read&path=${encodeURIComponent(filePath)}`);
const data = await res.json();

if (data.content) {
setContents({ contents: data.content, hasChanges: false });
setSelectedFile(filePath);
latestFileRef.current = filePath;
}
} catch (error) {
console.error("Erreur lecture:", error);
} finally {
setLoading(false);
}
}, [setContents]);

// Charger la liste des fichiers (navigation)
const fetchDir = useCallback(async (pathQuery: string = "") => {
try {
const url = pathQuery
? `/api/files?path=${encodeURIComponent(pathQuery)}`
: '/api/files'; // Chargera le defaultPath du serveur au premier appel

const res = await fetch(url);
const data = await res.json();

if (data.path) {
setCurrentPath(data.path);
setItems(data.files || []);

// Logique Auto-Watch: si un nouveau fichier JSON apparaît en tête de liste
if (isAutoWatch && data.files.length > 0) {
const firstFile = data.files.find((f: FileItem) => !f.isDirectory && f.name.endsWith('.json'));
if (firstFile && firstFile.path !== latestFileRef.current) {
console.log("Auto-load:", firstFile.name);
loadFileContent(firstFile.path);
}
}
}
} catch (e) {
console.error("Erreur navigation", e);
}
}, [isAutoWatch, loadFileContent]);

// Polling automatique pour rafraichir le dossier courant
useEffect(() => {
fetchDir(currentPath); // Premier chargement

const interval = setInterval(() => {
// On ne refresh que si on a déjà un path défini
if (currentPath) fetchDir(currentPath);
}, 2000);

return () => clearInterval(interval);
}, [fetchDir, currentPath]);

// Navigation vers le dossier parent
const handleGoUp = () => {
// Astuce simple pour trouver le parent sans path manipulation complexe
// Si on est sur "/a/b", le parent est le dossier contenant "b"
// Le backend gère les chemins, mais ici on peut scinder la string
// Windows utilise \, Unix utilise /
const separator = currentPath.includes("\\") ? "\\" : "/";
const parts = currentPath.split(separator);
parts.pop(); // Enlever le dossier courant
const parentPath = parts.join(separator) || "/";
fetchDir(parentPath);
};

return (
<div className="h-full flex flex-col bg-gray-50 dark:bg-[#1e1e1e] border-r border-gray-200 dark:border-gray-700">

{/* HEADER : Barre d'adresse et contrôles */}
<div className="p-2 border-b border-gray-200 dark:border-gray-700 flex flex-col gap-2">
<div className="flex items-center gap-2">
<button
onClick={handleGoUp}
className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
title="Dossier parent"
>
⬆️
</button>
<input
type="text"
value={currentPath}
onChange={(e) => setCurrentPath(e.target.value)}
onKeyDown={(e) => e.key === 'Enter' && fetchDir(currentPath)}
className="flex-1 text-xs p-1 rounded border border-gray-300 dark:border-gray-600 dark:bg-[#2d2d2d] dark:text-gray-300"
placeholder="/chemin/vers/dossier..."
/>
</div>

<div className="flex justify-between items-center px-1">
<span className="text-[10px] uppercase font-bold text-gray-400">Contenu</span>
<button
onClick={() => setIsAutoWatch(!isAutoWatch)}
className={classNames(
"px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 transition-colors border",
isAutoWatch
? "bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400"
: "bg-gray-100 border-gray-200 text-gray-500 dark:bg-gray-800 dark:border-gray-700"
)}
>
<div className={classNames("w-1.5 h-1.5 rounded-full", isAutoWatch ? "bg-green-500 animate-pulse" : "bg-gray-400")} />
{isAutoWatch ? "LIVE" : "PAUSE"}
</button>
</div>
</div>

{/* LISTE DES FICHIERS */}
<div className="flex-1 overflow-y-auto p-1">
{items.map((item) => (
<button
key={item.path}
onClick={() => item.isDirectory ? fetchDir(item.path) : loadFileContent(item.path)}
className={classNames(
"w-full text-left px-2 py-1.5 mb-0.5 text-xs rounded flex items-center gap-2 group",
selectedFile === item.path
? "bg-blue-600 text-white"
: "text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#2d2d2d]"
)}
>
{/* Icône simple selon le type */}
<span className="text-base opacity-70">
{item.isDirectory ? "📁" : "📄"}
</span>

<div className="flex-1 min-w-0">
<div className="truncate font-medium">{item.name}</div>
</div>

{!item.isDirectory && (
<span className="text-[10px] opacity-50 whitespace-nowrap">
{new Date(item.mtime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
</span>
)}
</button>
))}

{items.length === 0 && (
<div className="p-4 text-center text-xs text-gray-400 italic">
Dossier vide
</div>
)}
</div>
</div>
);
}
