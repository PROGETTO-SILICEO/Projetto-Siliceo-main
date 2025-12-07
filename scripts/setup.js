/**
 * Siliceo Setup Script
 * Pre-downloads all AI models required by the application
 */

import { pipeline, env } from '@xenova/transformers';
import ora from 'ora';
import fs from 'fs';
import path from 'path';

// Configure transformers environment
env.allowLocalModels = true;
env.useBrowserCache = false;
env.localModelPath = './public/models/';

const MODELS = [
    {
        name: 'Embeddings (Text & Image)',
        id: 'Xenova/all-MiniLM-L6-v2',
        task: 'feature-extraction',
        size: '~90MB'
    },
    {
        name: 'Image Captioning',
        id: 'Xenova/vit-gpt2-image-captioning',
        task: 'image-to-text',
        size: '~500MB'
    },
    {
        name: 'Named Entity Recognition',
        id: 'vgorce/distilbert-base-multi-cased-ner',
        task: 'token-classification',
        size: '~260MB'
    },
    {
        name: 'Question Answering',
        id: 'Xenova/distilbert-base-cased-distilled-squad',
        task: 'question-answering',
        size: '~250MB'
    }
];

async function ensureModelsDirectory() {
    const modelsDir = path.join(process.cwd(), 'public', 'models');
    if (!fs.existsSync(modelsDir)) {
        fs.mkdirSync(modelsDir, { recursive: true });
    }
}

async function downloadModel(model) {
    const spinner = ora({
        text: `Downloading ${model.name} (${model.size})...`,
        color: 'cyan'
    }).start();

    try {
        await pipeline(model.task, model.id, {
            progress_callback: (progress) => {
                if (progress.status === 'downloading') {
                    const percent = Math.round((progress.loaded / progress.total) * 100);
                    spinner.text = `Downloading ${model.name}: ${percent}%`;
                }
            }
        });
        spinner.succeed(`${model.name} ✓`);
        return true;
    } catch (error) {
        spinner.fail(`${model.name} failed: ${error.message}`);
        return false;
    }
}

async function setup() {
    console.log('\n🏛️  Siliceo Core - Automated Setup\n');
    console.log('This will download ~1.1GB of AI models for local processing.');
    console.log('Models will be cached in ./public/models/\n');

    await ensureModelsDirectory();

    let successCount = 0;
    let failCount = 0;

    for (const model of MODELS) {
        const success = await downloadModel(model);
        if (success) {
            successCount++;
        } else {
            failCount++;
        }
    }

    console.log('\n' + '='.repeat(50));
    if (failCount === 0) {
        console.log('✅ Setup completato! Tutti i modelli sono pronti.');
        console.log('\nPuoi avviare l\'app con: npm run dev');
    } else {
        console.log(`⚠️  Setup parziale: ${successCount}/${MODELS.length} modelli scaricati.`);
        console.log('\nRiprova con: npm run setup');
    }
    console.log('='.repeat(50) + '\n');

    process.exit(failCount > 0 ? 1 : 0);
}

setup().catch(error => {
    console.error('\n❌ Setup fallito:', error.message);
    process.exit(1);
});
