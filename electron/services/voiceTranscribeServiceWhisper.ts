/**
 * 基于 whisper.cpp 的语音转文字服务（支持 GPU 加速）
 * 使用 node-whisper 包装 whisper.cpp
 */
import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, createWriteStream, statSync, unlinkSync, writeFileSync } from 'fs'
import { spawn, ChildProcess } from 'child_process'
import * as https from 'https'
import * as http from 'http'

interface ModelConfig {
    name: string
    filename: string
    size: number
    sizeLabel: string
    quality: string
}

const MODELS: Record<string, ModelConfig> = {
    tiny: {
        name: 'tiny',
        filename: 'ggml-tiny.bin',
        size: 75_000_000,
        sizeLabel: '75 MB',
        quality: '一般'
    },
    base: {
        name: 'base',
        filename: 'ggml-base.bin',
        size: 145_000_000,
        sizeLabel: '145 MB',
        quality: '良好'
    },
    small: {
        name: 'small',
        filename: 'ggml-small.bin',
        size: 488_000_000,
        sizeLabel: '488 MB',
        quality: '优秀'
    },
    medium: {
        name: 'medium',
        filename: 'ggml-medium.bin',
        size: 1_500_000_000,
        sizeLabel: '1.5 GB',
        quality: '很好'
    }
}

export class VoiceTranscribeServiceWhisper {
    private modelsDir: string
    private whisperExe: string
    private useGPU: boolean = false

    constructor() {
        this.modelsDir = join(app.getPath('appData'), 'ciphertalk', 'whisper-models')
        
        // whisper.cpp 的可执行文件路径
        // 生产环境：app.asar.unpacked/resources/whisper/main.exe
        // 开发环境：项目根目录/resources/whisper/main.exe
        this.whisperExe = join(process.resourcesPath, 'resources', 'whisper', 'main.exe')
        
        // 开发模式回退
        if (!existsSync(this.whisperExe)) {
            this.whisperExe = join(__dirname, '..', '..', 'resources', 'whisper', 'main.exe')
        }
        
        if (!existsSync(this.modelsDir)) {
            mkdirSync(this.modelsDir, { recursive: true })
        }
    }

    /**
     * 检测 GPU 支持
     */
    async detectGPU(): Promise<{
        available: boolean
        provider: string
        info: string
    }> {
        try {
            // 检测 NVIDIA GPU
            const { execSync } = require('child_process')
            try {
                const output = execSync('nvidia-smi --query-gpu=name --format=csv,noheader', {
                    encoding: 'utf-8',
                    timeout: 2000
                })
                if (output.trim()) {
                    this.useGPU = true
                    return {
                        available: true,
                        provider: 'CUDA',
                        info: `检测到 GPU: ${output.trim()}`
                    }
                }
            } catch {}

            return {
                available: false,
                provider: 'CPU',
                info: 'GPU 不可用，将使用 CPU'
            }
        } catch (error) {
            return {
                available: false,
                provider: 'CPU',
                info: 'GPU 检测失败，使用 CPU'
            }
        }
    }

    /**
     * 检查模型状态
     */
    async getModelStatus(modelType: keyof typeof MODELS = 'small'): Promise<{
        exists: boolean
        modelPath?: string
        sizeBytes?: number
    }> {
        const config = MODELS[modelType]
        const modelPath = join(this.modelsDir, config.filename)

        if (!existsSync(modelPath)) {
            return { exists: false }
        }

        const stats = statSync(modelPath)
        return {
            exists: true,
            modelPath,
            sizeBytes: stats.size
        }
    }

    /**
     * 语音转文字
     */
    async transcribeWavBuffer(
        wavData: Buffer,
        modelType: keyof typeof MODELS = 'small',
        language: string = 'zh'
    ): Promise<{ success: boolean; transcript?: string; error?: string }> {
        const config = MODELS[modelType]
        const modelPath = join(this.modelsDir, config.filename)

        if (!existsSync(modelPath)) {
            return { success: false, error: '模型文件不存在，请先下载模型' }
        }

        if (!existsSync(this.whisperExe)) {
            return { 
                success: false, 
                error: `Whisper 可执行文件不存在: ${this.whisperExe}\n请运行: node scripts/setup-whisper-gpu.js` 
            }
        }

        try {
            // 保存临时 WAV 文件
            const tempWavPath = join(app.getPath('temp'), `whisper_${Date.now()}.wav`)
            writeFileSync(tempWavPath, wavData)

            // 构建命令参数
            const args = [
                '-m', modelPath,
                '-f', tempWavPath,
                '-l', language,
                '-t', '4', // 线程数
                '--no-timestamps', // 不输出时间戳
                '--output-txt' // 输出文本
            ]

            // 如果支持 GPU，添加 GPU 参数
            if (this.useGPU) {
                args.push('-ng') // 使用 GPU
            }

            console.log('[Whisper] 开始识别...')
            console.log('[Whisper] 模型:', modelType)
            console.log('[Whisper] 语言:', language)
            console.log('[Whisper] GPU:', this.useGPU ? '启用' : '禁用')

            // 执行 whisper
            const result = await this.runWhisper(args)

            // 清理临时文件
            try {
                unlinkSync(tempWavPath)
                const txtPath = tempWavPath + '.txt'
                if (existsSync(txtPath)) {
                    unlinkSync(txtPath)
                }
            } catch (e) {
                console.warn('[Whisper] 清理临时文件失败:', e)
            }

            if (result.success) {
                console.log('[Whisper] 识别成功')
                return { success: true, transcript: result.text }
            } else {
                console.error('[Whisper] 识别失败:', result.error)
                return { success: false, error: result.error }
            }
        } catch (error) {
            console.error('[Whisper] 异常:', error)
            return { success: false, error: String(error) }
        }
    }

