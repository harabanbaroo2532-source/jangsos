const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ffmpegPath = require('ffmpeg-static');
const googleTTS = require('google-tts-api');

console.log('🎬 Initializing Video Generator Engine with TTS Voice Narration...');
console.log('📍 FFmpeg binary:', ffmpegPath);

/**
 * Helper to generate speech MP3 audio file from script text (supports long texts > 200 chars)
 */
async function generateSpeechAudio(text, outputPath, lang = 'th') {
    try {
        const results = await googleTTS.getAllAudioBase64(text, {
            lang: lang,
            slow: false,
            host: 'https://translate.google.com',
            timeout: 10000,
        });

        const buffers = results.map(item => Buffer.from(item.base64, 'base64'));
        const combinedBuffer = Buffer.concat(buffers);

        fs.writeFileSync(outputPath, combinedBuffer);
        console.log(`  🔊 Generated speech audio (${text.length} chars) -> ${path.basename(outputPath)}`);
        return outputPath;
    } catch (err) {
        console.error('  ⚠️ Failed to generate speech audio:', err.message);
        return null;
    }
}

/**
 * Renders a complete video from a JSON configuration of scenes.
 */
async function generateVideo(config) {
    const {
        scenes = [],
        outputFile = 'output_video.mp4',
        audioFile = null,
        fps = 30,
        resolution = '1920x1080',
        defaultLang = 'th'
    } = config;

    const tempDir = path.join(__dirname, 'temp_render_' + Date.now());
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }

    try {
        console.log(`\n📹 Processing ${scenes.length} scenes (Resolution: ${resolution}, FPS: ${fps})...`);
        const segmentFiles = [];

        const [width, height] = resolution.split('x').map(Number);

        // 1. Process each scene into a temporary video segment
        for (let i = 0; i < scenes.length; i++) {
            const scene = scenes[i];
            const duration = scene.duration || 5; // seconds
            const mediaPath = scene.video || scene.image;
            const isVideoInput = /\.(mp4|webm|mov|mkv|avi)$/i.test(mediaPath);
            const rawSegmentPath = path.join(tempDir, `raw_segment_${i}.mp4`);
            const finalSegmentPath = path.join(tempDir, `segment_${i}.mp4`);

            const scriptText = scene.script || scene.narration || '';

            console.log(`  [Scene ${i + 1}/${scenes.length}] Duration: ${duration}s | ${isVideoInput ? 'Video' : 'Image'} | Script: "${scriptText || 'ไม่มีสคริปต์เสียง'}"`);

            // Generate Voiceover audio if script is provided
            let voiceAudioPath = null;
            if (scriptText) {
                const voiceFile = path.join(tempDir, `voice_${i}.mp3`);
                voiceAudioPath = await generateSpeechAudio(scriptText, voiceFile, scene.lang || defaultLang);
            }

            // Escape special text characters for FFmpeg
            const titleText = (scene.title || '').replace(/'/g, "'\\''").replace(/:/g, '\\:');
            const subText = (scene.subtitle || '').replace(/'/g, "'\\''").replace(/:/g, '\\:');

            const isCartoon = config.cartoonStyle !== false || scene.cartoonStyle === true;
            const isFairSkin = config.fairSkin !== false || scene.fairSkin === true;

            let vfFilters = [
                `scale=${width}:${height}:force_original_aspect_ratio=increase`,
                `crop=${width}:${height}`
            ];

            if (isFairSkin) {
                // Apply Skin Brightening, Radiance Glow & Porcelain Enhancement Filter
                vfFilters.push(`eq=brightness=0.07:contrast=1.12:saturation=1.08`, `colorbalance=rs=0.02:gs=0.02:bs=0.04`);
            } else if (isCartoon) {
                vfFilters.push(`eq=saturation=1.55:contrast=1.18:brightness=0.02`);
            }

            vfFilters.push(`format=yuv420p`);

            const renderText = (config.showText !== false) && (scene.showText !== false);

            if (renderText && titleText) {
                vfFilters.push(
                    `drawtext=text='${titleText}':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=(h-text_h)/2-40:shadowcolor=black@0.8:shadowx=3:shadowy=3`
                );
            }
            if (renderText && subText) {
                vfFilters.push(
                    `drawtext=text='${subText}':fontcolor=yellow:fontsize=30:x=(w-text_w)/2:y=(h-text_h)/2+40:shadowcolor=black@0.8:shadowx=2:shadowy=2`
                );
            }

            const vfString = vfFilters.join(',');

            let inputArgs = [];
            if (isVideoInput) {
                inputArgs = ['-stream_loop', '-1', '-i', `"${mediaPath}"`];
            } else {
                inputArgs = ['-loop', '1', '-i', `"${mediaPath}"`];
            }

            // Create silent video segment or with audio track
            if (voiceAudioPath && fs.existsSync(voiceAudioPath)) {
                const cmdArgs = [
                    '-y',
                    ...inputArgs,
                    '-i', `"${voiceAudioPath}"`,
                    '-t', `${duration}`,
                    '-vf', `"${vfString}"`,
                    '-r', `${fps}`,
                    '-c:v', 'libx264',
                    '-c:a', 'aac',
                    '-shortest',
                    '-pix_fmt', 'yuv420p',
                    `"${finalSegmentPath}"`
                ];
                const fullCmd = `"${ffmpegPath}" ${cmdArgs.join(' ')}`;
                execSync(fullCmd, { stdio: 'ignore' });
            } else {
                const cmdArgs = [
                    '-y',
                    ...inputArgs,
                    '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo',
                    '-t', `${duration}`,
                    '-vf', `"${vfString}"`,
                    '-r', `${fps}`,
                    '-c:v', 'libx264',
                    '-c:a', 'aac',
                    '-shortest',
                    '-pix_fmt', 'yuv420p',
                    `"${finalSegmentPath}"`
                ];
                const fullCmd = `"${ffmpegPath}" ${cmdArgs.join(' ')}`;
                execSync(fullCmd, { stdio: 'ignore' });
            }

            segmentFiles.push(finalSegmentPath);
        }

        // 2. Concatenate all segments into final video
        console.log('\n🔗 Concatenating video segments...');
        const concatListPath = path.join(tempDir, 'concat_list.txt');
        const listContent = segmentFiles.map(f => `file '${f.replace(/\\/g, '/')}'`).join('\n');
        fs.writeFileSync(concatListPath, listContent);

        const concatCmd = [
            '-y',
            '-f', 'concat',
            '-safe', '0',
            '-i', `"${concatListPath}"`,
            ...(audioFile && fs.existsSync(audioFile) ? ['-i', `"${audioFile}"`, '-c:a', 'aac', '-shortest'] : []),
            '-c:v', 'copy',
            `"${outputFile}"`
        ];

        const fullConcatCmd = `"${ffmpegPath}" ${concatCmd.join(' ')}`;
        execSync(fullConcatCmd, { stdio: 'inherit' });

        console.log(`\n🎉 Success! Video created successfully: ${path.resolve(outputFile)}`);
        return outputFile;

    } catch (err) {
        console.error('❌ Error during video generation:', err);
        throw err;
    } finally {
        try {
            if (fs.existsSync(tempDir)) {
                fs.rmSync(tempDir, { recursive: true, force: true });
            }
        } catch (e) {
            // Ignore cleanup error
        }
    }
}

// CLI Execution Entry Point
if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.length > 0 && fs.existsSync(args[0])) {
        // User provided custom JSON config file path!
        const configPath = path.resolve(args[0]);
        console.log(`📂 Loading custom video configuration from: ${configPath}`);
        const customConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        generateVideo(customConfig);
    } else {
        // Default Demo Scenes with Spoken Narration Script
        const demoScenes = [
            {
                image: path.join(__dirname, 'assets', 'scene1.jpg'),
                duration: 5,
                title: 'WELCOME TO CYBER CITY',
                subtitle: 'ระบบสร้างวิดีโอพร้อมเสียงพากย์อัตโนมัติ',
                script: 'ยินดีต้อนรับสู่เมืองไซเบอร์อนาคต ระบบนี้สามารถสร้างวิดีโอพร้อมเสียงพากย์ภาษาไทยได้ทันทีครับ'
            },
            {
                image: path.join(__dirname, 'assets', 'scene2.jpg'),
                duration: 5,
                title: 'MYSTICAL ENCHANTED FOREST',
                subtitle: 'AI Image & Motion Graphics Rendering',
                script: 'สัมผัสความสวยงามของป่าเวทมนตร์และเอฟเฟกต์การเคลื่อนไหวที่นุ่มนวล'
            },
            {
                image: path.join(__dirname, 'assets', 'scene3.jpg'),
                duration: 5,
                title: 'EXPLORE THE COSMIC GALAXY',
                subtitle: 'High Definition 1080p Video Production',
                script: 'ท่องอวกาศอันกว้างใหญ่พร้อมการบันทึกวิดีโอคุณภาพสูงระดับ 1080p'
            }
        ];

        const outputPath = path.join(__dirname, 'output_demo.mp4');
        generateVideo({
            scenes: demoScenes,
            outputFile: outputPath,
            fps: 30,
            resolution: '1920x1080'
        });
    }
}

module.exports = { generateVideo };
