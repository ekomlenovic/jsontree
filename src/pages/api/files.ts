import fs from 'fs';
import type { NextApiRequest, NextApiResponse } from 'next';
import os from 'os';
import path from 'path';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        const { path: queryPath, action } = req.query;

        // Chemin par défaut : Dossier de l'utilisateur ou chemin spécifique si fourni
        // Si aucun chemin n'est fourni, on tente le chemin que vous aviez en dur, sinon le home
        const defaultPath = path.join(os.homedir());
        const safeDefault = fs.existsSync(defaultPath) ? defaultPath : os.homedir();

        const targetPath = (queryPath as string) || safeDefault;

        // ACTION: Lire un fichier
        if (action === 'read') {
            if (!fs.existsSync(targetPath) || fs.statSync(targetPath).isDirectory()) {
                return res.status(404).json({ error: 'Fichier non trouvé ou est un dossier' });
            }
            const content = fs.readFileSync(targetPath, 'utf-8');
            return res.status(200).json({ content });
        }

        // ACTION: Lister le dossier (défaut)
        if (!fs.existsSync(targetPath)) {
            return res.status(404).json({ error: 'Chemin introuvable' });
        }

        // Vérifier si c'est un dossier
        const stat = fs.statSync(targetPath);
        if (!stat.isDirectory()) {
            // Si on pointe vers un fichier par erreur, on renvoie son dossier parent
            return res.status(200).json({
                path: path.dirname(targetPath),
                files: [] // On forcera le rechargement coté client
            });
        }

        const entries = fs.readdirSync(targetPath, { withFileTypes: true })
            .map(entry => {
                // On récupère les infos de date
                try {
                    const fullPath = path.join(targetPath, entry.name);
                    const stats = fs.statSync(fullPath);
                    return {
                        name: entry.name,
                        isDirectory: entry.isDirectory(),
                        path: fullPath,
                        mtime: stats.mtime.getTime()
                    };
                } catch (e) {
                    return null;
                }
            })
            .filter(Boolean) // Enlever les erreurs éventuelles
            // Tri: Dossiers d'abord, puis fichiers par date récente
            // @ts-ignore
            .sort((a, b) => {
                if (a.isDirectory === b.isDirectory) {
                    return b.mtime - a.mtime; // Plus récent en premier
                }
                return a.isDirectory ? -1 : 1; // Dossiers en premier
            });

        return res.status(200).json({
            path: targetPath, // On renvoie le chemin résolu pour l'UI
            files: entries
        });

    } catch (error: any) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
}
