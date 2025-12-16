// src/components/FileExplorer.tsx
import { useEffect, useState, useRef, useCallback } from "react";
import { useApp } from "@/store/useApp";
import { classNames } from "@/utility/classNames";

interface FileItem {
  name: string;
  mtime: number;
}

export default function FileExplorer() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isAutoWatch, setIsAutoWatch] = useState(true); // Activé par défaut
  const [loading, setLoading] = useState(false);
  
  // Ref pour comparer sans déclencher de re-rendus inutiles
  const latestFileRef = useRef<string | null>(null);
  const setContents = useApp((state) => state.setContents);

  // Fonction pour charger le contenu (mémorisée pour le useEffect)
  const loadFileContent = useCallback(async (filename: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/files?filename=${encodeURIComponent(filename)}`);
      const data = await res.json();
      
      if (data.content) {
        setContents({ contents: data.content, hasChanges: false });
        setSelectedFile(filename);
        latestFileRef.current = filename;
      }
    } catch (error) {
      console.error("Erreur chargement fichier:", error);
    } finally {
      setLoading(false);
    }
  }, [setContents]);

  // Fonction de récupération de la liste
  const fetchFileList = useCallback(async () => {
    try {
      const res = await fetch('/api/files');
      const fileList: FileItem[] = await res.json();
      
      if (Array.isArray(fileList)) {
        // Mise à jour de la liste
        setFiles(fileList);

        // LOGIQUE AUTO-SELECT:
        // Si on a des fichiers, que le mode "Suivre" est actif, 
        // et que le fichier le plus récent (index 0) est différent de celui qu'on a vu en dernier...
        if (isAutoWatch && fileList.length > 0) {
          const newestFileName = fileList[0].name;
          
          if (newestFileName !== latestFileRef.current) {
            console.log("Nouveau fichier détecté :", newestFileName);
            loadFileContent(newestFileName);
          }
        }
      }
    } catch (e) {
      console.error("Erreur polling fichiers", e);
    }
  }, [isAutoWatch, loadFileContent]);

  // Effect pour le polling (toutes les 2000ms)
  useEffect(() => {
    // Premier chargement immédiat
    fetchFileList();

    const intervalId = setInterval(fetchFileList, 2000);
    return () => clearInterval(intervalId);
  }, [fetchFileList]);

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-[#1e1e1e] border-r border-gray-200 dark:border-gray-700">
      {/* Header avec bouton Toggle pour l'auto-sélection */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Explorateur
          </h2>
          <p className="text-xs text-gray-400 mt-1 truncate max-w-[150px]">
            ~/.../out/json
          </p>
        </div>
        
        <button
          onClick={() => setIsAutoWatch(!isAutoWatch)}
          title={isAutoWatch ? "Suivi automatique activé (cliquer pour désactiver)" : "Suivi automatique désactivé"}
          className={classNames(
            "p-2 rounded transition-colors text-xs flex items-center gap-2",
            isAutoWatch 
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
              : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
          )}
        >
          <div className={classNames("w-2 h-2 rounded-full", isAutoWatch ? "bg-green-500 animate-pulse" : "bg-gray-400")} />
          {isAutoWatch ? "LIVE" : "OFF"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {files.map((file) => (
          <button
            key={file.name}
            onClick={() => {
              // Si l'utilisateur clique manuellement, on charge le fichier
              // (Note: cela ne désactive pas forcément le mode Live, mais le prochain fichier généré prendra le dessus)
              loadFileContent(file.name);
            }}
            disabled={loading}
            className={classNames(
              "w-full text-left px-3 py-2 mb-1 text-sm rounded transition-colors group",
              selectedFile === file.name
                ? "bg-blue-600 text-white"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#2d2d2d]"
            )}
          >
            <div className="font-medium truncate flex justify-between">
              <span>{file.name}</span>
              {/* Petit indicateur visuel si c'est le plus récent */}
              {files.indexOf(file) === 0 && (
                <span className="text-[10px] bg-blue-500/20 px-1 rounded text-blue-200 ml-2 self-center">NEW</span>
              )}
            </div>
            <div className={classNames(
              "text-xs mt-0.5 flex justify-between",
              selectedFile === file.name ? "text-blue-200" : "text-gray-500"
            )}>
              <span>{new Date(file.mtime).toLocaleTimeString()}</span>
              <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                {new Date(file.mtime).toLocaleDateString()}
              </span>
            </div>
          </button>
        ))}
        
        {files.length === 0 && (
          <div className="p-4 text-center text-sm text-gray-500">
            En attente de fichiers...
          </div>
        )}
      </div>
    </div>
  );
}
