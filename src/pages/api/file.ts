// src/pages/api/files.ts
import fs from 'fs';
import type { NextApiRequest, NextApiResponse } from 'next';
import os from 'os';
import path from 'path';

// Le chemin vers votre dossier spécifique
const TARGET_DIR = path.join(
    os.homedir(),
    'ia-prod/commandes_auto/src/commandes_auto/data/out/json'
);

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        const { filename } = req.query;

        // Cas 1: Lire le contenu d'un fichier spécifique
        if (filename && typeof filename === 'string') {
            const filePath = path.join(TARGET_DIR, filename);

            if (!fs.existsSync(filePath)) {
                return res.status(404).json({ error: 'Fichier non trouvé' });
            }

            const content = fs.readFileSync(filePath, 'utf-8');
            return res.status(200).json({ content });
        }

        // Cas 2: Lister les fichiers du dossier
        if (!fs.existsSync(TARGET_DIR)) {
            return res.status(404).json({ error: 'Dossier introuvable: ' + TARGET_DIR });
        }

        const files = fs.readdirSync(TARGET_DIR)
            .filter(file => file.endsWith('.json')) // On ne garde que les JSON
            .map(file => {
                const stats = fs.statSync(path.join(TARGET_DIR, file));
                return {
                    name: file,
                    mtime: stats.mtime.getTime()
                };
            })
            // Tri par date de modification décroissante (le plus récent en premier)
            .sort((a, b) => b.mtime - a.mtime);

        return res.status(200).json(files);

    } catch (error: any) {
        // eslint-disable-next-line no-console
        console.error(error);
        res.status(500).json({ error: error.message });
    }
}