    /**
     * 运行 whisper 命令
     */
    private runWhisper(args: string[]): Promise<{ success: boolean; text?: string; error?: string }> {
        return new Promise((resolve) => {
            const process = spawn(this.whisperExe, args, {
                windowsHide: true
            })

            let stdout = ''
            let stderr = ''

            process.stdout?.on('data', (data) => {
                stdout += data.toString()
            })

            process.stderr?.on('data', (data) => {
                stderr += data.toString()
            })

            process.on('close', (code) => {
                if (code === 0) {
                    // 从输出中提取文本
                    const text = this.extractText(stdout)
                    resolve({ success: true, text })
                } else {
                    resolve({ success: false, error: stderr || '识别失败' })
                }
            })

            process.on('error', (error) => {
                resolve({ success: false, error: String(error) })
            })
        })
    }

    /**
     * 从输出中提取文本
     */
    private extractText(output: string): string {
        // whisper.cpp 的输出格式：[时间戳] 文本
        const lines = output.split('\n')
        const textLines: string[] = []

        for (const line of lines) {
            // 匹配 [00:00:00.000 --> 00:00:05.000] 文本
            const match = line.match(/\[[\d:.]+\s+-->\s+[\d:.]+\]\s+(.+)/)
            if (match) {
                textLines.push(match[1].trim())
            }
        }

        return textLines.join(' ').trim()
    }

    /**
     * 下载模型
     */
    async downloadModel(
        modelType: keyof typeof MODELS,
        onProgress?: (progress: { downloadedBytes: number; totalBytes?: number; percent?: number }) => void
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const config = MODELS[modelType]
            const modelPath = join(this.modelsDir, config.filename)

            // 从 Hugging Face 下载
            const url = `https://huggingface.co/ggerganov/whisper.cpp/resolve/main/${config.filename}`

            await this.downloadFile(url, modelPath, (downloaded, total) => {
                const percent = total ? (downloaded / total) * 100 : undefined
                onProgress?.({
                    downloadedBytes: downloaded,
                    totalBytes: config.size,
                    percent
                })
            })

            return { success: true }
        } catch (error) {
            console.error('[Whisper] 下载失败:', error)
            return { success: false, error: String(error) }
        }
    }

    /**
     * 下载文件
     */
    private downloadFile(
        url: string,
        targetPath: string,
        onProgress?: (downloaded: number, total?: number) => void,
        remainingRedirects = 5
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            const protocol = url.startsWith('https') ? https : http

            const request = protocol.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0'
                }
            }, (response) => {
                // 处理重定向
                if ([301, 302, 303, 307, 308].includes(response.statusCode || 0) && response.headers.location) {
                    if (remainingRedirects <= 0) {
                        reject(new Error('重定向次数过多'))
                        return
                    }

                    this.downloadFile(response.headers.location, targetPath, onProgress, remainingRedirects - 1)
                        .then(resolve)
                        .catch(reject)
                    return
                }

                if (response.statusCode !== 200) {
                    reject(new Error(`下载失败: HTTP ${response.statusCode}`))
                    return
                }

                const totalBytes = Number(response.headers['content-length'] || 0) || undefined
                let downloadedBytes = 0

                const writer = createWriteStream(targetPath)

                response.on('data', (chunk) => {
                    downloadedBytes += chunk.length
                    onProgress?.(downloadedBytes, totalBytes)
                })

                response.on('error', reject)
                writer.on('error', reject)
                writer.on('finish', () => {
                    writer.close()
                    resolve()
                })

                response.pipe(writer)
            })

            request.on('error', reject)
        })
    }

    /**
     * 清理资源
     */
    dispose() {
        // 无需特殊清理
    }
}

export const voiceTranscribeServiceWhisper = new VoiceTranscribeServiceWhisper()
