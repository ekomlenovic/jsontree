// src/components/FileExplorer.tsx
import { useApp } from "@/store/useApp";
import { classNames } from "@/utility/classNames";
import { useCallback, useEffect, useRef, useState } from "react";

interface FileItem {
  name: string;
  mtime: number;
}

export default function FileExplorer() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Cette ref permet de s'assurer qu'on ne charge le dernier fichier 
  // QU'UNE SEULE FOIS au démarrage de l'appli, et plus jamais ensuite automatiquement.
  const initialLoadDone = useRef(false);

  const setContents = useApp((state) => state.setContents);

  // Fonction pour charger le contenu d'un fichier (sur clic uniquement)
  const loadFileContent = useCallback(async (filename: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/files?filename=${encodeURIComponent(filename)}`);
      const data = await res.json();
      
      if (data.content) {
        setContents({ contents: data.content, hasChanges: false });
        setSelectedFile(filename);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Erreur chargement fichier:", error);
    } finally {
      setLoading(false);
    }
  }, [setContents]);

  // Fonction de récupération de la liste (Polling)
  const fetchFileList = useCallback(async () => {
    try {
      const res = await fetch('/api/files');
      const fileList: FileItem[] = await res.json();
      
      if (Array.isArray(fileList)) {
        setFiles(fileList);

        // LOGIQUE D'INITIALISATION :
        // On ne charge automatiquement QUE si c'est le tout premier lancement (F5)
        // et qu'aucun fichier n'a encore été chargé.
        if (!initialLoadDone.current && fileList.length > 0) {
            loadFileContent(fileList[0].name);
            initialLoadDone.current = true;
        }
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Erreur polling fichiers", e);
    }
  }, [loadFileContent]);

  // Intervalle de mise à jour de la liste (toutes les 2 secondes)
  useEffect(() => {
    fetchFileList(); // Appel immédiat
    const intervalId = setInterval(fetchFileList, 2000); // Appel périodique
    return () => clearInterval(intervalId);
  }, [fetchFileList]);

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-[#1e1e1e] border-r border-gray-200 dark:border-gray-700">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Explorateur
          </h2>
          <p className="text-xs text-gray-400 mt-1 truncate">
            ~/.../out/json
          </p>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {files.map((file, index) => (
          <button
            key={file.name}
            onClick={() => loadFileContent(file.name)}
            disabled={loading}
            className={classNames(
              "w-full text-left px-3 py-2 mb-1 text-sm rounded transition-colors group",
              selectedFile === file.name
                ? "bg-blue-600 text-white"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#2d2d2d]"
            )}
          >
            <div className="font-medium truncate flex justify-between items-center">
              <span className="truncate">{file.name}</span>
              
              {/* Indicateur visuel "LATEST" pour identifier le dernier fichier arrivé */}
              {index === 0 && (
                <span className={classNames(
                    "text-[10px] px-1.5 py-0.5 rounded ml-2 font-semibold shadow-sm",
                    selectedFile === file.name 
                        ? "bg-white/20 text-white" 
                        : "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300"
                )}>
                    NEW
                </span>
              )}
            </div>
            <div className={classNames(
              "text-xs mt-1 flex justify-between",
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
            Aucun fichier trouvé...
          </div>
        )}
      </div>
    </div>
  );
}